import jsQR from "jsqr";

export interface QRCodeEntry {
  id: string;
  content: string;
  imageDataUrl: string;
  timestamp: number;
}

const STORAGE_KEY = "qr-reader-entries";

export class QRReaderService {
  constructor(readonly debug = true) {}

  /**
   * Decode QR code from an image element
   */
  public async decodeFromImage(image: HTMLImageElement): Promise<string | null> {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    return code?.data ?? null;
  }

  /**
   * Decode QR code from a canvas element
   */
  public decodeFromCanvas(canvas: HTMLCanvasElement): string | null {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    return code?.data ?? null;
  }

  /**
   * Decode QR code from video frame
   */
  public decodeFromVideo(video: HTMLVideoElement, canvas: HTMLCanvasElement): string | null {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    return code?.data ?? null;
  }

  /**
   * Convert image to data URL for storage
   */
  public imageToDataUrl(image: HTMLImageElement, maxSize = 200): string {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/png");
  }

  /**
   * Convert video frame to data URL for storage
   */
  public videoFrameToDataUrl(video: HTMLVideoElement, maxSize = 200): string {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const scale = Math.min(maxSize / video.videoWidth, maxSize / video.videoHeight, 1);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/png");
  }

  /**
   * Load entries from localStorage
   */
  public loadEntries(): QRCodeEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Save entries to localStorage
   */
  public saveEntries(entries: QRCodeEntry[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  /**
   * Add a new entry
   */
  public addEntry(content: string, imageDataUrl: string): QRCodeEntry {
    const entry: QRCodeEntry = {
      id: crypto.randomUUID(),
      content,
      imageDataUrl,
      timestamp: Date.now(),
    };

    const entries = this.loadEntries();
    entries.unshift(entry);
    this.saveEntries(entries);

    return entry;
  }

  /**
   * Remove a single entry
   */
  public removeEntry(id: string): void {
    const entries = this.loadEntries();
    const filtered = entries.filter((e) => e.id !== id);
    this.saveEntries(filtered);
  }

  /**
   * Remove all entries
   */
  public clearAllEntries(): void {
    this.saveEntries([]);
  }
}
