import "../../scripts/init";
import "./index.scss";
import { getImageFromClipboard, getImagesFromInput } from "../../utils/event.util";
import { CanvasRenderer } from "../../utils/canvas.util";
import { debounce } from "../../utils/input.util";
import { alphaToHex } from "../../utils/number.util";
import { t } from "../../utils/template.util";
import { createNotification } from "../../utils/notification.util";

console.log(
  "%cTODO:%c" +
    `
• Input design
• Image sorting
`,
  "font-weight: bold; font-size: 18px",
  "font-size: 14px"
);

const { State, StateComponent } = (window as any).lilState;

namespace State {
  export type Images = HTMLImageElement[];
  export type Configuration = {
    gap: number;
    align: "left" | "center" | "right";
    background: string;
    alpha: number;
    fit: boolean;
  };
}

const state = new State(
  {
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
        align: "left",
        background: "#ffffff",
        alpha: 0,
        fit: false,
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
<button class="delete-image">
  <div class="delete-image-overlay">
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  </div>
</button>
`;

const $sidebar = document.getElementById("sidebar");
const $canvasWrapper = document.getElementById("canvas-wrapper") as HTMLDivElement;
const $canvas = document.getElementById("canvas") as HTMLCanvasElement;

const $inputZoom = document.getElementById("i-zoom") as HTMLInputElement;
const $inputGap = document.getElementById("i-gap") as HTMLInputElement;
const $inputAlign = document.getElementById("i-align") as HTMLInputElement;
const $inputBackground = document.getElementById("i-background") as HTMLInputElement;
const $inputAlpha = document.getElementById("i-alpha") as HTMLInputElement;
const $inputFit = document.getElementById("i-fit") as HTMLInputElement;
const $inputImage = document.getElementById("i-image") as HTMLInputElement;

class App extends StateComponent {
  private renderer!: CanvasRenderer;

  constructor() {
    super(state, true);

    this.renderer = new CanvasRenderer($canvas);

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

    $inputZoom.addEventListener("input", (e) => {
      $canvasWrapper.style.maxWidth = `${(e.target as HTMLInputElement).value}%`;
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

  render() {
    $sidebar.innerHTML = "";

    const images: State.Images = this.states.images.get();
    const config: State.Configuration = this.states.config.get();

    if (config.alpha <= 0) this.renderer.clear();

    if (config.fit) this.renderFit(images, config);
    else this.renderNormal(images, config);

    images.forEach((image, i) => {
      const $deleteImage = tDeleteImage.clone();
      const $button = $deleteImage.querySelector("button");
      $button.appendChild(image);
      $button.addEventListener("click", () => {
        const newImages = this.states.images.get();
        newImages.splice(i, 1);
        this.states.images.set(newImages);
      });
      $sidebar.appendChild($deleteImage);
    });
  }

  renderNormal(images: State.Images, config: State.Configuration) {
    const { canvas, ctx } = this.renderer;

    let maxWidth = 0;
    let height = Math.max(0, images.length - 1) * config.gap;

    images.forEach((image) => {
      if (image.width > maxWidth) maxWidth = image.width;
      height += image.height;
    });

    canvas.width = maxWidth;
    canvas.height = height;

    if (config.alpha > 0) this.renderer.fill(`${config.background}${alphaToHex(config.alpha)}`);

    images.reduce((prev, image, i) => {
      let dx = 0;
      if (config.align === "center") dx = canvas.width / 2 - image.width / 2;
      else if (config.align === "right") dx = canvas.width - image.width;

      ctx.drawImage(image, dx, prev);
      return prev + image.height + config.gap;
    }, 0);
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
