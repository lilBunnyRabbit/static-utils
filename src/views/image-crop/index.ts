import "../../scripts/init";
import { themeState } from "../../scripts/init";
import { CanvasRenderer } from "../../utils/canvas.util";
import { debounce, usePasteImage, useUploadImages } from "../../utils/input.util";
import "./index.scss";

const SColors = themeState.attach("colors");

console.log({ SColors });

const { State, StateComponent } = (window as any).lilState;

namespace ImageCropState {
  export type History = HTMLImageElement[];
  export type Image = HTMLImageElement | null;
  export type Configuration = {
    alpha: number;
  };
}

const state = new State(
  {
    prefix: "static-utils:image-crop",
    useChangeEvent: false,
    useLogs: true,
    useRefetchOnFocus: true,
  },
  {
    config: {
      defaultValue: {
        alpha: 0,
      } satisfies ImageCropState.Configuration,
      config: {
        useLocalStorage: false,
        useEvents: true,
        onBeforeSet: null,
        useRefetchOnFocus: false,
      },
    },
    image: {
      defaultValue: null satisfies ImageCropState.Image,
      config: {
        useLocalStorage: false,
        useEvents: true,
        onBeforeSet: null,
        useRefetchOnFocus: false,
      },
    },
    history: {
      defaultValue: [] satisfies ImageCropState.History,
      config: {
        useLocalStorage: false,
        useEvents: true,
        onBeforeSet: null,
        useRefetchOnFocus: false,
      },
    },
  }
);

const $canvasOriginal = document.getElementById("canvas-original") as HTMLCanvasElement;
const $canvas = document.getElementById("canvas-cropped") as HTMLCanvasElement;

const $infoOriginalSize = document.getElementById("info-original-size") as HTMLSpanElement;
const $infoCroppedSize = document.getElementById("info-cropped-size") as HTMLSpanElement;

const $inputAlpha = document.getElementById("i-alpha") as HTMLInputElement;

class App extends StateComponent {
  private originalRenderer!: CanvasRenderer;
  private renderer!: CanvasRenderer;

  constructor() {
    super(state, true);

    this.originalRenderer = new CanvasRenderer($canvasOriginal);
    this.renderer = new CanvasRenderer($canvas);

    usePasteImage((image) => {
      this.states.image.set(image || null);
    });

    useUploadImages(document.getElementById("i-image"), (images) => {
      if (images.length === 0) return;
      this.states.image.set(images[0] || null);
    });

    SColors.addListener(() => this.render());

    this.initInputs();
  }

  private initInputs() {
    const config: ImageCropState.Configuration = this.states.config.get();

    $inputAlpha.value = String(config.alpha);
    $inputAlpha.addEventListener(
      "input",
      debounce((e) => {
        this.states.config.set({
          ...this.states.config.get(),
          alpha: (e.target as HTMLInputElement).valueAsNumber,
        });
      }, 250)
    );
  }

  $onStateChange(key: string, value: unknown) {
    switch (key) {
      case "config":
        this.render();
        break;

      case "image":
        if (value as ImageCropState.Image) {
          $canvas.classList.contains("hidden") && $canvas.classList.remove("hidden");
          $canvasOriginal.classList.contains("hidden") && $canvasOriginal.classList.remove("hidden");
        } else {
          !$canvas.classList.contains("hidden") && $canvas.classList.add("hidden");
          !$canvasOriginal.classList.contains("hidden") && $canvasOriginal.classList.add("hidden");
        }

        this.render();
        break;

      case "history":
        break;

      default:
        break;
    }
  }

  private getCropLimits(renderer: CanvasRenderer, alphaLimit = 0) {
    const { canvas, ctx } = renderer;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    const getAlpha = (x: number, y: number) => data[(y * canvas.width + x) * 4 + 3];

    const getTopLimit = () => {
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          if (getAlpha(x, y) > alphaLimit) return y;
        }
      }
      return 0;
    };

    const getRightLimit = (top: number) => {
      for (let x = canvas.width - 1; x >= 0; x--) {
        for (let y = top; y < canvas.height; y++) {
          if (getAlpha(x, y) > alphaLimit) {
            return x === canvas.width ? canvas.width : x + 1;
          }
        }
      }
      return canvas.width;
    };

    const getBottomLimit = (right: number) => {
      for (let y = canvas.height - 1; y >= 0; y--) {
        for (let x = 0; x < right; x++) {
          if (getAlpha(x, y) > alphaLimit) {
            return y === canvas.height ? canvas.height : y + 1;
          }
        }
      }
      return canvas.height;
    };

    const getLeftLimit = (top: number, bottom: number) => {
      for (let x = 0; x < canvas.width; x++) {
        for (let y = top; y < bottom; y++) {
          if (getAlpha(x, y) > alphaLimit) return x;
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

  private render() {
    const config: ImageCropState.Configuration = this.states.config.get();
    const image: ImageCropState.Image = this.states.image.get();
    if (!image) return;
    this.renderer.clear();
    this.originalRenderer.clear();

    const { canvas: originalCanvas, ctx: originalCtx } = this.originalRenderer;

    originalCanvas.width = image.width;
    originalCanvas.height = image.height;
    originalCtx.drawImage(image, 0, 0);

    const limits = this.getCropLimits(this.originalRenderer, (config.alpha * 255) / 100);
    console.log(limits);

    originalCtx.fillStyle = SColors.get()?.["primary"];
    originalCtx.fillRect(0, 0, originalCanvas.width, limits.top); // Top
    originalCtx.fillRect(
      limits.right,
      limits.top,
      originalCanvas.width - limits.right,
      originalCanvas.height - limits.top
    ); // Right
    originalCtx.fillRect(0, limits.bottom, limits.right, originalCanvas.height - limits.bottom); // Bottom
    originalCtx.fillRect(0, limits.top, limits.left, limits.bottom - limits.top); // Left

    const { canvas, ctx } = this.renderer;

    canvas.width = limits.right - limits.left;
    canvas.height = limits.bottom - limits.top;

    ctx.drawImage(image, limits.left, limits.top, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);

    $infoOriginalSize.innerText = `${originalCanvas.width}x${originalCanvas.height}`;
    $infoCroppedSize.innerText = `${canvas.width}x${canvas.height}`;
  }
}

new App();
