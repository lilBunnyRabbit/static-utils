import { createTask } from "@/packages/task-manager";
import createObjectTask from "./createObject.task";
import sumObjectsTask from "./sumObjects.task";

// eslint-disable-next-line react-refresh/only-export-components
export default createTask<void, { sum: number; average: number }>({
  name: "Avarage Objects",

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
          return `
          SUM: ${this.result.get()?.sum}
          AVERAGE: ${this.result.get()?.average}
          `;
      }
    };

    return {
      status: title(),
    };
  },

  async execute() {
    const sumOptional = this.manager.findLastTask(sumObjectsTask)?.result;

    if (!sumOptional || sumOptional.isEmpty()) {
      throw new Error(`Requires "${sumObjectsTask.taskName}" Task ${sumObjectsTask.id}`);
    }

    const sum = sumOptional.get();

    const tasks = this.manager.findTasks(createObjectTask);

    return {
      sum,
      average: sum / tasks.length,
    };
  },
});
