import { createTask } from "@lilbunnyrabbit/task-manager";
import { dummyProgress } from "../../misc.util";
import createUserTask from "./createUser.task";

export default createTask<{ author: string }, { id: number; author: string }>({
  name: "Update User",

  parse() {
    const title = () => {
      switch (this.status) {
        case "idle":
          return this.name;
        case "in-progress":
          return "Updating user...";
        case "error":
          return "Failed to update user...";
        case "success":
          return `User updated #${this.result.get()?.id}`;
      }
    };

    return {
      status: title(),
    };
  },

  async execute({ author }) {
    const user = this.manager.findLastTask(createUserTask)?.result?.orElseThrow(() => new Error("Undefined result"));

    await dummyProgress({
      count: 10,
      delay: 50,
      onChange: (progress) => this.setProgress(progress * 0.5),
    });

    this.addWarning("This is a warning");

    await dummyProgress({
      count: 5,
      delay: 50,
      onChange: (progress) => this.setProgress(progress * 0.5 + 0.5),
    });

    if (user === undefined) {
      throw new Error(`Missing task #${createUserTask.id} result.`);
    }

    return { ...user, author };
  },
});
