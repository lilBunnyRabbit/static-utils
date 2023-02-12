import { getImageFromClipboard, getImagesFromInput } from "./event.util";
import { createNotification } from "./notification.util";

export function debounce<T extends any[]>(callback: (...args: T) => any, timeout = 250) {
  let timer: NodeJS.Timeout;

  return (...args: T) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback.apply(this, args), timeout);
  };
}

export function usePasteImage(callback: (image: HTMLImageElement) => void) {
  let isPasteEnabled = true;
  document.addEventListener("paste", async (event) => {
    if (!isPasteEnabled) return;
    isPasteEnabled = false;

    await getImageFromClipboard(event)
      .then(callback)
      .catch((e: string) => {
        createNotification({ title: "Paste Error", description: e, type: "error" });
        console.error(e);
      });

    isPasteEnabled = true;
  });
}

export function useUploadImages(element: HTMLInputElement | HTMLElement, callback: (images: HTMLImageElement[]) => void) {
  element.addEventListener("change", (e) => {
    getImagesFromInput(e.target as HTMLInputElement)
      .then(callback)
      .catch((e: string) => {
        createNotification({ title: "Upload Error", description: e, type: "error" });
        console.error(e);
      });
  });
}
