import { createTask } from "@/packages/task-manager";
import { DownloadSplitCanvasTask } from "..";

export default createTask<void, Blob>({
  name: "Package ZIP",

  parse() {
    switch (this.status) {
      default:
      case "idle": {
        return {
          status: "Package ZIP",
        };
      }
      case "in-progress": {
        return {
          status: "Packaging files...",
        };
      }
      case "error": {
        return {
          status: "Failed to package files...",
        };
      }
      case "success": {
        if (this.result.isPresent()) {
          return {
            status: "Files packaged",
            result: `Zip (${(this.result.get().size / 1024).toFixed(2)} KB)`,
          };
        }

        return {
          status: "No result.",
        };
      }
    }
  },

  async execute() {
    const zip = this.manager.getTaskResult(DownloadSplitCanvasTask.CreateAndZip);

    const blob = await zip.generateAsync({ type: "blob" }, ({ percent }) => {
      this.setProgress(percent);
    });

    return blob;
  },
});
