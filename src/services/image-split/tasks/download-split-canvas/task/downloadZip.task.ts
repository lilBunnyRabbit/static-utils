import { createTask } from "@lilbunnyrabbit/task-manager";
import { DownloadSplitCanvasConfig, DownloadSplitCanvasTask } from "..";

export default createTask<{ config: DownloadSplitCanvasConfig }, string>({
  name: "Download ZIP",

  parse() {
    switch (this.status) {
      default:
      case "idle": {
        return {
          status: "Download ZIP",
        };
      }
      case "in-progress": {
        return {
          status: "Downloading...",
        };
      }
      case "error": {
        return {
          status: "Failed to download...",
        };
      }
      case "success": {
        if (this.result.isPresent()) {
          return {
            status: "Downloaded",
            result: this.result.get(),
          };
        }

        return {
          status: "No result.",
        };
      }
    }
  },

  async execute({ config }) {
    const blob = this.manager.getTaskResult(DownloadSplitCanvasTask.PackageZip);

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.filename}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    return url;
  },
});
