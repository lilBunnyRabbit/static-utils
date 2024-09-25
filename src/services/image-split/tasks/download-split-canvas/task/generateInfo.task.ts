import { createTask } from "@lilbunnyrabbit/task-manager";
import { DownloadSplitCanvasConfig } from "..";
import { ImageFile } from "@/helpers/image-file";

export default createTask<
  { config: DownloadSplitCanvasConfig; imageFile: ImageFile },
  { information: string; totalFiles: number }
>({
  name: "Generate Info",

  parse() {
    switch (this.status) {
      default:
      case "idle": {
        return {
          status: "Generate Info",
        };
      }
      case "in-progress": {
        return {
          status: "Calculating...",
        };
      }
      case "error": {
        return {
          status: "Failed to calculate...",
        };
      }
      case "success": {
        if (this.result.isPresent()) {
          return {
            status: "Generated information",
            result: this.result.get().information,
          };
        }

        return {
          status: "No result.",
        };
      }
    }
  },

  async execute({ config, imageFile: { file, image } }) {
    const totalFiles = config.rows * config.columns;

    const information = `File Information:
-----------------
Name:             ${file.name}
Type:             ${file.type || "Unknown"}
Size:             ${(file.size / 1024).toFixed(2)} KB
Last Modified:    ${new Date(file.lastModified).toLocaleString()}

Image Information:
------------------
Source:           ${image.src}
Alt Text:         ${image.alt || "N/A"}
Natural Size:     ${image.naturalWidth} × ${image.naturalHeight} px
Display Size:     ${image.width} × ${image.height} px
    
Total Files:      ${totalFiles}
File Dimensions:  ${config.size} × ${config.size} px

Continue?`;

    this.manager.stop();

    return { information, totalFiles };
  },
});
