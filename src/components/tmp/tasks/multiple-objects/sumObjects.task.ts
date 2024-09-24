import { createTask } from "@/packages/task-manager";
import createObjectTask from "./createObject.task";
import { sleep } from "../../misc.util";

export default createTask<void, number>({
  name: "Sum Objects",

  parse() {
    const title = () => {
      switch (this.status) {
        case "idle":
          return this.name;
        case "in-progress":
          return "Summing objects...";
        case "error":
          return "Failed to sum objects...";
        case "success":
          return `SUM: ${this.result.get()}`;
      }
    };

    return {
      status: title(),
    };
  },

  async execute() {
    const tasks = this.manager.findTasks(createObjectTask);

    if (!tasks.length) {
      throw new Error(`Requires at least one "${createObjectTask.taskName}" Task #${createObjectTask.id}`);
    }

    let sum = 0;

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (task.result.isEmpty()) {
        throw new Error(`Task #${task.id} has undefined result`);
      }

      await sleep(50);

      sum += task.result.get().value;

      this.setProgress(i / tasks.length);
    }

    return sum;
  },
});
