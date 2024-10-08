import { createTask } from "@lilbunnyrabbit/task-manager";
import JSZip from "jszip";

export default createTask<void, JSZip>({
  name: "Create ZIP",

  parse() {
    switch (this.status) {
      default:
      case "idle": {
        return {
          status: "Create ZIP",
        };
      }
      case "in-progress": {
        return {
          status: "Creating ZIP file...",
        };
      }
      case "error": {
        return {
          status: "Failed to create ZIP file...",
        };
      }
      case "success": {
        if (this.result.isPresent()) {
          return {
            status: "ZIP file created",
            result: "",
          };
        }

        return {
          status: "No result.",
        };
      }
    }
  },

  async execute() {
    return new JSZip();
  },
});
