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

    if (!imageBlob) return reject("No image in clipboard.");

    const image = new Image();

    image.onload = () => resolve(image);
    image.src = URL.createObjectURL(imageBlob);
  });
};
