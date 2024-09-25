import { sleep } from "@/components/tmp/misc.util";
import { ImageFile } from "@/helpers/image-file";
import { createTask } from "@lilbunnyrabbit/task-manager";
import type JSZip from "jszip";
import { DownloadSplitCanvasConfig, DownloadSplitCanvasTask } from "..";

export default createTask<{ config: DownloadSplitCanvasConfig; imageFile: ImageFile }, JSZip>({
  name: "Create and ZIP files",

  parse() {
    switch (this.status) {
      default:
      case "idle": {
        return {
          status: "Create and ZIP files",
        };
      }
      case "in-progress": {
        return {
          status: "Adding images to zip...",
        };
      }
      case "error": {
        return {
          status: "Failed to add...",
        };
      }
      case "success": {
        if (this.result.isPresent()) {
          const result = this.result.get();

          return {
            status: "Images added",
            result: `Zip (${Object.keys(result.files).length} files)`,
          };
        }

        return {
          status: "No result.",
        };
      }
    }
  },

  async execute({ config, imageFile: { image } }) {
    const { totalFiles } = this.manager.getTaskResult(DownloadSplitCanvasTask.GenerateInfo);
    const zip = this.manager.getTaskResult(DownloadSplitCanvasTask.CreateZip);
    const { canvas, ctx } = this.manager.getTaskResult(DownloadSplitCanvasTask.CreateCanvas);

    this.addWarning(
      "`toDataURL()` encodes the whole image in an in-memory string. For larger images, this can have performance implications, and may even overflow browsers' URL length limit when assigned to `HTMLImageElement.src`. You should generally prefer `toBlob()` instead, in combination with `URL.createObjectURL()`."
    );
    this.addWarning("Test test");

    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.columns; c++) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
          image,
          c * config.size,
          r * config.size,
          config.size,
          config.size,
          0,
          0,
          config.size,
          config.size
        );

        const fileNumber = r * config.columns + c + 1;
        const fullName = `${config.filename}_${fileNumber}.png`;

        // TODO: Replace with blob
        const data = canvas.toDataURL("image/png").replace("data:image/png;base64,", "");
        zip.file(fullName, data, { base64: true });

        this.setProgress(fileNumber / totalFiles);

        await sleep(0);
      }
    }

    this.addError(new Error("Sorry just need to test this..."));
    this.addError(new Error("Sorry just need to test this..."));
    this.addError(new Error("Sorry just need to test this..."));
    this.addError(new Error("Sorry just need to test this..."));
    this.addError(new Error("Sorry just need to test this..."));

    return zip;
  },
});
