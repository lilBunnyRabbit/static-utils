import React from "react";
import { GifPlayerWorker, isOffscreenCanvasSupported, ParsedGif } from "./gif-player.service";

export interface WarmupProgress {
  done: number;
  total: number;
}

export interface GifMedia {
  kind: "gif";
  parsed: ParsedGif;
}

export interface VideoMedia {
  kind: "video";
  width: number;
  height: number;
  duration: number;
  fps: number;
  totalFrames: number;
  url: string;
}

export type Media = GifMedia | VideoMedia;

export interface UseMediaPlayerResult {
  setCanvas: (el: HTMLCanvasElement | null) => void;
  setVideo: (el: HTMLVideoElement | null) => void;
  media: Media | null;
  filename: string | null;
  currentIndex: number;
  totalFrames: number;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  speed: number;
  warmup: WarmupProgress | null;
  loadId: number;
  width: number;
  height: number;
  currentTimeMs: number;
  totalTimeMs: number;
  currentDelayMs: number;
  setSpeed: (speed: number) => void;
  load: (file: File) => Promise<void>;
  clear: () => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seek: (index: number) => void;
  jumpToStart: () => void;
  jumpToEnd: () => void;
}

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  return /\.(mp4|webm|mov|m4v|mkv|ogv|avi)$/i.test(file.name);
}

export function isGifFile(file: File): boolean {
  return file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");
}

async function loadVideoMeta(file: File): Promise<VideoMedia> {
  const url = URL.createObjectURL(file);
  return new Promise<VideoMedia>((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    const onLoaded = () => {
      cleanup();
      const duration = isFinite(video.duration) ? video.duration : 0;
      const fps = 30;
      resolve({
        kind: "video",
        width: video.videoWidth,
        height: video.videoHeight,
        duration,
        fps,
        totalFrames: Math.max(1, Math.round(duration * fps)),
        url,
      });
    };
    const onErr = () => {
      cleanup();
      URL.revokeObjectURL(url);
      reject(new Error("Failed to read video metadata"));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onErr);
    };

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("error", onErr);
    video.src = url;
  });
}

export function useMediaPlayer(): UseMediaPlayerResult {
  const [media, setMedia] = React.useState<Media | null>(null);
  const [filename, setFilename] = React.useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [warmup, setWarmup] = React.useState<WarmupProgress | null>(null);
  const [loadId, setLoadId] = React.useState(0);

  const workerRef = React.useRef<GifPlayerWorker | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const totalFramesRef = React.useRef(0);
  const timeoutRef = React.useRef<number | null>(null);
  const videoFrameLoopRef = React.useRef<number | null>(null);
  const lastVideoUrlRef = React.useRef<string | null>(null);
  const canvasAttachedForLoadRef = React.useRef<number>(-1);
  const seekingFromUiRef = React.useRef(false);

  React.useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      if (lastVideoUrlRef.current) {
        URL.revokeObjectURL(lastVideoUrlRef.current);
        lastVideoUrlRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (!media || media.kind !== "gif") return;
    workerRef.current?.draw(currentIndex);
  }, [currentIndex, media]);

  React.useEffect(() => {
    if (!media || media.kind !== "video" || !videoRef.current) return;
    if (!seekingFromUiRef.current) return;
    seekingFromUiRef.current = false;
    const targetTime = currentIndex / media.fps;
    if (Math.abs(videoRef.current.currentTime - targetTime) > 1 / (media.fps * 2)) {
      videoRef.current.currentTime = targetTime;
    }
  }, [currentIndex, media]);

  React.useEffect(() => {
    if (!media || media.kind !== "video" || !videoRef.current) return;
    const video = videoRef.current;

    if (!isPlaying) {
      video.pause();
      if (videoFrameLoopRef.current !== null) {
        cancelAnimationFrame(videoFrameLoopRef.current);
        videoFrameLoopRef.current = null;
      }
      return;
    }

    video.playbackRate = Math.max(0.05, speed);
    video.play().catch((e) => console.warn("[media-player] video play failed", e));

    const tick = () => {
      const v = videoRef.current;
      if (!v) return;
      const idx = Math.min(media.totalFrames - 1, Math.floor(v.currentTime * media.fps));
      setCurrentIndex((prev) => (idx !== prev ? idx : prev));
      videoFrameLoopRef.current = requestAnimationFrame(tick);
    };
    videoFrameLoopRef.current = requestAnimationFrame(tick);

    return () => {
      if (videoFrameLoopRef.current !== null) {
        cancelAnimationFrame(videoFrameLoopRef.current);
        videoFrameLoopRef.current = null;
      }
    };
  }, [isPlaying, media, speed]);

  React.useEffect(() => {
    if (!media || media.kind !== "gif" || !isPlaying) return;
    const frame = media.parsed.frames[currentIndex];
    if (!frame) return;

    const delay = Math.max(20, frame.delay) / Math.max(0.05, speed);
    timeoutRef.current = window.setTimeout(() => {
      setCurrentIndex((i) => (i + 1) % media.parsed.frames.length);
    }, delay);

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isPlaying, media, currentIndex, speed]);

  const tryAttachCanvas = React.useCallback(() => {
    if (!media || media.kind !== "gif") return;
    const worker = workerRef.current;
    const canvas = canvasRef.current;
    if (!worker || !canvas) return;
    if (canvasAttachedForLoadRef.current === loadId) return;
    if (worker.attachCanvas(canvas)) {
      canvasAttachedForLoadRef.current = loadId;
      worker.draw(currentIndex);
      worker.warmup((done, total) => setWarmup({ done, total }));
    }
  }, [loadId, currentIndex, media]);

  React.useEffect(() => {
    if (!media || media.kind !== "gif") return;
    tryAttachCanvas();
  }, [media, tryAttachCanvas]);

  const setCanvas = React.useCallback(
    (el: HTMLCanvasElement | null) => {
      canvasRef.current = el;
      if (el) tryAttachCanvas();
    },
    [tryAttachCanvas]
  );

  const setVideo = React.useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (el && media?.kind === "video") {
        if (el.src !== media.url) el.src = media.url;
        el.muted = true;
        el.playsInline = true;
        el.playbackRate = Math.max(0.05, speed);
      }
    },
    [media, speed]
  );

  const load = React.useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setIsPlaying(false);
    setWarmup(null);

    workerRef.current?.terminate();
    workerRef.current = null;
    if (lastVideoUrlRef.current) {
      URL.revokeObjectURL(lastVideoUrlRef.current);
      lastVideoUrlRef.current = null;
    }
    setLoadId((v) => v + 1);
    canvasAttachedForLoadRef.current = -1;

    try {
      if (isVideoFile(file)) {
        const meta = await loadVideoMeta(file);
        lastVideoUrlRef.current = meta.url;
        totalFramesRef.current = meta.totalFrames;
        setMedia(meta);
        setCurrentIndex(0);
        setFilename(file.name);
        setIsPlaying(true);
      } else {
        if (!isOffscreenCanvasSupported()) {
          throw new Error("Your browser doesn't support OffscreenCanvas");
        }
        workerRef.current = new GifPlayerWorker();
        const meta = await workerRef.current.parse(file);
        totalFramesRef.current = meta.frames.length;
        setMedia({ kind: "gif", parsed: meta });
        setCurrentIndex(0);
        setFilename(file.name);
        setIsPlaying(true);
      }
    } catch (e) {
      console.error("[media-player] load failed", e);
      const baseMessage = e instanceof Error ? e.message : "Failed to load media";
      const looksLikeImage = file.type.startsWith("image/") && file.type !== "image/gif";
      setError(
        looksLikeImage
          ? `Not a GIF (${file.type}). "Copy Image" usually converts to PNG and loses the animation — copy or upload the .gif file directly.`
          : baseMessage
      );
      workerRef.current?.terminate();
      workerRef.current = null;
      setMedia(null);
      setFilename(null);
      totalFramesRef.current = 0;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = React.useCallback(() => {
    setIsPlaying(false);
    workerRef.current?.terminate();
    workerRef.current = null;
    if (lastVideoUrlRef.current) {
      URL.revokeObjectURL(lastVideoUrlRef.current);
      lastVideoUrlRef.current = null;
    }
    setMedia(null);
    setFilename(null);
    setCurrentIndex(0);
    setError(null);
    setWarmup(null);
    setLoadId((v) => v + 1);
    canvasAttachedForLoadRef.current = -1;
    totalFramesRef.current = 0;
  }, []);

  const play = React.useCallback(() => setIsPlaying(true), []);
  const pause = React.useCallback(() => setIsPlaying(false), []);
  const togglePlay = React.useCallback(() => setIsPlaying((v) => !v), []);

  const next = React.useCallback(() => {
    setIsPlaying(false);
    seekingFromUiRef.current = true;
    setCurrentIndex((i) => {
      const total = totalFramesRef.current;
      if (!total) return 0;
      return (i + 1) % total;
    });
  }, []);

  const prev = React.useCallback(() => {
    setIsPlaying(false);
    seekingFromUiRef.current = true;
    setCurrentIndex((i) => {
      const total = totalFramesRef.current;
      if (!total) return 0;
      return (i - 1 + total) % total;
    });
  }, []);

  const seek = React.useCallback((index: number) => {
    setIsPlaying(false);
    seekingFromUiRef.current = true;
    setCurrentIndex(() => {
      const total = totalFramesRef.current;
      if (!total) return 0;
      return Math.max(0, Math.min(index, total - 1));
    });
  }, []);

  const jumpToStart = React.useCallback(() => {
    setIsPlaying(false);
    seekingFromUiRef.current = true;
    setCurrentIndex(0);
  }, []);

  const jumpToEnd = React.useCallback(() => {
    setIsPlaying(false);
    seekingFromUiRef.current = true;
    setCurrentIndex(() => Math.max(0, totalFramesRef.current - 1));
  }, []);

  const width = media ? (media.kind === "gif" ? media.parsed.width : media.width) : 0;
  const height = media ? (media.kind === "gif" ? media.parsed.height : media.height) : 0;
  const totalFrames = media ? (media.kind === "gif" ? media.parsed.frames.length : media.totalFrames) : 0;
  const totalTimeMs = media ? (media.kind === "gif" ? media.parsed.totalDuration : media.duration * 1000) : 0;

  let currentTimeMs = 0;
  let currentDelayMs = 0;
  if (media) {
    if (media.kind === "gif") {
      const f = media.parsed.frames[currentIndex];
      currentTimeMs = f?.cumulativeTime ?? 0;
      currentDelayMs = f?.delay ?? 0;
    } else {
      currentTimeMs = (currentIndex / media.fps) * 1000;
      currentDelayMs = 1000 / media.fps;
    }
  }

  return {
    setCanvas,
    setVideo,
    media,
    filename,
    currentIndex,
    totalFrames,
    isPlaying,
    isLoading,
    error,
    speed,
    warmup,
    loadId,
    width,
    height,
    currentTimeMs,
    totalTimeMs,
    currentDelayMs,
    setSpeed,
    load,
    clear,
    togglePlay,
    play,
    pause,
    next,
    prev,
    seek,
    jumpToStart,
    jumpToEnd,
  };
}

export const useGifPlayer = useMediaPlayer;
