const isFileImage = (file: File) => {
  return file && file["type"].split("/")[0] === "image";
};

export const getImageFromClipboard = async (event: ClipboardEvent): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    let imageBlob: Blob;

    const items = event.clipboardData.items;
    for (const index in items) {
      const item = items[index];
      if (!item || item.kind !== "file") continue;

      const blob = item.getAsFile();
      if (!isFileImage(blob)) continue;

      imageBlob = blob;
      break;
    }

    if (!imageBlob) return reject("No image in the clipboard.");

    const image = new Image();

    image.onload = () => resolve(image);
    image.src = URL.createObjectURL(imageBlob);
  });
};

export const getImagesFromInput = async (element: HTMLInputElement): Promise<HTMLImageElement[]> => {
  const files = element.files;
  if (!files) throw "No files.";
  
  return await Promise.all<HTMLImageElement | null>(
    Array.from(files)
      .map(async (file) => {
        if (!file || !isFileImage(file)) return null;

        return await new Promise<HTMLImageElement | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const image = new Image();

            image.onload = () => resolve(image);
            image.src = String(reader.result);
          };
          reader.readAsDataURL(file);
        }).catch((error) => {
          console.error(error);
          return null;
        });
      })
      .filter((file) => file)
  );
};
