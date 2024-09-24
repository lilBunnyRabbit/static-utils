import { createTask } from "@/packages/task-manager";
import { dummyProgress } from "../../misc.util";

// eslint-disable-next-line react-refresh/only-export-components
export default createTask<number, { value: number }>({
  name: "Create Object",

  parse() {
    const title = () => {
      switch (this.status) {
        case "idle":
          return `${this.name} with value ${this.data}`;
        case "in-progress":
          return "Creating object...";
        case "error":
          return "Failed to create object...";
        case "success":
          return JSON.stringify(this.result.get(), null, 2);
      }
    };

    return {
      status: title(),
    };
  },

  async execute(value) {
    if (value > 100) {
      throw new Error("Values over 100 are not supported");
    }

    await dummyProgress({
      count: 5,
      delay: 10,
      onChange: (progress) => this.setProgress(progress),
    });

    return { value };
  },
});
