import "../../scripts/init";
import "./index.scss";
import { getImageFromClipboard, getImagesFromInput } from "../../utils/event.util";
import { CanvasRenderer } from "../../utils/canvas.util";
import { debounce } from "../../utils/input.util";
import { alphaToHex } from "../../utils/number.util";
import { t } from "../../utils/template.util";
import { createNotification } from "../../utils/notification.util";
import { printTodo } from "../../utils/misc.util";

printTodo(["Input design", "[WIP] Image sorting"]);

const { State, StateComponent } = (window as any).lilState;

namespace State {
  export type Images = HTMLImageElement[];
  export type Configuration = {
    gap: number;
    align: "start" | "center" | "end";
    background: string;
    alpha: number;
    fit: boolean;
    direction: "column" | "row";
  };
}

const state = new State(
  {
    prefix: "static-utils:image-concat",
    useChangeEvent: false,
    useLogs: true,
  },
  {
    images: {
      defaultValue: [] satisfies State.Images,
      config: {
        useLocalStorage: false,
        useEvents: true,
        onBeforeSet: null,
      },
    },
    config: {
      defaultValue: {
        gap: 0,
        align: "start",
        background: "#ffffff",
        alpha: 0,
        fit: false,
        direction: "column",
      } satisfies State.Configuration,
      config: {
        useLocalStorage: true,
        useEvents: true,
        onBeforeSet: null,
      },
    },
  }
);

const tDeleteImage = t`
<button class="delete-image" draggable="true">
  <div class="delete-image-overlay error">
    <svg data-icon="error" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>

    <svg data-icon="drag" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      class="feather feather-menu">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  </div>
</button>
`;

const $sidebar = document.getElementById("sidebar");
const $root = document.getElementById("root") as HTMLDivElement;
const $canvasWrapper = document.getElementById("canvas-wrapper") as HTMLDivElement;
const $canvas = document.getElementById("canvas") as HTMLCanvasElement;

const $inputZoom = document.getElementById("i-zoom") as HTMLInputElement;
const $inputGap = document.getElementById("i-gap") as HTMLInputElement;
const $inputAlign = document.getElementById("i-align") as HTMLInputElement;
const $inputBackground = document.getElementById("i-background") as HTMLInputElement;
const $inputAlpha = document.getElementById("i-alpha") as HTMLInputElement;
const $inputFit = document.getElementById("i-fit") as HTMLInputElement;
const $inputDirection = document.getElementById("i-direction") as HTMLInputElement;
const $inputImage = document.getElementById("i-image") as HTMLInputElement;

class App extends StateComponent {
  private renderer!: CanvasRenderer;

  constructor() {
    super(state, true);

    this.renderer = new CanvasRenderer($canvas);

    this.states.images.set(
      Array(3)
        .fill(0)
        .map((_, i) => {
          const image = new Image();
          image.src =
            i % 2 === 0
              ? "https://www.slovenskenovice.si/media/images/20220118/1113750.2e16d0ba.fill-256x256.jpg"
              : "https://www.tastingtable.com/img/gallery/why-artificial-banana-flavor-doesnt-taste-like-the-real-thing/intro-1660147847.jpg";
          return image;
        })
    );

    let isPasteEnabled = true;
    document.addEventListener("paste", async (event) => {
      if (!isPasteEnabled) return;
      isPasteEnabled = false;

      await getImageFromClipboard(event)
        .then((image) => this.states.images.set([...this.states.images.get(), image]))
        .catch((e: string) => {
          createNotification({ title: "Paste Error", description: e, type: "error" });
          console.error(e);
        });

      isPasteEnabled = true;
    });

    $inputImage.addEventListener("change", (e) => {
      getImagesFromInput(e.target as HTMLInputElement)
        .then((images) => this.states.images.set([...this.states.images.get(), ...images]))
        .catch((e: string) => {
          createNotification({ title: "Upload Error", description: e, type: "error" });
          console.error(e);
        });
    });

    this.initInputs();
  }

  private initInputs() {
    const config: State.Configuration = this.states.config.get();

    const updateZoom = (value: number | string, direction: State.Configuration["direction"]) => {
      const percentage = `${value}%`;
      if (direction === "column") {
        $canvasWrapper.style.maxWidth = percentage;
        $canvasWrapper.style.maxHeight = null;
      } else {
        $canvasWrapper.style.maxWidth = null;
        $canvasWrapper.style.maxHeight = percentage;
      }
    };

    $inputZoom.addEventListener("input", (e) => {
      updateZoom((e.target as HTMLInputElement).value, this.states.config.get().direction);
    });

    $inputGap.value = String(config.gap);
    $inputGap.addEventListener(
      "input",
      debounce((e) => {
        this.states.config.set({
          ...this.states.config.get(),
          gap: (e.target as HTMLInputElement).valueAsNumber,
        });
      }, 250)
    );

    $inputAlign.value = config.align;
    $inputAlign.addEventListener("change", (e) => {
      this.states.config.set({
        ...this.states.config.get(),
        align: (e.target as HTMLInputElement).value,
      });
    });

    $inputBackground.value = config.background;
    $inputBackground.addEventListener(
      "input",
      debounce((e) => {
        this.states.config.set({
          ...this.states.config.get(),
          background: (e.target as HTMLInputElement).value,
        });
      }, 150)
    );

    $inputAlpha.value = String(config.alpha);
    $inputAlpha.addEventListener(
      "input",
      debounce((e) => {
        this.states.config.set({
          ...this.states.config.get(),
          alpha: (e.target as HTMLInputElement).valueAsNumber,
        });
      }, 150)
    );

    $inputFit.checked = config.fit;
    $inputFit.addEventListener("change", (e) => {
      this.states.config.set({
        ...this.states.config.get(),
        fit: !!(e.target as HTMLInputElement).checked,
      });
    });

    $inputDirection.checked = config.direction === "row";
    $root.setAttribute("data-direction", config.direction);
    $inputDirection.addEventListener("change", (e) => {
      const direction = (e.target as HTMLInputElement).checked ? "row" : "column";
      this.states.config.set({ ...this.states.config.get(), direction });
      $root.setAttribute("data-direction", direction);

      updateZoom($inputZoom.value, direction);
    });

    updateZoom($inputZoom.value, config.direction);
  }

  $onStateChange(key: string) {
    switch (key) {
      case "images":
      case "config":
        this.render();
        break;

      default:
        break;
    }
  }

  updateCanvasSize(images: State.Images, config: State.Configuration) {
    let size = { width: 0, height: 0 };

    if (config.direction === "column") {
      let maxWidth = 0;
      let height = Math.max(0, images.length - 1) * config.gap;

      images.forEach((image) => {
        if (image.width > maxWidth) maxWidth = image.width;
        height += image.height;
      });

      size = { width: maxWidth, height };
    } else {
      let width = Math.max(0, images.length - 1) * config.gap;
      let maxHeight = 0;

      images.forEach((image) => {
        if (image.height > maxHeight) maxHeight = image.height;
        width += image.width;
      });

      size = { width, height: maxHeight };
    }

    this.renderer.canvas.width = size.width;
    this.renderer.canvas.height = size.height;
  }

  clearCanvas(config: State.Configuration) {
    if (config.alpha > 0) this.renderer.fill(`${config.background}${alphaToHex(config.alpha)}`);
    else this.renderer.clear();
  }

  updateImagesToFit(images: State.Images, config: State.Configuration) {
    const { canvas } = this.renderer;

    let imageSizes: Array<{ width: number; height: number }> = [];

    if (config.direction === "column") {
      let height = Math.max(0, images.length - 1) * config.gap;

      imageSizes = images.map((image) => {
        const h = canvas.width * (image.height / image.width);
        height += h;
        return { width: canvas.width, height: h };
      });

      canvas.height = height;
    } else {
      let width = Math.max(0, images.length - 1) * config.gap;

      imageSizes = images.map((image) => {
        const w = canvas.height * (image.width / image.height);
        width += w;
        return { width: w, height: canvas.height };
      });

      canvas.width = width;
    }

    this.clearCanvas(config);

    return imageSizes;
  }

  drawImages(images: State.Images, config: State.Configuration) {
    const { canvas, ctx } = this.renderer;

    if (config.fit) {
      const imageSizes = this.updateImagesToFit(images, config);

      images.reduce((prev, image, i) => {
        if (config.direction === "column") {
          ctx.drawImage(image, 0, prev, canvas.width, imageSizes[i].height);
          return prev + imageSizes[i].height + config.gap;
        } else {
          ctx.drawImage(image, prev, 0, imageSizes[i].width, canvas.height);
          return prev + imageSizes[i].width + config.gap;
        }
      }, 0);
    } else {
      images.reduce((prev, image, i) => {
        if (config.direction === "column") {
          let dx = 0;
          if (config.align === "center") dx = canvas.width / 2 - image.width / 2;
          else if (config.align === "end") dx = canvas.width - image.width;

          ctx.drawImage(image, dx, prev);
          return prev + image.height + config.gap;
        } else {
          let dy = 0;
          if (config.align === "center") dy = canvas.height / 2 - image.height / 2;
          else if (config.align === "end") dy = canvas.height - image.height;

          ctx.drawImage(image, prev, dy);
          return prev + image.width + config.gap;
        }
      }, 0);
    }
  }

  render() {
    $sidebar.innerHTML = "";

    const images: State.Images = this.states.images.get();
    const config: State.Configuration = this.states.config.get();

    this.updateCanvasSize(images, config);
    this.clearCanvas(config);
    this.drawImages(images, config);

    images.forEach((image, i) => {
      const $deleteImage = tDeleteImage.clone();
      const $button = $deleteImage.querySelector("button");
      $button.appendChild(image);
      $button.addEventListener("click", () => {
        const newImages = this.states.images.get();
        newImages.splice(i, 1);
        this.states.images.set(newImages);
      });

      $button.addEventListener("dragstart", () => $button.classList.add("is-dragging"));
      $button.addEventListener("dragend", () => $button.classList.remove("is-dragging"));

      $sidebar.appendChild($deleteImage);
    });
  }

  renderFit(images: State.Images, config: State.Configuration) {
    const { canvas, ctx } = this.renderer;

    let maxWidth = 0;
    let height = Math.max(0, images.length - 1) * config.gap;

    images.forEach((image) => {
      if (image.width > maxWidth) maxWidth = image.width;
    });

    const imagesHeights = images.map((image) => {
      const h = maxWidth * (image.height / image.width);
      height += h;
      return h;
    });

    canvas.width = maxWidth;
    canvas.height = height;

    if (config.alpha > 0) this.renderer.fill(`${config.background}${alphaToHex(config.alpha)}`);

    images.reduce((prev, image, i) => {
      ctx.drawImage(image, 0, prev, canvas.width, imagesHeights[i]);
      return prev + imagesHeights[i] + config.gap;
    }, 0);
  }
}

new App();
