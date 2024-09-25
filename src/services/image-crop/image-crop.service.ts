import { ImageFile } from "@/helpers/image-file";
import { drawHollowRect } from "@/utils/canvas.util";

export interface ImageCropServiceSettings {
  alphaLimit?: number;
  color?: string | CanvasGradient | CanvasPattern;
}

export class ImageCropService {
  static DEFAULT_SETTINGS: ImageCropServiceSettings = {
    alphaLimit: 0,
    color: "#b5d72b",
  };

  private canvas: Record<"original" | "cropped", HTMLCanvasElement> | null = null;
  private ctx: Record<"original" | "cropped", CanvasRenderingContext2D> | null = null;

  constructor(readonly debug = true) {}

  private log() {
    if (!this.debug) return;
    console.log("ImageCropService", this.log.prototype);
  }

  public bind(refs: Record<"original" | "cropped", React.RefObject<HTMLCanvasElement>>) {
    const original = refs.original.current;
    if (!original) {
      throw new Error('Missing "original" canvas ref.');
    }

    const cropped = refs.cropped.current;
    if (!cropped) {
      throw new Error('Missing "cropped" canvas ref.');
    }

    this.canvas = { original, cropped };
    this.ctx = {
      original: original.getContext("2d", { willReadFrequently: true })!,
      cropped: cropped.getContext("2d", { willReadFrequently: true })!,
    };

    return this;
  }

  public async render(imageFile: ImageFile, settings: ImageCropServiceSettings = {}) {
    this.log();
    if (!this.canvas || !this.ctx) return;

    const { image } = imageFile;

    this.canvas.original.width = image.width;
    this.canvas.original.height = image.height;

    this.ctx.original.clearRect(0, 0, this.canvas.original.width, this.canvas.original.height);
    this.ctx.original.drawImage(image, 0, 0);

    const cropLimits = this.getCropLimits(this.ctx.original, ((settings.alphaLimit || 0) * 255) / 100);

    this.ctx.original.fillStyle = settings.color || "#ff0000";
    drawHollowRect(this.ctx.original, cropLimits);

    this.canvas.cropped.width = cropLimits.right - cropLimits.left;
    this.canvas.cropped.height = cropLimits.bottom - cropLimits.top;

    this.ctx.cropped.clearRect(0, 0, this.canvas.cropped.width, this.canvas.cropped.height);
    this.ctx.cropped.drawImage(
      image,
      cropLimits.left,
      cropLimits.top,
      this.canvas.cropped.width,
      this.canvas.cropped.height,
      0,
      0,
      this.canvas.cropped.width,
      this.canvas.cropped.height
    );

    this.fitCss(this.canvas.original);
    this.fitCss(this.canvas.cropped);

    return {
      original: {
        width: this.canvas.original.width,
        height: this.canvas.original.height,
      },
      crop: {
        width: this.canvas.cropped.width,
        height: this.canvas.cropped.height,
      },
    };
  }

  private getCropLimits(ctx: CanvasRenderingContext2D, alphaLimit = 0) {
    const canvas = ctx.canvas;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    const isValidAlpha = (x: number, y: number) => data[(y * canvas.width + x) * 4 + 3] <= alphaLimit;

    const getTopLimit = () => {
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          if (!isValidAlpha(x, y)) return y;
        }
      }
      return 0;
    };

    const getRightLimit = (top: number) => {
      for (let x = canvas.width - 1; x >= 0; x--) {
        for (let y = top; y < canvas.height; y++) {
          if (!isValidAlpha(x, y)) {
            return x === canvas.width ? canvas.width : x + 1;
          }
        }
      }
      return canvas.width;
    };

    const getBottomLimit = (right: number) => {
      for (let y = canvas.height - 1; y >= 0; y--) {
        for (let x = 0; x < right; x++) {
          if (!isValidAlpha(x, y)) {
            return y === canvas.height ? canvas.height : y + 1;
          }
        }
      }
      return canvas.height;
    };

    const getLeftLimit = (top: number, bottom: number) => {
      for (let x = 0; x < canvas.width; x++) {
        for (let y = top; y < bottom; y++) {
          if (!isValidAlpha(x, y)) return x;
        }
      }
      return 0;
    };

    const top = getTopLimit();
    const right = getRightLimit(top);
    const bottom = getBottomLimit(right);
    const left = getLeftLimit(top, bottom);

    return { top, bottom, left, right };
  }

  private fitCss(canvas: HTMLCanvasElement) {
    if (canvas.width > canvas.height) {
      canvas.classList.add("img-fit-width");
      canvas.classList.remove("img-fit-height");
    } else {
      canvas.classList.remove("img-fit-width");
      canvas.classList.add("img-fit-height");
    }
  }
}
