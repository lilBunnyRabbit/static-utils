import React from "react";
import { ImageFile } from "./image-file";

export function useImageFileClipboard(callback: (imageFiles: ImageFile[]) => void) {
  React.useEffect(() => {
    let pasteEnabled = true;

    const handlePaste = async (event: ClipboardEvent) => {
      if (!pasteEnabled) return;
      pasteEnabled = false;

      await ImageFile.fromClipboardEvent(event)
        .then((imageFiles) => imageFiles.length && callback(imageFiles))
        .catch((e: string) => {
          // createNotification({ title: "Paste Error", description: e, type: "error" });
          console.error(e);
        });

      pasteEnabled = true;
    };

    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [callback]);
}

function hasFiles(event: DragEvent): boolean {
  const types = event.dataTransfer?.types;
  return !!types && Array.from(types).includes("Files");
}

export function useImageFileDrop<Element extends HTMLElement = HTMLElement>(
  callback: (imageFiles: ImageFile[]) => void
) {
  const [activeDrag, setActiveDrag] = React.useState(false);

  const ref = React.useRef<Element>(null);

  const handleDrag = React.useCallback((event: DragEvent) => {
    // Only react to external file drags; leave in-page drag & drop (e.g. list reordering) alone.
    if (!hasFiles(event)) return;

    event.preventDefault();

    if (event.type === "dragenter" || event.type === "dragover") {
      setActiveDrag(true);
    } else if (event.type === "dragleave") {
      setActiveDrag(false);
    }
  }, []);

  const handleDrop = React.useCallback(async (event: DragEvent) => {
    if (!hasFiles(event)) return;

    event.preventDefault();

    setActiveDrag(false);

    if (event?.dataTransfer?.files) {
      const imageFiles = await ImageFile.fromList(event.dataTransfer.files);
      if (imageFiles.length) {
        callback(imageFiles);
      }
    }
  }, []);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return console.error("Missing ref.");

    element.addEventListener("dragenter", handleDrag);
    element.addEventListener("dragleave", handleDrag);
    element.addEventListener("dragover", handleDrag);
    element.addEventListener("drop", handleDrop);

    return () => {
      element.removeEventListener("dragenter", handleDrag);
      element.removeEventListener("dragleave", handleDrag);
      element.removeEventListener("dragover", handleDrag);
      element.removeEventListener("drop", handleDrop);

      setActiveDrag(false);
    };
  }, [ref, handleDrag, handleDrop]);

  return [
    ref,
    {
      activeDrag,
    },
  ] as const;
}
