import JSZip from "jszip";
import { frameSize, Rect, roundRect } from "./sprite-extract.model";

export type Anchor =
  | "center"
  | "top-left"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "bottom-left"
  | "bottom-right"
  | "top-right";

export const ANCHORS: { value: Anchor; label: string }[] = [
  { value: "center", label: "Center" },
  { value: "bottom", label: "Bottom" },
  { value: "top", label: "Top" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-right", label: "Bottom right" },
];

/** Offset of `frame` inside a cell of `cell` size for the given anchor. */
export function anchorOffset(frame: { w: number; h: number }, cell: { w: number; h: number }, anchor: Anchor) {
  const dx = cell.w - frame.w;
  const dy = cell.h - frame.h;
  const x = anchor.includes("left") ? 0 : anchor.includes("right") ? dx : dx / 2;
  const y = anchor.includes("top") ? 0 : anchor.includes("bottom") ? dy : dy / 2;
  return { x: Math.round(x), y: Math.round(y) };
}

export interface ExportOptions {
  filename: string;
  /** Pad every frame to the same (max) size. */
  uniform: boolean;
  anchor: Anchor;
  /** Columns for the repacked sheet. */
  sheetColumns: number;
  fps: number;
}

function baseName(filename: string) {
  return filename.replace(/\.[^.]+$/, "") || "sprite";
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode PNG."))), "image/png");
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  frame: Rect,
  dest: { x: number; y: number; w: number; h: number },
  anchor: Anchor
) {
  const src = roundRect(frame);
  const offset = anchorOffset(src, dest, anchor);
  ctx.drawImage(image, src.x, src.y, src.w, src.h, dest.x + offset.x, dest.y + offset.y, src.w, src.h);
}

function metadata(frames: Rect[], sequence: number[], cell: { w: number; h: number } | null, options: ExportOptions) {
  return {
    source: options.filename,
    fps: options.fps,
    anchor: options.anchor,
    frameSize: cell,
    frames: sequence.map((index, order) => ({
      order,
      index,
      source: roundRect(frames[index]),
    })),
  };
}

export async function exportFramesZip(
  image: CanvasImageSource,
  frames: Rect[],
  sequence: number[],
  options: ExportOptions,
  onProgress?: (fraction: number) => void
) {
  const zip = new JSZip();
  const name = baseName(options.filename);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const cell = options.uniform ? frameSize(frames, sequence) : null;
  const digits = Math.max(2, String(sequence.length - 1).length);

  for (let i = 0; i < sequence.length; i++) {
    const frame = roundRect(frames[sequence[i]]);
    const size = cell ?? { w: frame.w, h: frame.h };
    canvas.width = Math.max(1, size.w);
    canvas.height = Math.max(1, size.h);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawFrame(ctx, image, frame, { x: 0, y: 0, w: canvas.width, h: canvas.height }, options.anchor);

    zip.file(`${name}_${String(i).padStart(digits, "0")}.png`, await canvasToBlob(canvas));
    onProgress?.((i + 1) / (sequence.length + 1));
  }

  zip.file(`${name}.json`, JSON.stringify(metadata(frames, sequence, cell, options), null, 2));

  const blob = await zip.generateAsync({ type: "blob" }, ({ percent }) => {
    onProgress?.(sequence.length / (sequence.length + 1) + percent / 100 / (sequence.length + 1));
  });
  downloadBlob(blob, `${name}_frames.zip`);
}

export async function exportSheet(
  image: CanvasImageSource,
  frames: Rect[],
  sequence: number[],
  options: ExportOptions
) {
  const name = baseName(options.filename);
  const cell = frameSize(frames, sequence);
  const columns = Math.max(1, Math.min(options.sheetColumns || sequence.length, sequence.length));
  const rows = Math.ceil(sequence.length / columns);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, cell.w * columns);
  canvas.height = Math.max(1, cell.h * rows);
  const ctx = canvas.getContext("2d")!;

  sequence.forEach((index, i) => {
    const c = i % columns;
    const r = Math.floor(i / columns);
    drawFrame(ctx, image, frames[index], { x: c * cell.w, y: r * cell.h, w: cell.w, h: cell.h }, options.anchor);
  });

  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, `${name}_sheet.png`);

  const meta = {
    ...metadata(frames, sequence, cell, options),
    sheet: { columns, rows, width: canvas.width, height: canvas.height },
  };
  downloadBlob(new Blob([JSON.stringify(meta, null, 2)], { type: "application/json" }), `${name}_sheet.json`);
}
