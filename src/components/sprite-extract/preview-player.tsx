import { Button } from "@/components/ui/button";
import { Anchor, anchorOffset, frameSize, Rect, roundRect } from "@/services/sprite-extract";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import React from "react";

export interface PreviewPlayerHandle {
  toggle: () => void;
  next: () => void;
  prev: () => void;
}

export interface PreviewPlayerProps {
  image: CanvasImageSource | undefined;
  frames: Rect[];
  sequence: number[];
  fps: number;
  anchor: Anchor;
  selected: number | null;
  className?: string;
  onSelect: (index: number) => void;
}

export const PreviewPlayer = React.forwardRef<PreviewPlayerHandle, PreviewPlayerProps>(function PreviewPlayer(
  { image, frames, sequence, fps, anchor, selected, className, onSelect },
  ref
) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = React.useState(true);
  const [step, setStep] = React.useState(0);
  const [followSelection, setFollowSelection] = React.useState(false);

  const cell = React.useMemo(() => frameSize(frames, sequence), [frames, sequence]);
  const length = sequence.length;
  const safeStep = length ? Math.min(step, length - 1) : 0;
  const frameIndex = length ? sequence[safeStep] : null;

  React.useEffect(() => {
    if (step >= length) setStep(0);
  }, [step, length]);

  React.useEffect(() => {
    if (!playing || length <= 1) return;
    const id = window.setTimeout(() => setStep((s) => (s + 1) % length), 1000 / Math.max(1, fps));
    return () => window.clearTimeout(id);
  }, [playing, step, length, fps]);

  // Jump to the selected frame when paused with "follow" on.
  React.useEffect(() => {
    if (!followSelection || playing || selected === null) return;
    const pos = sequence.indexOf(selected);
    if (pos >= 0) setStep(pos);
  }, [followSelection, playing, selected, sequence]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    canvas.width = Math.max(1, cell.w);
    canvas.height = Math.max(1, cell.h);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!image || frameIndex === null || !frames[frameIndex]) return;
    const src = roundRect(frames[frameIndex]);
    const offset = anchorOffset(src, cell, anchor);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, src.x, src.y, src.w, src.h, offset.x, offset.y, src.w, src.h);
  }, [image, frames, frameIndex, cell, anchor]);

  const toggle = React.useCallback(() => setPlaying((p) => !p), []);
  const next = React.useCallback(() => {
    setPlaying(false);
    setStep((s) => (length ? (s + 1) % length : 0));
  }, [length]);
  const prev = React.useCallback(() => {
    setPlaying(false);
    setStep((s) => (length ? (s - 1 + length) % length : 0));
  }, [length]);

  React.useImperativeHandle(ref, () => ({ toggle, next, prev }), [toggle, next, prev]);

  return (
    <div className={clsx("flex flex-col gap-2 min-h-0", className)}>
      <div
        className="relative flex-1 min-h-0 border-2 border-foreground flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
          backgroundColor: "#3a3a3a",
        }}
      >
        {length ? (
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full object-contain cursor-pointer"
            style={{ imageRendering: cell.w < 200 ? "pixelated" : "auto" }}
            title="Click to select this frame on the sheet"
            onClick={() => frameIndex !== null && onSelect(frameIndex)}
          />
        ) : (
          <span className="text-xs text-foreground/60">No frames in sequence</span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-foreground/80 font-hack">
        <span>
          {length ? `${safeStep + 1} / ${length}` : "0 / 0"}
          {frameIndex !== null && <span className="text-foreground/50"> · #{frameIndex}</span>}
        </span>
        <span className="text-foreground/50">
          {cell.w}×{cell.h}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button size="icon" className="h-8 w-8" onClick={prev} title="Previous frame ([)">
          <ChevronLeft size={16} />
        </Button>
        <Button
          size="icon"
          className="h-8 w-8"
          variant={playing ? "inverted" : "default"}
          onClick={toggle}
          title="Play / pause (P)"
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </Button>
        <Button size="icon" className="h-8 w-8" onClick={next} title="Next frame (])">
          <ChevronRight size={16} />
        </Button>
        <label className="ml-auto flex items-center gap-1 text-xs text-foreground/70 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={followSelection}
            onChange={(e) => setFollowSelection(e.target.checked)}
            className="accent-primary-400"
          />
          Follow selection
        </label>
      </div>
    </div>
  );
});
