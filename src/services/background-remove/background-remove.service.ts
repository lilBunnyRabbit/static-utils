import { ImageFile } from "@/helpers/image-file";
import { RGB255 } from "@/utils/color.util";

export interface BackgroundRemoveServiceSettings {
  alphaLimit: number;
  colors: string[];
}

export class BackgroundRemoveService {
  static DEFAULT_SETTINGS: BackgroundRemoveServiceSettings = {
    alphaLimit: 1,
    colors: ["#ffffff"],
  };

  private canvas: Record<"original" | "cropped", HTMLCanvasElement> | null = null;
  private ctx: Record<"original" | "cropped", CanvasRenderingContext2D> | null = null;

  constructor(readonly debug = true) {}

  private log() {
    if (!this.debug) return;
    console.log("BackgroundRemoveService", this.log.prototype);
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

  public async render(imageFile: ImageFile, settings: BackgroundRemoveServiceSettings = { colors: [], alphaLimit: 1 }) {
    this.log();
    if (!this.canvas || !this.ctx) return;

    const { image } = imageFile;

    this.canvas.original.width = image.width;
    this.canvas.original.height = image.height;

    this.ctx.original.clearRect(0, 0, this.canvas.original.width, this.canvas.original.height);
    this.ctx.original.drawImage(image, 0, 0);

    this.canvas.cropped.width = image.width;
    this.canvas.cropped.height = image.height;

    this.ctx.cropped.clearRect(0, 0, this.canvas.original.width, this.canvas.original.height);
    this.ctx.cropped.drawImage(image, 0, 0);

    this.removePixels(this.ctx.cropped, settings);

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

  // TODO: This badly needs @lilbunnyrabbit/chromatics
  private removePixels(ctx: CanvasRenderingContext2D, settings: BackgroundRemoveServiceSettings) {
    const canvas = ctx.canvas;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    const colors = settings.colors.map((color) => RGB255.fromHex(color));

    const removeIfMatch = (x: number, y: number) => {
      const startIndex = (y * canvas.width + x) * 4;
      const alpha = data[startIndex + 3];

      if (alpha) {
        const rgb = new RGB255(data[startIndex], data[startIndex + 1], data[startIndex + 2]);
        const isMatch = colors.some((color) => color.equals(rgb));

        if (isMatch) {
          ctx.clearRect(x, y, 1, 1);
        } else {
          return false;
        }
      }

      return true;
    };

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        removeIfMatch(x, y);
      }
    }
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
