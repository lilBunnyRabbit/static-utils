import "./index.scss";
import { getImageFromClipboard } from "../../utils/event.util";
import { CanvasRenderer } from "../../utils/canvas.util";

const $sidebar = document.getElementById("sidebar");

const { State, StateElement, StateComponent } = (window as any).lilState;

const renderer = new CanvasRenderer(document.getElementById("canvas") as HTMLCanvasElement);
const { canvas, ctx } = renderer;

const state = new State({
  useChangeEvent: false,
  useLogs: true,
});

const sImages = state
  .init("images", {
    defaultValue: [],
    config: {
      useLocalStorage: false,
      useEvents: true,
      onBeforeSet: null,
    },
  })
  .addListener((images: HTMLImageElement[]) => {
    $sidebar.innerHTML = "";

    console.log({ images });

    renderer.clear();

    let maxWidth = 0;
    let height = 0;

    images.forEach((image) => {
      if (image.width > maxWidth) maxWidth = image.width;
      height += image.height;
    });

    canvas.width = maxWidth;
    canvas.height = height;

    images.reduce((prev, image) => {
      ctx.drawImage(image, 0, prev);
      return prev + image.height;
    }, 0);

    images.forEach((image) => {
      $sidebar.appendChild(image);
    });
  });

let isPasteEnabled = true;
document.onpaste = async (event) => {
  if (!isPasteEnabled) return;
  isPasteEnabled = false;

  return getImageFromClipboard(event)
    .then((image) => {
      sImages.set([...sImages.get(), image]);
      isPasteEnabled = true;
    })
    .catch(console.error);
};
