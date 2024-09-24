import { fileToImage } from "@/utils/file.util";
import { ChangeEvent } from "react";

export class ImageFile {
  private constructor(
    readonly file: File,
    readonly image: HTMLImageElement
  ) {}

  static async fromFile(file: File): Promise<ImageFile | null> {
    if (!file.type.match("^image/")) return null;

    const image = await fileToImage(file);
    if (!image) return null;

    return new ImageFile(file, image);
  }

  static async fromList(list?: null | FileList | DataTransferItemList) {
    if (!list) return [];

    const files: File[] = [];

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!item) continue;

      if (item instanceof File) {
        files.push(item);
      } else if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    return (await Promise.all(
      files
        .map(async (file) => {
          return await ImageFile.fromFile(file).catch((error) => {
            console.error(error);
            return null;
          });
        })
        .filter(Boolean)
    )) as ImageFile[];
  }

  static async fromClipboardEvent(event: ClipboardEvent): Promise<ImageFile[]> {
    return await ImageFile.fromList(event.clipboardData?.items);
  }

  static async fromChangeEvent(event: ChangeEvent<HTMLInputElement>): Promise<ImageFile[]> {
    return await ImageFile.fromList((event.target as HTMLInputElement).files);
  }

  static fromUpload(callback: (imageFiles: ImageFile[]) => void) {
    return async (event: ChangeEvent<HTMLInputElement>) => {
      return ImageFile.fromChangeEvent(event)
        .then(callback)
        .catch((error) => console.error(error));
    };
  }
}
