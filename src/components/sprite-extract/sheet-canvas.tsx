import {
  LineAxis,
  LineEdge,
  Rect,
  SpriteExtractOverrides,
  SpriteExtractSettings,
  SpriteGrid,
} from "@/services/sprite-extract";
import clsx from "clsx";
import React from "react";

const COLORS = {
  line: "#b5d72b",
  lineOverride: "#c847ee",
  frameOverride: "#2bd76f",
  selected: "#ffffff",
  excluded: "rgba(255, 0, 0, 0.35)",
  gap: "rgba(255, 0, 0, 0.18)",
  padding: "rgba(0, 0, 0, 0.55)",
  label: "rgba(0, 0, 0, 0.7)",
  hover: "rgba(255, 255, 255, 0.12)",
};

const HIT_TOLERANCE = 6;
const HANDLE_SIZE = 7;
const MIN_SCALE = 0.05;
const MAX_SCALE = 64;

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

type PaddingSide = keyof SpriteExtractSettings["padding"];

interface LineRef {
  axis: LineAxis;
  index: number;
  edge: LineEdge;
  /** Set when this is the outermost line — dragging it changes padding instead of an override. */
  outer?: PaddingSide;
  /** Current position in image coordinates. */
  position: number;
}

type Hit =
  | { type: "handle"; frame: number; handle: Handle }
  | { type: "line"; lines: LineRef[] }
  | { type: "frame"; index: number }
  | { type: "none" };

type Drag =
  | { kind: "pan"; startX: number; startY: number; offsetX: number; offsetY: number }
  | { kind: "line"; lines: LineRef[]; startImg: number }
  | { kind: "frame-move"; index: number; start: Rect; startImgX: number; startImgY: number; moved: boolean }
  | { kind: "frame-resize"; index: number; handle: Handle; start: Rect };

interface View {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface SheetCanvasHandle {
  fit: () => void;
  zoomBy: (factor: number) => void;
  zoomTo: (scale: number) => void;
}

export interface SheetCanvasProps {
  image: HTMLImageElement | undefined;
  width: number;
  height: number;
  grid: SpriteGrid;
  overrides: SpriteExtractOverrides;
  selected: number | null;
  sequence: number[];
  showLabels: boolean;
  className?: string;
  onSelect: (index: number | null) => void;
  onToggleInSequence: (index: number) => void;
  onSetLine: (axis: LineAxis, index: number, edge: LineEdge, value: number | undefined) => void;
  onSetPadding: (side: PaddingSide, value: number) => void;
  onSetFrameRect: (index: number, rect: Rect) => void;
  onZoomChange?: (scale: number) => void;
}

function handleCursor(handle: Handle): string {
  switch (handle) {
    case "n":
    case "s":
      return "ns-resize";
    case "e":
    case "w":
      return "ew-resize";
    case "ne":
    case "sw":
      return "nesw-resize";
    case "nw":
    case "se":
      return "nwse-resize";
  }
}

function makeCheckerboard(): CanvasPattern | null {
  const size = 16;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(0, 0, size / 2, size / 2);
  ctx.fillRect(size / 2, size / 2, size / 2, size / 2);
  return ctx.createPattern(c, "repeat");
}

export const SheetCanvas = React.forwardRef<SheetCanvasHandle, SheetCanvasProps>(function SheetCanvas(
  {
    image,
    width,
    height,
    grid,
    overrides,
    selected,
    sequence,
    showLabels,
    className,
    onSelect,
    onToggleInSequence,
    onSetLine,
    onSetPadding,
    onSetFrameRect,
    onZoomChange,
  },
  ref
) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const statusRef = React.useRef<HTMLSpanElement>(null);

  const viewRef = React.useRef<View>({ scale: 1, offsetX: 0, offsetY: 0 });
  const dragRef = React.useRef<Drag | null>(null);
  const hoverRef = React.useRef<Hit>({ type: "none" });
  const spaceRef = React.useRef(false);
  const fittedForRef = React.useRef<string>("");
  const checkerRef = React.useRef<CanvasPattern | null>(null);
  const frameRef = React.useRef<number | null>(null);

  const sequenceSet = React.useMemo(() => new Set(sequence), [sequence]);

  // -------------------------------------------------------------------------------------------------------------------
  // Coordinate helpers
  // -------------------------------------------------------------------------------------------------------------------

  const toScreen = React.useCallback((x: number, y: number) => {
    const v = viewRef.current;
    return { x: x * v.scale + v.offsetX, y: y * v.scale + v.offsetY };
  }, []);

  const toImage = React.useCallback((sx: number, sy: number) => {
    const v = viewRef.current;
    return { x: (sx - v.offsetX) / v.scale, y: (sy - v.offsetY) / v.scale };
  }, []);

  const pointerPosition = React.useCallback((e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  // -------------------------------------------------------------------------------------------------------------------
  // Lines
  // -------------------------------------------------------------------------------------------------------------------

  const allLines = React.useMemo((): LineRef[] => {
    const lines: LineRef[] = [];
    const lastC = grid.columns.length - 1;
    const lastR = grid.rows.length - 1;
    grid.columns.forEach((c, i) => {
      lines.push({ axis: "column", index: i, edge: "start", position: c.start, outer: i === 0 ? "left" : undefined });
      lines.push({ axis: "column", index: i, edge: "end", position: c.end, outer: i === lastC ? "right" : undefined });
    });
    grid.rows.forEach((r, i) => {
      lines.push({ axis: "row", index: i, edge: "start", position: r.start, outer: i === 0 ? "top" : undefined });
      lines.push({ axis: "row", index: i, edge: "end", position: r.end, outer: i === lastR ? "bottom" : undefined });
    });
    return lines;
  }, [grid]);

  const isLineOverridden = React.useCallback(
    (line: LineRef) => {
      const map = line.axis === "column" ? overrides.columns : overrides.rows;
      return map[line.index]?.[line.edge] !== undefined;
    },
    [overrides]
  );

  // -------------------------------------------------------------------------------------------------------------------
  // Hit testing
  // -------------------------------------------------------------------------------------------------------------------

  const hitTest = React.useCallback(
    (sx: number, sy: number): Hit => {
      if (!image) return { type: "none" };
      const v = viewRef.current;
      const img = toImage(sx, sy);

      if (selected !== null && grid.frames[selected]) {
        const f = grid.frames[selected];
        const a = toScreen(f.x, f.y);
        const b = toScreen(f.x + f.w, f.y + f.h);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const points: Record<Handle, { x: number; y: number }> = {
          nw: { x: a.x, y: a.y },
          n: { x: mx, y: a.y },
          ne: { x: b.x, y: a.y },
          e: { x: b.x, y: my },
          se: { x: b.x, y: b.y },
          s: { x: mx, y: b.y },
          sw: { x: a.x, y: b.y },
          w: { x: a.x, y: my },
        };
        for (const handle of HANDLES) {
          const p = points[handle];
          if (Math.abs(p.x - sx) <= HIT_TOLERANCE + 1 && Math.abs(p.y - sy) <= HIT_TOLERANCE + 1) {
            return { type: "handle", frame: selected, handle };
          }
        }
      }

      const tol = HIT_TOLERANCE / v.scale;
      const b = grid.bounds;
      const withinY = img.y >= b.y - tol && img.y <= b.y + b.h + tol;
      const withinX = img.x >= b.x - tol && img.x <= b.x + b.w + tol;

      let best: LineRef | null = null;
      let bestDist = Infinity;
      for (const line of allLines) {
        const inRange = line.axis === "column" ? withinY : withinX;
        if (!inRange) continue;
        const d = Math.abs((line.axis === "column" ? img.x : img.y) - line.position);
        if (d <= tol && d < bestDist) {
          best = line;
          bestDist = d;
        }
      }
      if (best) {
        const anchor = best;
        const group = allLines.filter((l) => l.axis === anchor.axis && Math.abs(l.position - anchor.position) <= 0.5);
        return { type: "line", lines: group };
      }

      // Prefer selected frame when overlapping.
      if (selected !== null) {
        const f = grid.frames[selected];
        if (f && img.x >= f.x && img.x <= f.x + f.w && img.y >= f.y && img.y <= f.y + f.h) {
          return { type: "frame", index: selected };
        }
      }
      for (let i = 0; i < grid.frames.length; i++) {
        const f = grid.frames[i];
        if (img.x >= f.x && img.x <= f.x + f.w && img.y >= f.y && img.y <= f.y + f.h) {
          return { type: "frame", index: i };
        }
      }
      return { type: "none" };
    },
    [image, grid, selected, allLines, toImage, toScreen]
  );

  // -------------------------------------------------------------------------------------------------------------------
  // Drawing
  // -------------------------------------------------------------------------------------------------------------------

  const draw = React.useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;
    const v = viewRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    if (!image) return;

    const origin = toScreen(0, 0);
    const imgW = width * v.scale;
    const imgH = height * v.scale;

    if (!checkerRef.current) checkerRef.current = makeCheckerboard();
    if (checkerRef.current) {
      ctx.fillStyle = checkerRef.current;
      ctx.fillRect(origin.x, origin.y, imgW, imgH);
    }

    ctx.imageSmoothingEnabled = v.scale < 1;
    ctx.drawImage(image, origin.x, origin.y, imgW, imgH);

    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(origin.x) + 0.5, Math.round(origin.y) + 0.5, Math.round(imgW), Math.round(imgH));

    // Padding dim.
    const b = grid.bounds;
    const ba = toScreen(b.x, b.y);
    const bb = toScreen(b.x + b.w, b.y + b.h);
    ctx.fillStyle = COLORS.padding;
    ctx.beginPath();
    ctx.rect(origin.x, origin.y, imgW, imgH);
    ctx.rect(ba.x, ba.y, bb.x - ba.x, bb.y - ba.y);
    ctx.fill("evenodd");

    // Gaps between columns / rows.
    ctx.fillStyle = COLORS.gap;
    for (let i = 1; i < grid.columns.length; i++) {
      const prev = grid.columns[i - 1].end;
      const next = grid.columns[i].start;
      if (next > prev) {
        const a = toScreen(prev, b.y);
        const c = toScreen(next, b.y + b.h);
        ctx.fillRect(a.x, a.y, c.x - a.x, c.y - a.y);
      }
    }
    for (let i = 1; i < grid.rows.length; i++) {
      const prev = grid.rows[i - 1].end;
      const next = grid.rows[i].start;
      if (next > prev) {
        const a = toScreen(b.x, prev);
        const c = toScreen(b.x + b.w, next);
        ctx.fillRect(a.x, a.y, c.x - a.x, c.y - a.y);
      }
    }

    const hover = hoverRef.current;

    // Frames: excluded overlay, override outlines, labels.
    ctx.font = "11px Hack, monospace";
    ctx.textBaseline = "top";
    grid.frames.forEach((f, index) => {
      const a = toScreen(f.x, f.y);
      const c = toScreen(f.x + f.w, f.y + f.h);
      const w = c.x - a.x;
      const h = c.y - a.y;

      if (!sequenceSet.has(index)) {
        ctx.fillStyle = COLORS.excluded;
        ctx.fillRect(a.x, a.y, w, h);
        ctx.strokeStyle = "rgba(255,0,0,0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(c.x, c.y);
        ctx.moveTo(c.x, a.y);
        ctx.lineTo(a.x, c.y);
        ctx.stroke();
      }

      if (hover.type === "frame" && hover.index === index && index !== selected) {
        ctx.fillStyle = COLORS.hover;
        ctx.fillRect(a.x, a.y, w, h);
      }

      if (overrides.frames[index]) {
        ctx.strokeStyle = COLORS.frameOverride;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5, Math.round(w), Math.round(h));
      }

      if (showLabels && w > 18 && h > 14) {
        const text = String(index);
        const tw = ctx.measureText(text).width + 6;
        ctx.fillStyle = COLORS.label;
        ctx.fillRect(a.x + 1, a.y + 1, tw, 14);
        ctx.fillStyle = sequenceSet.has(index) ? COLORS.line : "#ff6b6b";
        ctx.fillText(text, a.x + 4, a.y + 2);
      }
    });

    // Grid lines.
    const hoveredLines = hover.type === "line" ? hover.lines : [];
    for (const line of allLines) {
      const overridden = isLineOverridden(line);
      const hovered = hoveredLines.some((l) => l.axis === line.axis && l.index === line.index && l.edge === line.edge);
      ctx.strokeStyle = overridden ? COLORS.lineOverride : COLORS.line;
      ctx.lineWidth = hovered ? 3 : 1;
      ctx.globalAlpha = hovered ? 1 : 0.9;
      ctx.beginPath();
      if (line.axis === "column") {
        const p = toScreen(line.position, 0);
        const x = Math.round(p.x) + 0.5;
        ctx.moveTo(x, ba.y);
        ctx.lineTo(x, bb.y);
      } else {
        const p = toScreen(0, line.position);
        const y = Math.round(p.y) + 0.5;
        ctx.moveTo(ba.x, y);
        ctx.lineTo(bb.x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Selected frame.
    if (selected !== null && grid.frames[selected]) {
      const f = grid.frames[selected];
      const a = toScreen(f.x, f.y);
      const c = toScreen(f.x + f.w, f.y + f.h);
      ctx.strokeStyle = COLORS.selected;
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5, Math.round(c.x - a.x), Math.round(c.y - a.y));

      const mx = (a.x + c.x) / 2;
      const my = (a.y + c.y) / 2;
      const pts = [
        [a.x, a.y],
        [mx, a.y],
        [c.x, a.y],
        [c.x, my],
        [c.x, c.y],
        [mx, c.y],
        [a.x, c.y],
        [a.x, my],
      ];
      ctx.fillStyle = COLORS.selected;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      for (const [x, y] of pts) {
        ctx.fillRect(x - HANDLE_SIZE / 2, y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        ctx.strokeRect(x - HANDLE_SIZE / 2 + 0.5, y - HANDLE_SIZE / 2 + 0.5, HANDLE_SIZE - 1, HANDLE_SIZE - 1);
      }
    }
  }, [image, width, height, grid, overrides, selected, sequenceSet, showLabels, allLines, isLineOverridden, toScreen]);

  const scheduleDraw = React.useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      draw();
    });
  }, [draw]);

  React.useEffect(() => {
    scheduleDraw();
  }, [scheduleDraw]);

  // -------------------------------------------------------------------------------------------------------------------
  // View
  // -------------------------------------------------------------------------------------------------------------------

  const setView = React.useCallback(
    (next: View) => {
      const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next.scale));
      viewRef.current = { ...next, scale };
      onZoomChange?.(scale);
      scheduleDraw();
    },
    [onZoomChange, scheduleDraw]
  );

  const fit = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width || !height) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;
    const pad = 24;
    const scale = Math.min((cw - pad * 2) / width, (ch - pad * 2) / height);
    setView({
      scale,
      offsetX: (cw - width * scale) / 2,
      offsetY: (ch - height * scale) / 2,
    });
  }, [width, height, setView]);

  const zoomAt = React.useCallback(
    (factor: number, sx: number, sy: number) => {
      const v = viewRef.current;
      const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scale * factor));
      const k = scale / v.scale;
      setView({
        scale,
        offsetX: sx - (sx - v.offsetX) * k,
        offsetY: sy - (sy - v.offsetY) * k,
      });
    },
    [setView]
  );

  const zoomCenter = React.useCallback(
    (factor: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      zoomAt(factor, canvas.width / dpr / 2, canvas.height / dpr / 2);
    },
    [zoomAt]
  );

  React.useImperativeHandle(
    ref,
    () => ({
      fit,
      zoomBy: zoomCenter,
      zoomTo: (scale: number) => zoomCenter(scale / viewRef.current.scale),
    }),
    [fit, zoomCenter]
  );

  // Resize canvas to container.
  React.useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { clientWidth, clientHeight } = container;
      canvas.width = Math.max(1, Math.floor(clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(clientHeight * dpr));
      canvas.style.width = `${clientWidth}px`;
      canvas.style.height = `${clientHeight}px`;
      if (fittedForRef.current === "") fit();
      else scheduleDraw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    return () => observer.disconnect();
  }, [fit, scheduleDraw]);

  // Fit when a new image is loaded.
  React.useEffect(() => {
    const key = image ? `${image.src}:${width}x${height}` : "";
    if (key && fittedForRef.current !== key) {
      fittedForRef.current = key;
      fit();
    }
  }, [image, width, height, fit]);

  // -------------------------------------------------------------------------------------------------------------------
  // Pointer interaction
  // -------------------------------------------------------------------------------------------------------------------

  const updateCursor = React.useCallback(
    (hit: Hit, panning: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (panning) canvas.style.cursor = "grabbing";
      else if (spaceRef.current) canvas.style.cursor = "grab";
      else if (hit.type === "handle") canvas.style.cursor = handleCursor(hit.handle);
      else if (hit.type === "line") canvas.style.cursor = hit.lines[0].axis === "column" ? "ew-resize" : "ns-resize";
      else if (hit.type === "frame") canvas.style.cursor = hit.index === selected ? "move" : "pointer";
      else canvas.style.cursor = "grab";
    },
    [selected]
  );

  const updateStatus = React.useCallback(
    (sx: number, sy: number, hit: Hit) => {
      const el = statusRef.current;
      if (!el) return;
      const img = toImage(sx, sy);
      const parts = [`${Math.floor(img.x)}, ${Math.floor(img.y)}`];
      if (hit.type === "frame" || hit.type === "handle") {
        const index = hit.type === "frame" ? hit.index : hit.frame;
        const f = grid.frames[index];
        if (f) parts.push(`#${index}  ${Math.round(f.x)},${Math.round(f.y)}  ${Math.round(f.w)}×${Math.round(f.h)}`);
      } else if (hit.type === "line") {
        const l = hit.lines[0];
        parts.push(`${l.axis} ${l.index} ${l.edge} @ ${Math.round(l.position)}`);
      }
      el.textContent = parts.join("   ");
    },
    [grid.frames, toImage]
  );

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!image) return;
      const canvas = canvasRef.current!;
      canvas.setPointerCapture(e.pointerId);
      const { x: sx, y: sy } = pointerPosition(e);
      const v = viewRef.current;

      const pan = (): Drag => ({ kind: "pan", startX: sx, startY: sy, offsetX: v.offsetX, offsetY: v.offsetY });

      if (e.button === 1 || spaceRef.current || (e.button === 0 && e.altKey)) {
        dragRef.current = pan();
        updateCursor({ type: "none" }, true);
        return;
      }
      if (e.button !== 0) return;

      const hit = hitTest(sx, sy);
      const img = toImage(sx, sy);

      switch (hit.type) {
        case "handle": {
          dragRef.current = {
            kind: "frame-resize",
            index: hit.frame,
            handle: hit.handle,
            start: grid.frames[hit.frame],
          };
          break;
        }
        case "line": {
          const axis = hit.lines[0].axis;
          dragRef.current = { kind: "line", lines: hit.lines, startImg: axis === "column" ? img.x : img.y };
          break;
        }
        case "frame": {
          if (hit.index === selected) {
            dragRef.current = {
              kind: "frame-move",
              index: hit.index,
              start: grid.frames[hit.index],
              startImgX: img.x,
              startImgY: img.y,
              moved: false,
            };
          } else {
            onSelect(hit.index);
            dragRef.current = pan();
          }
          break;
        }
        default: {
          onSelect(null);
          dragRef.current = pan();
        }
      }
    },
    [image, grid.frames, selected, hitTest, pointerPosition, toImage, onSelect, updateCursor]
  );

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!image) return;
      const { x: sx, y: sy } = pointerPosition(e);
      const drag = dragRef.current;

      if (!drag) {
        const hit = hitTest(sx, sy);
        hoverRef.current = hit;
        updateCursor(hit, false);
        updateStatus(sx, sy, hit);
        scheduleDraw();
        return;
      }

      const img = toImage(sx, sy);

      switch (drag.kind) {
        case "pan": {
          setView({
            scale: viewRef.current.scale,
            offsetX: drag.offsetX + (sx - drag.startX),
            offsetY: drag.offsetY + (sy - drag.startY),
          });
          break;
        }
        case "line": {
          const axis = drag.lines[0].axis;
          const limit = axis === "column" ? width : height;
          const value = Math.round(Math.max(0, Math.min(limit, axis === "column" ? img.x : img.y)));
          for (const line of drag.lines) {
            if (line.outer) {
              const paddingValue = line.outer === "left" || line.outer === "top" ? value : limit - value;
              onSetPadding(line.outer, paddingValue);
              onSetLine(line.axis, line.index, line.edge, undefined);
            } else {
              onSetLine(line.axis, line.index, line.edge, value);
            }
          }
          updateStatus(sx, sy, { type: "line", lines: drag.lines.map((l) => ({ ...l, position: value })) });
          break;
        }
        case "frame-move": {
          const dx = Math.round(img.x - drag.startImgX);
          const dy = Math.round(img.y - drag.startImgY);
          if (!drag.moved && dx === 0 && dy === 0) break;
          drag.moved = true;
          const rect = { ...drag.start, x: drag.start.x + dx, y: drag.start.y + dy };
          onSetFrameRect(drag.index, rect);
          updateStatus(sx, sy, { type: "frame", index: drag.index });
          break;
        }
        case "frame-resize": {
          const s = drag.start;
          const px = Math.round(img.x);
          const py = Math.round(img.y);
          let { x, y, w, h } = s;
          const h_ = drag.handle;
          if (h_.includes("w")) {
            const right = s.x + s.w;
            x = Math.min(px, right - 1);
            w = right - x;
          }
          if (h_.includes("e")) w = Math.max(1, px - s.x);
          if (h_.includes("n")) {
            const bottom = s.y + s.h;
            y = Math.min(py, bottom - 1);
            h = bottom - y;
          }
          if (h_.includes("s")) h = Math.max(1, py - s.y);
          onSetFrameRect(drag.index, { x, y, w, h });
          break;
        }
      }
    },
    [
      image,
      width,
      height,
      hitTest,
      pointerPosition,
      toImage,
      updateCursor,
      updateStatus,
      scheduleDraw,
      setView,
      onSetPadding,
      onSetLine,
      onSetFrameRect,
    ]
  );

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (canvas?.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      dragRef.current = null;
      const { x: sx, y: sy } = pointerPosition(e);
      const hit = hitTest(sx, sy);
      hoverRef.current = hit;
      updateCursor(hit, false);
      scheduleDraw();
    },
    [hitTest, pointerPosition, updateCursor, scheduleDraw]
  );

  const onDoubleClick = React.useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!image) return;
      const { x: sx, y: sy } = pointerPosition(e);
      const hit = hitTest(sx, sy);
      if (hit.type === "frame") onToggleInSequence(hit.index);
    },
    [image, hitTest, pointerPosition, onToggleInSequence]
  );

  // Wheel: scroll pans, ctrl/meta (pinch) zooms.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      if (!image) return;
      e.preventDefault();
      const { x: sx, y: sy } = pointerPosition(e);
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0025));
        zoomAt(factor, sx, sy);
      } else {
        const v = viewRef.current;
        setView({ scale: v.scale, offsetX: v.offsetX - e.deltaX, offsetY: v.offsetY - e.deltaY });
      }
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [image, pointerPosition, zoomAt, setView]);

  // Space = pan modifier.
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      spaceRef.current = true;
      if (!dragRef.current) updateCursor(hoverRef.current, false);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      spaceRef.current = false;
      if (!dragRef.current) updateCursor(hoverRef.current, false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [updateCursor]);

  return (
    <div ref={containerRef} className={clsx("relative w-full h-full min-w-0 min-h-0 overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        className="block touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => {
          if (dragRef.current) return;
          hoverRef.current = { type: "none" };
          if (statusRef.current) statusRef.current.textContent = "";
          scheduleDraw();
        }}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      />
      <span
        ref={statusRef}
        className="absolute left-2 bottom-2 text-xs font-hack text-foreground/80 bg-background/80 px-2 py-0.5 pointer-events-none whitespace-pre"
      />
    </div>
  );
});
