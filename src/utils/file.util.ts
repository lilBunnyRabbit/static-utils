export const isFileImage = (file: File | null): file is File => {
  return !!file && file["type"].split("/")[0] === "image";
};

export async function fileToImage(file: File | null): Promise<HTMLImageElement> {
  if (!isFileImage(file)) throw new Error("File not image.");

  return await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}
