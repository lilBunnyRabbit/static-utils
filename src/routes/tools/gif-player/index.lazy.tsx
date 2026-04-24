import { ErrorComponent } from "@/components/route/error-component";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useNavbar } from "@/context/navbar.context";
import { isGifFile, isVideoFile, useMediaPlayer } from "@/services/gif-player";
import { createLazyFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Trash2,
  Upload,
} from "lucide-react";
import React from "react";

export const Route = createLazyFileRoute("/tools/gif-player/")({
  component: GifPlayerRoute,
  errorComponent: ErrorComponent,
});

const SPEED_OPTIONS = [0.1, 0.25, 0.5, 1, 1.5, 2, 4];

function isMediaFile(file: File): boolean {
  return isGifFile(file) || isVideoFile(file) || file.type.startsWith("image/");
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function GifPlayerRoute(): React.ReactNode {
  const { showInfo } = useNavbar();
  const {
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
    next,
    prev,
    seek,
    jumpToStart,
    jumpToEnd,
  } = useMediaPlayer();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeDrag, setActiveDrag] = React.useState(false);
  const dropRef = React.useRef<HTMLDivElement>(null);

  const handleFiles = React.useCallback(
    (files: FileList | File[] | null | undefined) => {
      if (!files) return;
      const list = Array.from(files);
      const file = list.find(isMediaFile) ?? list[0];
      if (file) load(file);
    },
    [load]
  );

  React.useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    const onEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveDrag(true);
    };
    const onOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveDrag(true);
    };
    const onLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveDrag(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveDrag(false);
      handleFiles(e.dataTransfer?.files);
    };

    el.addEventListener("dragenter", onEnter);
    el.addEventListener("dragover", onOver);
    el.addEventListener("dragleave", onLeave);
    el.addEventListener("drop", onDrop);

    return () => {
      el.removeEventListener("dragenter", onEnter);
      el.removeEventListener("dragover", onOver);
      el.removeEventListener("dragleave", onLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, [handleFiles]);

  React.useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item?.kind === "file") {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) handleFiles(files);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [handleFiles]);

  React.useEffect(() => {
    if (!media) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
          e.preventDefault();
          prev();
          break;
        case "Home":
          e.preventDefault();
          jumpToStart();
          break;
        case "End":
          e.preventDefault();
          jumpToEnd();
          break;
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [media, togglePlay, next, prev, jumpToStart, jumpToEnd]);

  const isVideo = media?.kind === "video";

  return (
    <div
      ref={dropRef}
      className={clsx("grid grid-cols-[min-content,1fr] h-full w-full", activeDrag && "bg-primary-950")}
    >
      <div className="h-full w-64 rounded-xs border-r-2 border-foreground">
        <div className="p-4 flex flex-col gap-2 justify-between h-full">
          <div className="flex flex-col gap-2">
            <h3 className="mb-2">Input</h3>

            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept=".gif,image/gif,video/*,.mp4,.webm,.mov,.m4v,.mkv,.ogv,.avi"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />

            <Button className="!w-full gap-2" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} />
              Upload
            </Button>

            <p className="text-xs text-foreground/60 mt-1">
              GIF or video (mp4, webm, mov…). Drag & drop or paste also work.
            </p>

            {error && <div className="mt-2 p-2 border-2 border-red-500 text-red-500 text-sm break-words">{error}</div>}

            {media && (
              <>
                <h3 className="mt-4 mb-2">Playback</h3>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground/80 w-16">Speed</span>
                  <Select value={String(speed)} onValueChange={(v) => setSpeed(Number(v))}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Speed" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPEED_OPTIONS.map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          {s}×
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <h3 className="mt-4 mb-2">Info</h3>
                <div className="text-sm text-foreground/80 space-y-1">
                  {filename && (
                    <p className="break-all">
                      <span className="text-foreground/50">File:</span> {filename}
                    </p>
                  )}
                  <p>
                    <span className="text-foreground/50">Type:</span> {isVideo ? "Video" : "GIF"}
                  </p>
                  <p>
                    <span className="text-foreground/50">Size:</span> {width} × {height}
                  </p>
                  {isVideo ? (
                    <>
                      <p>
                        <span className="text-foreground/50">Duration:</span> {formatMs(totalTimeMs)}
                      </p>
                      <p>
                        <span className="text-foreground/50">Step:</span> ~{Math.round(currentDelayMs)}ms ({media!.fps}fps)
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        <span className="text-foreground/50">Frames:</span> {totalFrames}
                      </p>
                      <p>
                        <span className="text-foreground/50">Duration:</span> {formatMs(totalTimeMs)}
                      </p>
                      <p>
                        <span className="text-foreground/50">Frame delay:</span> {formatMs(currentDelayMs)}
                      </p>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {media && (
            <Button className="!w-full gap-2" variant="destructive" onClick={clear}>
              <Trash2 size={16} />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="relative w-full h-full grid grid-cols-1 grid-rows-[1fr,min-content] place-items-center overflow-hidden p-8 gap-4">
        {media ? (
          <>
            <div className="relative w-full h-full min-h-0 min-w-0 flex items-center justify-center overflow-hidden">
              {isVideo ? (
                <video
                  key={loadId}
                  ref={setVideo}
                  muted
                  playsInline
                  className="object-contain max-w-full max-h-full border-2 border-foreground"
                />
              ) : (
                <canvas
                  key={loadId}
                  ref={setCanvas}
                  width={width}
                  height={height}
                  className="object-contain max-w-full max-h-full border-2 border-foreground"
                  style={{ imageRendering: "pixelated" }}
                />
              )}
            </div>

            <div className="w-full flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm text-foreground/80 px-1">
                <span>
                  Frame {currentIndex + 1} / {totalFrames}
                </span>
                <span>
                  {formatMs(currentTimeMs)} / {formatMs(totalTimeMs)}
                </span>
              </div>

              {totalFrames > 1 && (
                <div className="relative">
                  <Slider
                    min={0}
                    max={totalFrames - 1}
                    step={1}
                    value={[currentIndex]}
                    onValueChange={(v) => {
                      if (typeof v[0] === "number") seek(v[0]);
                    }}
                    className="flex-1"
                  />
                  {warmup && warmup.done < warmup.total && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-primary-400/40 pointer-events-none rounded-full"
                      style={{ width: `${(warmup.done / warmup.total) * 100}%` }}
                      title={`Warming frames ${warmup.done}/${warmup.total}`}
                    />
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-2">
                <Button size="icon" onClick={jumpToStart} title="Jump to start (Home)">
                  <SkipBack size={16} />
                </Button>
                <Button size="icon" onClick={prev} title="Previous frame (←)">
                  <ChevronLeft size={20} />
                </Button>
                <Button
                  size="icon"
                  variant={isPlaying ? "inverted" : "default"}
                  onClick={togglePlay}
                  title="Play/Pause (Space)"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </Button>
                <Button size="icon" onClick={next} title="Next frame (→)">
                  <ChevronRight size={20} />
                </Button>
                <Button size="icon" onClick={jumpToEnd} title="Jump to end (End)">
                  <SkipForward size={16} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="row-span-2 w-full h-full flex items-center justify-center text-foreground/60">
            <div className="text-center">
              <p className="text-lg mb-2">No media loaded</p>
              <p className="text-sm">Upload, drag & drop, or paste a GIF or video to inspect frame-by-frame.</p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute top-0 right-0 bottom-0 left-0 bg-background flex items-center justify-center">
            <Loader2 size={32} className="animate-spin" />
          </div>
        )}

        {showInfo.value && (
          <div className="absolute top-0 right-0 bottom-0 left-0 bg-foreground text-background p-8 overflow-auto">
            <h1 className="text-2xl font-bold pb-1 mb-2 border-b-2 border-current">GIF & Video Player</h1>

            <p className="mt-2">
              Inspect a GIF or video frame-by-frame. Made for QA bug reports — load a recording and step through to see
              exactly what went wrong.
            </p>

            <p className="font-bold mt-4">How to load:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Click "Upload" to pick a GIF or video file.</li>
              <li>Drag & drop a file onto the page.</li>
              <li>Paste an image from clipboard (Ctrl/Cmd + V).</li>
            </ul>

            <p className="font-bold mt-4">Controls:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Drag the timeline to scrub to any frame.</li>
              <li>Use the buttons or keyboard for precise stepping.</li>
              <li>Adjust speed to slow down fast bugs.</li>
            </ul>

            <p className="font-bold mt-4">Keyboard shortcuts:</p>
            <ul className="list-disc list-inside mt-2">
              <li>
                <strong>Space</strong> — play / pause
              </li>
              <li>
                <strong>← / →</strong> — previous / next frame
              </li>
              <li>
                <strong>Home / End</strong> — jump to first / last frame
              </li>
            </ul>

            <p className="mt-4">
              For videos, "frame" means a 30 fps slice — exact frame count depends on the source. For GIFs, frame
              indices are exact.
            </p>

            <p className="mt-4">All processing happens in your browser — nothing is uploaded.</p>
          </div>
        )}
      </div>
    </div>
  );
}
