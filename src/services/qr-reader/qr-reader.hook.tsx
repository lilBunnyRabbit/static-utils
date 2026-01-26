import React from "react";
import { QRCodeEntry, QRReaderService } from "./qr-reader.service";

export function useQRReader() {
  const { current: service } = React.useRef<QRReaderService>(new QRReaderService());
  const [entries, setEntries] = React.useState<QRCodeEntry[]>([]);
  const [isScanning, setIsScanning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const animationRef = React.useRef<number | null>(null);

  // Load entries on mount
  React.useEffect(() => {
    setEntries(service.loadEntries());
  }, [service]);

  const addEntry = React.useCallback(
    (content: string, imageDataUrl: string) => {
      const entry = service.addEntry(content, imageDataUrl);
      setEntries(service.loadEntries());
      return entry;
    },
    [service]
  );

  const removeEntry = React.useCallback(
    (id: string) => {
      service.removeEntry(id);
      setEntries(service.loadEntries());
    },
    [service]
  );

  const clearAllEntries = React.useCallback(() => {
    service.clearAllEntries();
    setEntries([]);
  }, [service]);

  const decodeFromImage = React.useCallback(
    async (image: HTMLImageElement): Promise<string | null> => {
      setError(null);
      const content = await service.decodeFromImage(image);
      if (content) {
        const imageDataUrl = service.imageToDataUrl(image);
        addEntry(content, imageDataUrl);
      }
      return content;
    },
    [service, addEntry]
  );

  const stopCamera = React.useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  const startCamera = React.useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);

        const scan = () => {
          if (!videoRef.current || !canvasRef.current || !streamRef.current) return;

          const content = service.decodeFromVideo(videoRef.current, canvasRef.current);
          if (content) {
            const imageDataUrl = service.videoFrameToDataUrl(videoRef.current);
            addEntry(content, imageDataUrl);
            stopCamera();
            return;
          }

          animationRef.current = requestAnimationFrame(scan);
        };

        animationRef.current = requestAnimationFrame(scan);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to access camera");
      setIsScanning(false);
    }
  }, [service, addEntry, stopCamera]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    service,
    entries,
    isScanning,
    error,
    videoRef,
    canvasRef,
    addEntry,
    removeEntry,
    clearAllEntries,
    decodeFromImage,
    startCamera,
    stopCamera,
  };
}
