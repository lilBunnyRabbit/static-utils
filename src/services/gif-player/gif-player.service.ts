export interface FrameInfo {
  index: number;
  delay: number;
  cumulativeTime: number;
}

export interface ParsedGif {
  width: number;
  height: number;
  frames: FrameInfo[];
  totalDuration: number;
  bytes: number;
}

interface InboundMessage {
  type: "PARSED" | "ERROR" | "WARMUP_PROGRESS";
  meta?: ParsedGif;
  message?: string;
  done?: number;
  total?: number;
}

export interface WarmupCallback {
  (done: number, total: number): void;
}

export class GifPlayerWorker {
  private worker: Worker;
  private warmupListener: WarmupCallback | null = null;

  constructor() {
    this.worker = new Worker(new URL("./gif-player.worker.ts", import.meta.url), { type: "module" });
    this.worker.addEventListener("message", (e: MessageEvent<InboundMessage>) => {
      if (e.data?.type === "WARMUP_PROGRESS" && this.warmupListener) {
        this.warmupListener(e.data.done ?? 0, e.data.total ?? 0);
      }
    });
  }

  parse(file: File): Promise<ParsedGif> {
    return new Promise<ParsedGif>(async (resolve, reject) => {
      const onMsg = (e: MessageEvent<InboundMessage>) => {
        if (e.data?.type === "PARSED" && e.data.meta) {
          this.worker.removeEventListener("message", onMsg);
          resolve(e.data.meta);
        } else if (e.data?.type === "ERROR") {
          this.worker.removeEventListener("message", onMsg);
          reject(new Error(e.data.message ?? "Failed to parse GIF"));
        }
      };
      this.worker.addEventListener("message", onMsg);

      try {
        const buffer = await file.arrayBuffer();
        this.worker.postMessage({ type: "PARSE", buffer }, [buffer]);
      } catch (e) {
        this.worker.removeEventListener("message", onMsg);
        reject(e);
      }
    });
  }

  attachCanvas(canvas: HTMLCanvasElement): boolean {
    try {
      const offscreen = canvas.transferControlToOffscreen();
      this.worker.postMessage({ type: "CANVAS", canvas: offscreen }, [offscreen]);
      return true;
    } catch (e) {
      console.error("[gif-player] failed to transfer canvas", e);
      return false;
    }
  }

  draw(index: number): void {
    this.worker.postMessage({ type: "DRAW", index });
  }

  warmup(onProgress?: WarmupCallback): void {
    this.warmupListener = onProgress ?? null;
    this.worker.postMessage({ type: "WARMUP" });
  }

  reset(): void {
    this.warmupListener = null;
    this.worker.postMessage({ type: "RESET" });
  }

  terminate(): void {
    this.warmupListener = null;
    this.worker.terminate();
  }
}

export function isOffscreenCanvasSupported(): boolean {
  return typeof HTMLCanvasElement !== "undefined" && "transferControlToOffscreen" in HTMLCanvasElement.prototype;
}
