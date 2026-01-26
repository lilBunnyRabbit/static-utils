import { ErrorComponent } from "@/components/route/error-component";
import { Button } from "@/components/ui/button";
import { useNavbar } from "@/context/navbar.context";
import { ImageFile, useImageFileClipboard, useImageFileDrop } from "@/helpers/image-file";
import { useQRReader } from "@/services/qr-reader";
import { createLazyFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import { Camera, CameraOff, Copy, ExternalLink, Trash2, Upload, X } from "lucide-react";
import React from "react";

function isUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const Route = createLazyFileRoute("/tools/qr-reader/")({
  component: QRReaderRoute,
  errorComponent: ErrorComponent,
});

function QRReaderRoute(): React.ReactNode {
  const { showInfo } = useNavbar();
  const {
    entries,
    isScanning,
    error,
    videoRef,
    canvasRef,
    removeEntry,
    clearAllEntries,
    decodeFromImage,
    startCamera,
    stopCamera,
  } = useQRReader();

  const [lastError, setLastError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageFile = React.useCallback(
    async (imageFile: ImageFile) => {
      setLastError(null);
      const content = await decodeFromImage(imageFile.image);
      if (!content) {
        setLastError("No QR code found in image");
      }
    },
    [decodeFromImage]
  );

  const [dropRef, { activeDrag }] = useImageFileDrop<HTMLDivElement>((images) => {
    if (images[0]) handleImageFile(images[0]);
  });

  useImageFileClipboard((images) => {
    if (images[0]) handleImageFile(images[0]);
  });

  const copyToClipboard = React.useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  return (
    <div ref={dropRef} className={clsx("grid grid-cols-[min-content,1fr] h-full w-full", activeDrag && "bg-primary-950")}>
      <div className="h-full w-64 rounded-xs border-r-2 border-foreground">
        <div className="p-4 flex flex-col gap-2 justify-between h-full">
          <div className="flex flex-col gap-2">
            <h3 className="mb-2">Input Sources</h3>

            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept="image/*"
              onChange={ImageFile.fromUpload((images) => {
                if (images[0]) handleImageFile(images[0]);
              })}
            />

            <Button className="!w-full gap-2" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} />
              Upload Image
            </Button>

            {isScanning ? (
              <Button className="!w-full gap-2" onClick={stopCamera}>
                <CameraOff size={16} />
                Stop Camera
              </Button>
            ) : (
              <Button className="!w-full gap-2" onClick={startCamera}>
                <Camera size={16} />
                Use Camera
              </Button>
            )}

            <p className="text-xs text-foreground/60 mt-2">
              You can also paste an image from clipboard or drag & drop an image file.
            </p>

            {(error || lastError) && (
              <div className="mt-2 p-2 border-2 border-red-500 text-red-500 text-sm">{error || lastError}</div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {entries.length > 0 && (
              <Button className="!w-full gap-2" variant="destructive" onClick={clearAllEntries}>
                <Trash2 size={16} />
                Clear All ({entries.length})
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="relative w-full h-full overflow-auto p-4">
        {isScanning && (
          <div className="mb-4 flex justify-center">
            <div className="relative border-2 border-primary-400">
              <video ref={videoRef} className="max-w-full max-h-64" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 border-4 border-primary-400 animate-pulse pointer-events-none" />
            </div>
          </div>
        )}

        {entries.length === 0 && !isScanning ? (
          <div className="h-full flex items-center justify-center text-foreground/60">
            <div className="text-center">
              <p className="text-lg mb-2">No QR codes scanned yet</p>
              <p className="text-sm">Upload an image, use camera, or paste from clipboard</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry) => {
              const contentIsUrl = isUrl(entry.content);
              return (
                <div key={entry.id} className="flex items-stretch gap-3 border-2 border-foreground">
                  <img
                    src={entry.imageDataUrl}
                    alt="QR Code"
                    className="h-full max-h-40 w-auto object-contain border-r border-foreground/30 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 py-2">
                    <p className="text-sm text-foreground/60 mb-1">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                    {contentIsUrl ? (
                      <a
                        href={entry.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm break-all text-primary-400 hover:text-primary-300 underline inline-flex items-center gap-1"
                      >
                        {entry.content}
                        <ExternalLink size={14} className="flex-shrink-0" />
                      </a>
                    ) : (
                      <p className="font-mono text-sm break-all">{entry.content}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 py-2 pr-2">
                    {contentIsUrl && (
                      <Button size="icon" variant="ghost" asChild title="Open link">
                        <a href={entry.content} target="_blank" rel="noopener noreferrer">
                          <ExternalLink size={16} />
                        </a>
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(entry.content)} title="Copy content">
                      <Copy size={16} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => removeEntry(entry.id)} title="Remove">
                      <X size={16} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showInfo.value && (
          <div className="absolute top-0 right-0 bottom-0 left-0 bg-foreground text-background p-8 overflow-auto">
            <h1 className="text-2xl font-bold pb-1 mb-2 border-b-2 border-current">QR Reader</h1>

            <p className="mt-2">
              This tool allows you to scan and decode QR codes from various sources. All scanned QR codes are stored
              locally in your browser for easy access.
            </p>

            <p className="font-bold mt-4">Ways to scan QR codes:</p>
            <ul className="list-disc list-inside mt-2">
              <li>
                <strong>Upload Image:</strong> Click the "Upload Image" button to select an image file containing a QR
                code.
              </li>
              <li>
                <strong>Camera:</strong> Click "Use Camera" to scan QR codes in real-time using your device's camera.
              </li>
              <li>
                <strong>Paste:</strong> Copy an image containing a QR code and paste it (Ctrl+V / Cmd+V).
              </li>
              <li>
                <strong>Drag & Drop:</strong> Drag and drop an image file directly onto the page.
              </li>
            </ul>

            <p className="font-bold mt-4">Features:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Scanned QR codes are displayed with a thumbnail and decoded content.</li>
              <li>Click the copy icon to copy the content to clipboard.</li>
              <li>Remove individual entries or clear all at once.</li>
              <li>All data is stored in your browser's local storage.</li>
            </ul>

            <p className="mt-4">
              This tool works entirely in your browser - no data is sent to any server.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
