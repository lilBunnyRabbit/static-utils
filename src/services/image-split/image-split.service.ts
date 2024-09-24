import { ImageFile } from "@/helpers/image-file";
import React from "react";

export interface ImageSplitServiceSettings {
  direction: "x" | "y";
  multiplier: number;
}

export class ImageSplitService {
  static DEFAULT_SETTINGS: ImageSplitServiceSettings = {
    direction: "x",
    multiplier: 1,
  };

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(readonly debug = true) {}

  private log() {
    if (!this.debug) return;
    console.log("ImageSplitService", this.log.prototype);
  }

  public bind(ref: React.RefObject<HTMLCanvasElement>) {
    const canvas = ref.current;
    if (!canvas) {
      throw new Error("Missing canvas ref.");
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    return this;
  }

  public render({ image }: ImageFile, settings: ImageSplitServiceSettings = ImageSplitService.DEFAULT_SETTINGS) {
    this.log();
    if (!this.canvas || !this.ctx) return;

    let size = 0;
    let columns = 0;
    let rows = 0;

    if (settings.direction === "x") {
      columns = settings.multiplier;
      size = image.width / columns;
      rows = Math.ceil(image.height / size);
    } else {
      rows = settings.multiplier;
      size = image.height / rows;
      columns = Math.ceil(image.width / size);
    }

    let gap = size / 10;
    if (gap < 5) gap = 5;
    else if (gap > 15) gap = 15;

    this.canvas.width = columns * size + (columns - 1) * gap;
    this.canvas.height = rows * size + (rows - 1) * gap;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        this.ctx.drawImage(image, c * size, r * size, size, size, c * (size + gap), r * (size + gap), size, size);
      }
    }

    return {
      columns,
      rows,
      size,
    };
  }

  /*
      downloadSplitCanvas() {
      const filename = document.getElementById("filename").value;

      const [canvas, ctx] = createCanvas();

      canvas.width = this.size;
      canvas.height = this.size;

      let totalFiles = this.rows * this.columns + 1;

      const zip = new JSZip();

      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.columns; c++) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(
            this.image,
            c * this.size,
            r * this.size,
            this.size,
            this.size,
            0,
            0,
            this.size,
            this.size
          );

          const fileNumber = r * this.columns + c + 1;
          const fullName = `${filename}_${fileNumber}.png`;

          const data = canvas
            .toDataURL("image/png")
            .replace("data:image/png;base64,", "");
          zip.file(fullName, data, { base64: true });

          this.addToDownladList(`Created ${fullName}`);
          this.updateDownloadBar((fileNumber * 50) / totalFiles);
        }
      }

      zip.file("example.txt", this.createEmojiData(filename));
      this.addToDownladList("Created example.txt");
      this.updateDownloadBar(50);

      this.addToDownladList("Creating zip...");

      let zipDone = false;
      let lastFile;

      return zip
        .generateAsync({ type: "blob" }, ({ currentFile, percent }) => {
          if (currentFile) {
            if (currentFile != lastFile) {
              this.addToDownladList(`Zipped ${currentFile}`);
              lastFile = currentFile;
            }
            this.updateDownloadBar(50 + percent / 2);
          } else if (!zipDone) {
            this.addToDownladList("Creating download link...");
            zipDone = true;
          }
        })
        .then((blob) => {
          const link = document.createElement("a");
          link.classList = "download-link";
          link.target = "_blank";
          link.href = window.URL.createObjectURL(blob);
          link.download = filename;
          link.innerText = `${filename}.zip`;
          link.onclick = this.handleReturnFromDownload;
          this.addToDownladList(link);

          document.getElementById("download-back-button").style.display =
            "flex";
        });
    }
  */
}
