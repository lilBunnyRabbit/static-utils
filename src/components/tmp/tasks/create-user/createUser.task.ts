import { createTask } from "@/packages/task-manager";
import { dummyProgress } from "../../misc.util";

export default createTask<{ id: number }, { id: number }>({
  name: "Create User",

  parse() {
    const title = () => {
      switch (this.status) {
        case "idle":
          return this.name;
        case "in-progress":
          return "Creating user...";
        case "error":
          return "Failed to create user...";
        case "success":
          return `User created #${this.result.get()?.id}`;
      }
    };

    return {
      status: title(),
    };
  },

  async execute({ id }) {
    await dummyProgress({
      count: 10,
      delay: 50,
      onChange: (progress) => this.setProgress(progress),
    });

    return { id };
  },
});
