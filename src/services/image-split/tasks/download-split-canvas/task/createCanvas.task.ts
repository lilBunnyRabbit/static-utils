import { createTask } from "@lilbunnyrabbit/task-manager";

export default createTask<void, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }>({
  name: "Create Canvas",

  parse() {
    switch (this.status) {
      default:
      case "idle": {
        return {
          status: "Create Canvas",
        };
      }
      case "in-progress": {
        return {
          status: "Creating Canvas...",
        };
      }
      case "error": {
        return {
          status: "Failed to create Canvas...",
        };
      }
      case "success": {
        return {
          status: "Canvas created",
          result: "",
        };
      }
    }
  },

  async execute() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get 2d context.");
    }

    return { canvas, ctx };
  },
});
