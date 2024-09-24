/* eslint-disable react-refresh/only-export-components */
import { createTask } from "@/packages/task-manager";
import createObjectTask from "./createObject.task";

export default createTask<void, Record<"first" | "last", number>>({
  name: "First Last task",

  parse() {
    const title = () => {
      switch (this.status) {
        case "idle":
          return this.name;
        case "in-progress":
          return "Searching tasks...";
        case "error":
          return "Failed to find first and last task...";
        case "success":
          return JSON.stringify(this.result.orElse({ first: -1, last: -1 }));
      }
    };

    return {
      status: title(),
    };
  },

  async execute() {
    const first = this.manager.findTask(createObjectTask);

    if (!first || first.result.isEmpty()) {
      throw new Error(`Requires "${createObjectTask.taskName}" Task #${createObjectTask.id}`);
    }

    const last = this.manager.findLastTask(createObjectTask);
    if (!last || last.result.isEmpty()) {
      throw new Error(`Requires "${createObjectTask.taskName}" Task #${createObjectTask.id}`);
    }

    if (last.id === first.id) {
      throw new Error(`Requires at least two "${createObjectTask.taskName}" Task #${createObjectTask.id}`);
    }

    return {
      first: first.result.get().value,
      last: last.result.get().value,
    };
  },
});
