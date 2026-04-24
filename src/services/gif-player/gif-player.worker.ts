import { decompressFrame, parseGIF, type ParsedGif as GifuctParsed } from "gifuct-js";

interface FrameDims {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface FrameMeta {
  index: number;
  delay: number;
  disposalType: number;
  cumulativeTime: number;
  dims: FrameDims;
}

interface CachedPatch {
  dims: FrameDims;
  patch: Uint8ClampedArray;
}

let canvas: OffscreenCanvas | null = null;
let target: OffscreenCanvasRenderingContext2D | null = null;
let work: OffscreenCanvas | null = null;
let workCtx: OffscreenCanvasRenderingContext2D | null = null;
let patchCanvas: OffscreenCanvas | null = null;
let patchCtx: OffscreenCanvasRenderingContext2D | null = null;

let parsedGif: GifuctParsed | null = null;
let rawFrames: any[] = [];
let frameMetas: FrameMeta[] = [];
let width = 0;
let height = 0;

let lastIndex = -1;
let prevState: ImageData | null = null;
const snapshots: Map<number, { state: ImageData; prevState: ImageData | null }> = new Map();
let snapshotInterval = Number.POSITIVE_INFINITY;

const patchCache: Map<number, CachedPatch> = new Map();
let patchCacheBytes = 0;
const patchCacheBudget = 96 * 1024 * 1024;

const renderedBitmaps: Map<number, ImageBitmap> = new Map();
let bitmapBytes = 0;
let frameBytes = 0;
const bitmapBudget = 256 * 1024 * 1024;

let pendingDrawIndex: number | null = null;
let drawScheduled = false;
let warmupActive = false;

function postMessageTyped(msg: unknown) {
  (self as unknown as Worker).postMessage(msg);
}

self.addEventListener("message", (event: MessageEvent) => {
  const msg = event.data;
  switch (msg?.type) {
    case "PARSE":
      handleParse(msg.buffer);
      break;
    case "CANVAS":
      handleCanvas(msg.canvas);
      break;
    case "DRAW":
      scheduleDraw(msg.index);
      break;
    case "WARMUP":
      void runWarmup();
      break;
    case "RESET":
      handleReset();
      break;
  }
});

function handleParse(buffer: ArrayBuffer) {
  try {
    handleReset();
    const gif = parseGIF(buffer);
    const filtered = (gif.frames as any[]).filter((f) => f && f.image);
    if (!filtered.length) throw new Error("GIF has no frames");

    const w = gif.lsd.width;
    const h = gif.lsd.height;
    if (!w || !h) throw new Error(`Invalid GIF dimensions: ${w}×${h}`);

    const metas: FrameMeta[] = [];
    let cumulative = 0;
    for (let i = 0; i < filtered.length; i++) {
      const f = filtered[i];
      const desc = f.image.descriptor;
      const dims: FrameDims = {
        left: desc.left,
        top: desc.top,
        width: desc.width,
        height: desc.height,
      };
      const rawDelay = f.gce ? (f.gce.delay || 10) * 10 : 100;
      const delay = rawDelay > 0 ? rawDelay : 100;
      const disposalType = f.gce?.extras?.disposal ?? 0;
      metas.push({ index: i, delay, disposalType, cumulativeTime: cumulative, dims });
      cumulative += delay;
    }

    parsedGif = gif;
    rawFrames = filtered;
    frameMetas = metas;
    width = w;
    height = h;
    frameBytes = w * h * 4;

    const snapMemBudget = 24 * 1024 * 1024;
    const maxSnapshots = Math.max(0, Math.min(40, Math.floor(snapMemBudget / frameBytes)));
    snapshotInterval =
      maxSnapshots > 0 && metas.length > maxSnapshots
        ? Math.max(1, Math.floor(metas.length / maxSnapshots))
        : Number.POSITIVE_INFINITY;

    work = new OffscreenCanvas(w, h);
    workCtx = work.getContext("2d", { willReadFrequently: true });
    patchCanvas = new OffscreenCanvas(1, 1);
    patchCtx = patchCanvas.getContext("2d");

    if (canvas) {
      canvas.width = w;
      canvas.height = h;
      target = canvas.getContext("2d");
    }

    postMessageTyped({
      type: "PARSED",
      meta: {
        width: w,
        height: h,
        frames: metas.map((m) => ({ index: m.index, delay: m.delay, cumulativeTime: m.cumulativeTime })),
        totalDuration: cumulative,
        bytes: buffer.byteLength,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Parse failed";
    postMessageTyped({ type: "ERROR", message });
  }
}

function handleCanvas(c: OffscreenCanvas) {
  canvas = c;
  if (width && height) {
    canvas.width = width;
    canvas.height = height;
  }
  target = canvas.getContext("2d");
  if (pendingDrawIndex !== null) {
    drawNow(pendingDrawIndex);
    pendingDrawIndex = null;
  }
}

function scheduleDraw(index: number) {
  pendingDrawIndex = index;
  if (drawScheduled) return;
  drawScheduled = true;
  // requestAnimationFrame is available in workers when an OffscreenCanvas is bound
  const raf =
    typeof self.requestAnimationFrame === "function"
      ? self.requestAnimationFrame.bind(self)
      : (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number;
  raf(() => {
    drawScheduled = false;
    if (pendingDrawIndex !== null) {
      drawNow(pendingDrawIndex);
      pendingDrawIndex = null;
    }
  });
}

function drawNow(index: number) {
  if (!target || !work) return;
  const safe = Math.max(0, Math.min(index, frameMetas.length - 1));

  const bitmap = renderedBitmaps.get(safe);
  if (bitmap) {
    renderedBitmaps.delete(safe);
    renderedBitmaps.set(safe, bitmap);
    target.drawImage(bitmap, 0, 0);
    return;
  }

  composeUpTo(safe);
  target.drawImage(work, 0, 0);
}

function composeUpTo(targetIndex: number) {
  if (!workCtx || !work || !parsedGif) return;
  if (lastIndex === targetIndex) return;

  let startFrom: number;

  if (lastIndex >= 0 && targetIndex > lastIndex && targetIndex - lastIndex < 50) {
    startFrom = lastIndex + 1;
  } else {
    let bestSnap = -1;
    for (const k of snapshots.keys()) {
      if (k <= targetIndex && k > bestSnap) bestSnap = k;
    }

    if (bestSnap >= 0) {
      const snap = snapshots.get(bestSnap)!;
      workCtx.putImageData(snap.state, 0, 0);
      prevState = snap.prevState;
      lastIndex = bestSnap;
      startFrom = bestSnap + 1;
    } else {
      workCtx.clearRect(0, 0, width, height);
      prevState = null;
      lastIndex = -1;
      startFrom = 0;
    }
  }

  for (let i = startFrom; i <= targetIndex; i++) {
    if (i > 0) applyDisposal(i - 1);
    drawFrame(i);
  }

  lastIndex = targetIndex;

  if (
    snapshotInterval !== Number.POSITIVE_INFINITY &&
    targetIndex > 0 &&
    targetIndex % snapshotInterval === 0 &&
    !snapshots.has(targetIndex)
  ) {
    snapshots.set(targetIndex, {
      state: workCtx.getImageData(0, 0, width, height),
      prevState,
    });
  }
}

function drawFrame(index: number) {
  if (!workCtx || !patchCanvas || !patchCtx) return;
  const meta = frameMetas[index];
  if (!meta) return;

  if (meta.disposalType === 3) {
    prevState = workCtx.getImageData(0, 0, width, height);
  }

  const cached = getPatch(index);
  if (!cached) return;

  patchCanvas.width = cached.dims.width;
  patchCanvas.height = cached.dims.height;
  patchCtx.putImageData(new ImageData(cached.patch, cached.dims.width, cached.dims.height), 0, 0);
  workCtx.drawImage(patchCanvas, cached.dims.left, cached.dims.top);
}

function applyDisposal(index: number) {
  if (!workCtx) return;
  const meta = frameMetas[index];
  if (!meta) return;

  if (meta.disposalType === 2) {
    workCtx.clearRect(meta.dims.left, meta.dims.top, meta.dims.width, meta.dims.height);
  } else if (meta.disposalType === 3 && prevState) {
    workCtx.putImageData(prevState, 0, 0);
  }
}

function getPatch(index: number): CachedPatch | null {
  const hit = patchCache.get(index);
  if (hit) {
    patchCache.delete(index);
    patchCache.set(index, hit);
    return hit;
  }

  const raw = rawFrames[index];
  if (!raw || !parsedGif) return null;
  const decoded = decompressFrame(raw, parsedGif.gct, true);
  if (!decoded || !decoded.patch || !decoded.dims.width || !decoded.dims.height) return null;

  const entry: CachedPatch = { dims: decoded.dims, patch: decoded.patch };
  const bytes = decoded.patch.byteLength;
  if (bytes < patchCacheBudget) {
    while (patchCacheBytes + bytes > patchCacheBudget && patchCache.size > 0) {
      const oldest = patchCache.keys().next().value as number;
      const old = patchCache.get(oldest)!;
      patchCacheBytes -= old.patch.byteLength;
      patchCache.delete(oldest);
    }
    patchCache.set(index, entry);
    patchCacheBytes += bytes;
  }
  return entry;
}

async function runWarmup() {
  if (warmupActive || !work || !workCtx || !parsedGif) return;
  warmupActive = true;
  const total = frameMetas.length;
  if (frameBytes > bitmapBudget) {
    postMessageTyped({ type: "WARMUP_PROGRESS", done: total, total });
    warmupActive = false;
    return;
  }

  for (let i = 0; i < total; i++) {
    if (!warmupActive) return;
    if (!renderedBitmaps.has(i)) {
      composeUpTo(i);
      try {
        const bitmap = await createImageBitmap(work);
        if (!warmupActive) {
          bitmap.close();
          return;
        }
        cacheBitmap(i, bitmap);
      } catch (e) {
        // ignore individual frame failures
      }
    }
    if ((i + 1) % 4 === 0 || i === total - 1) {
      postMessageTyped({ type: "WARMUP_PROGRESS", done: i + 1, total });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  warmupActive = false;
}

function cacheBitmap(index: number, bitmap: ImageBitmap) {
  while (bitmapBytes + frameBytes > bitmapBudget && renderedBitmaps.size > 0) {
    const oldest = renderedBitmaps.keys().next().value as number;
    if (oldest === index) break;
    const old = renderedBitmaps.get(oldest)!;
    old.close();
    renderedBitmaps.delete(oldest);
    bitmapBytes -= frameBytes;
  }
  const existing = renderedBitmaps.get(index);
  if (existing) {
    existing.close();
    bitmapBytes -= frameBytes;
  }
  renderedBitmaps.set(index, bitmap);
  bitmapBytes += frameBytes;
}

function handleReset() {
  warmupActive = false;
  parsedGif = null;
  rawFrames = [];
  frameMetas = [];
  snapshots.clear();
  prevState = null;
  lastIndex = -1;
  pendingDrawIndex = null;
  drawScheduled = false;
  patchCache.clear();
  patchCacheBytes = 0;
  for (const b of renderedBitmaps.values()) b.close();
  renderedBitmaps.clear();
  bitmapBytes = 0;
  width = 0;
  height = 0;
  frameBytes = 0;
}
