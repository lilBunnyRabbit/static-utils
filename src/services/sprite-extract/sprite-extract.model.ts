export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Range {
  start: number;
  end: number;
}

export type GridMode = "grid" | "size";

export interface SpriteExtractSettings {
  mode: GridMode;
  /** Used when `mode === "grid"`. */
  columns: number;
  rows: number;
  /** Used when `mode === "size"`. */
  frameWidth: number;
  frameHeight: number;
  padding: { top: number; right: number; bottom: number; left: number };
  spacing: { x: number; y: number };
}

export interface RangeOverride {
  start?: number;
  end?: number;
}

export interface SpriteExtractOverrides {
  columns: Record<number, RangeOverride>;
  rows: Record<number, RangeOverride>;
  frames: Record<number, Rect>;
}

export interface SpriteGrid {
  columns: Range[];
  rows: Range[];
  /** Row-major, index = r * columns.length + c. */
  frames: Rect[];
  /** Outer content rect (image minus padding). */
  bounds: Rect;
}

export const DEFAULT_SETTINGS: SpriteExtractSettings = {
  mode: "grid",
  columns: 8,
  rows: 8,
  frameWidth: 128,
  frameHeight: 128,
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
  spacing: { x: 0, y: 0 },
};

export const EMPTY_OVERRIDES: SpriteExtractOverrides = { columns: {}, rows: {}, frames: {} };

function num(v: number, fallback = 0): number {
  return Number.isFinite(v) ? v : fallback;
}

function distribute(start: number, total: number, count: number, spacing: number): Range[] {
  if (count <= 0) return [];
  const size = (total - spacing * (count - 1)) / count;
  const ranges: Range[] = [];
  for (let i = 0; i < count; i++) {
    const s = start + i * (size + spacing);
    ranges.push({ start: s, end: s + size });
  }
  return ranges;
}

function tile(start: number, total: number, size: number, spacing: number): Range[] {
  if (size <= 0) return [];
  const count = Math.max(0, Math.floor((total + spacing) / (size + spacing)));
  const ranges: Range[] = [];
  for (let i = 0; i < count; i++) {
    const s = start + i * (size + spacing);
    ranges.push({ start: s, end: s + size });
  }
  return ranges;
}

export function computeBaseGrid(imageWidth: number, imageHeight: number, settings: SpriteExtractSettings) {
  const pad = {
    top: num(settings.padding.top),
    right: num(settings.padding.right),
    bottom: num(settings.padding.bottom),
    left: num(settings.padding.left),
  };
  const sp = { x: Math.max(0, num(settings.spacing.x)), y: Math.max(0, num(settings.spacing.y)) };

  const bounds: Rect = {
    x: pad.left,
    y: pad.top,
    w: Math.max(0, imageWidth - pad.left - pad.right),
    h: Math.max(0, imageHeight - pad.top - pad.bottom),
  };

  let columns: Range[];
  let rows: Range[];

  if (settings.mode === "grid") {
    columns = distribute(bounds.x, bounds.w, Math.max(0, Math.floor(num(settings.columns))), sp.x);
    rows = distribute(bounds.y, bounds.h, Math.max(0, Math.floor(num(settings.rows))), sp.y);
  } else {
    columns = tile(bounds.x, bounds.w, num(settings.frameWidth), sp.x);
    rows = tile(bounds.y, bounds.h, num(settings.frameHeight), sp.y);
  }

  return { columns, rows, bounds };
}

export function computeGrid(
  imageWidth: number,
  imageHeight: number,
  settings: SpriteExtractSettings,
  overrides: SpriteExtractOverrides = EMPTY_OVERRIDES
): SpriteGrid {
  const base = computeBaseGrid(imageWidth, imageHeight, settings);

  const columns = base.columns.map((range, i) => ({ ...range, ...overrides.columns[i] }));
  const rows = base.rows.map((range, i) => ({ ...range, ...overrides.rows[i] }));

  const frames: Rect[] = [];
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < columns.length; c++) {
      const index = r * columns.length + c;
      const override = overrides.frames[index];
      if (override) {
        frames.push({ ...override });
      } else {
        frames.push({
          x: columns[c].start,
          y: rows[r].start,
          w: columns[c].end - columns[c].start,
          h: rows[r].end - rows[r].start,
        });
      }
    }
  }

  return { columns, rows, frames, bounds: base.bounds };
}

export function roundRect(rect: Rect): Rect {
  const x = Math.round(rect.x);
  const y = Math.round(rect.y);
  return { x, y, w: Math.round(rect.x + rect.w) - x, h: Math.round(rect.y + rect.h) - y };
}

export function clampRectToImage(rect: Rect, width: number, height: number): Rect {
  const x = Math.min(Math.max(0, rect.x), width);
  const y = Math.min(Math.max(0, rect.y), height);
  const w = Math.min(Math.max(1, rect.w), width - x);
  const h = Math.min(Math.max(1, rect.h), height - y);
  return { x, y, w, h };
}

export function frameSize(frames: Rect[], indices?: number[]): { w: number; h: number } {
  let w = 0;
  let h = 0;
  const list = indices ? indices.map((i) => frames[i]).filter(Boolean) : frames;
  for (const f of list) {
    w = Math.max(w, Math.ceil(f.w));
    h = Math.max(h, Math.ceil(f.h));
  }
  return { w, h };
}

// ---------------------------------------------------------------------------------------------------------------------
// Sequence
// ---------------------------------------------------------------------------------------------------------------------

export type SequenceOrder = "row" | "column";

export function defaultSequence(columns: number, rows: number, order: SequenceOrder = "row", reverse = false) {
  const out: number[] = [];
  if (order === "row") {
    for (let i = 0; i < columns * rows; i++) out.push(i);
  } else {
    for (let c = 0; c < columns; c++) {
      for (let r = 0; r < rows; r++) out.push(r * columns + c);
    }
  }
  return reverse ? out.reverse() : out;
}

/**
 * Parse `"0-7, 9, 15-8"` into frame indices. Ranges are inclusive and may be descending.
 * Returns `null` for malformed input.
 */
export function parseSequence(text: string, max: number): number[] | null {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const out: number[] = [];
  for (const raw of trimmed.split(/[\s,;]+/)) {
    if (!raw) continue;
    const m = raw.match(/^(\d+)(?:\s*[-:]\s*(\d+))?$/);
    if (!m) return null;
    const a = Number(m[1]);
    const b = m[2] !== undefined ? Number(m[2]) : a;
    if (a >= max || b >= max) return null;
    if (a <= b) for (let i = a; i <= b; i++) out.push(i);
    else for (let i = a; i >= b; i--) out.push(i);
  }
  return out;
}

/** Compress `[0,1,2,3,7,6,9]` into `"0-3, 7-6, 9"`. */
export function formatSequence(indices: number[]): string {
  if (!indices.length) return "";
  const parts: string[] = [];
  let start = indices[0];
  let prev = indices[0];
  let dir = 0;

  const flush = () => {
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
  };

  for (let i = 1; i < indices.length; i++) {
    const cur = indices[i];
    const d = cur - prev;
    if ((d === 1 || d === -1) && (dir === 0 || dir === d)) {
      dir = d;
      prev = cur;
      continue;
    }
    flush();
    start = cur;
    prev = cur;
    dir = 0;
  }
  flush();
  return parts.join(", ");
}

// ---------------------------------------------------------------------------------------------------------------------
// Auto detection
// ---------------------------------------------------------------------------------------------------------------------

export interface DetectOptions {
  /** 0-255. Pixels with alpha <= threshold count as empty. */
  alphaThreshold: number;
  /** Gaps narrower than this (px) are treated as content noise, not separators. */
  minGap: number;
  /** Segments narrower than this (px) are dropped as noise. */
  minSegment: number;
}

export const DEFAULT_DETECT_OPTIONS: DetectOptions = { alphaThreshold: 8, minGap: 2, minSegment: 4 };

function segments(occupancy: Uint32Array, minGap: number, minSegment: number): Range[] {
  const raw: Range[] = [];
  let start = -1;
  for (let i = 0; i < occupancy.length; i++) {
    const filled = occupancy[i] > 0;
    if (filled && start < 0) start = i;
    if (!filled && start >= 0) {
      raw.push({ start, end: i });
      start = -1;
    }
  }
  if (start >= 0) raw.push({ start, end: occupancy.length });

  const merged: Range[] = [];
  for (const seg of raw) {
    const last = merged[merged.length - 1];
    if (last && seg.start - last.end < minGap) last.end = seg.end;
    else merged.push({ ...seg });
  }

  return merged.filter((s) => s.end - s.start >= minSegment);
}

/**
 * Detect separator gaps from alpha. If the image is fully opaque, the most common corner color is treated as
 * background instead.
 */
export function detectGrid(
  image: CanvasImageSource & { width: number; height: number },
  options: DetectOptions = DEFAULT_DETECT_OPTIONS
): { columns: Range[]; rows: Range[] } | null {
  const width = image.width;
  const height = image.height;
  if (!width || !height) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, width, height).data;

  let hasAlpha = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] <= options.alphaThreshold) {
      hasAlpha = true;
      break;
    }
  }

  const bg = (() => {
    if (hasAlpha) return null;
    const pick = (x: number, y: number) => {
      const i = (y * width + x) * 4;
      return [data[i], data[i + 1], data[i + 2]] as const;
    };
    const corners = [pick(0, 0), pick(width - 1, 0), pick(0, height - 1), pick(width - 1, height - 1)];
    const key = (c: readonly [number, number, number]) => c.join(",");
    const counts = new Map<string, number>();
    for (const c of corners) counts.set(key(c), (counts.get(key(c)) ?? 0) + 1);
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return corners.find((c) => key(c) === best)!;
  })();

  const isEmpty = (i: number) => {
    if (bg) {
      const tol = 24;
      return (
        Math.abs(data[i] - bg[0]) <= tol && Math.abs(data[i + 1] - bg[1]) <= tol && Math.abs(data[i + 2] - bg[2]) <= tol
      );
    }
    return data[i + 3] <= options.alphaThreshold;
  };

  const cols = new Uint32Array(width);
  const rows = new Uint32Array(height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (!isEmpty(i)) {
        cols[x]++;
        rows[y]++;
      }
    }
  }

  const columns = segments(cols, options.minGap, options.minSegment);
  const rowSegs = segments(rows, options.minGap, options.minSegment);
  if (!columns.length || !rowSegs.length) return null;

  return { columns, rows: rowSegs };
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Convert detected ranges into settings + line overrides so the non-uniform grid displays exactly as detected while
 * the numeric inputs still show sensible values.
 */
export function detectionToState(
  imageWidth: number,
  imageHeight: number,
  detected: { columns: Range[]; rows: Range[] },
  previous: SpriteExtractSettings
): { settings: SpriteExtractSettings; overrides: SpriteExtractOverrides } {
  const { columns, rows } = detected;

  const gapsX: number[] = [];
  for (let i = 1; i < columns.length; i++) gapsX.push(columns[i].start - columns[i - 1].end);
  const gapsY: number[] = [];
  for (let i = 1; i < rows.length; i++) gapsY.push(rows[i].start - rows[i - 1].end);

  const settings: SpriteExtractSettings = {
    ...previous,
    mode: "grid",
    columns: columns.length,
    rows: rows.length,
    padding: {
      left: columns[0].start,
      right: imageWidth - columns[columns.length - 1].end,
      top: rows[0].start,
      bottom: imageHeight - rows[rows.length - 1].end,
    },
    spacing: { x: Math.round(median(gapsX)), y: Math.round(median(gapsY)) },
  };

  const base = computeBaseGrid(imageWidth, imageHeight, settings);
  const overrides: SpriteExtractOverrides = { columns: {}, rows: {}, frames: {} };

  const diff = (a: Range, b: Range): RangeOverride | null => {
    const o: RangeOverride = {};
    if (Math.abs(a.start - b.start) > 0.5) o.start = a.start;
    if (Math.abs(a.end - b.end) > 0.5) o.end = a.end;
    return Object.keys(o).length ? o : null;
  };

  columns.forEach((c, i) => {
    const o = diff(c, base.columns[i]);
    if (o) overrides.columns[i] = o;
  });
  rows.forEach((r, i) => {
    const o = diff(r, base.rows[i]);
    if (o) overrides.rows[i] = o;
  });

  return { settings, overrides };
}

/** Bounding box of non-transparent pixels inside `rect`, in image coordinates. `null` when empty. */
export function contentBounds(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  alphaThreshold = DEFAULT_DETECT_OPTIONS.alphaThreshold
): Rect | null {
  const r = roundRect(clampRectToImage(rect, ctx.canvas.width, ctx.canvas.height));
  if (r.w <= 0 || r.h <= 0) return null;
  const data = ctx.getImageData(r.x, r.y, r.w, r.h).data;

  let minX = r.w;
  let minY = r.h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      if (data[(y * r.w + x) * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: r.x + minX, y: r.y + minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
