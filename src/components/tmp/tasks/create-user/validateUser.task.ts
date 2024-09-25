import { createTask } from "@lilbunnyrabbit/task-manager";
import updateUserTask from "./updateUser.task";
import { dummyProgress, sleep } from "../../misc.util";

export default createTask({
  name: "Validate User",

  parse(this) {
    const title = () => {
      switch (this.status) {
        case "idle":
          return this.name;
        case "in-progress":
          return "Validating user...";
        case "error":
          return "Failed to validate user...";
        case "success":
          return "User validated";
      }
    };

    return {
      status: title(),
    };
  },

  async execute() {
    await dummyProgress({
      count: 10,
      delay: 50,
      onChange: (progress) => this.setProgress(progress * 0.25),
    });

    const userOptional = this.manager.findLastTask(updateUserTask)?.result;
    if (!userOptional || userOptional.isEmpty()) {
      throw new Error(`Missing task #${updateUserTask.id} result.`);
    }

    const user = userOptional.get();

    this.addWarning(`User is ${JSON.stringify(user)}}`);

    await dummyProgress({
      count: 10,
      delay: 50,
      onChange: (progress) => this.setProgress(progress * 0.25 + 0.25),
    });

    if (!("id" in user)) {
      throw new Error("Missing user.id");
    }

    this.addWarning(`User id is #${user.id}`);

    await dummyProgress({
      count: 10,
      delay: 50,
      onChange: (progress) => this.setProgress(progress * 0.25 + 0.5),
    });

    if (!("author" in user)) {
      throw new Error("Missing user.author");
    }

    this.addWarning(`Author is ${user.author}`);

    const promise = dummyProgress({
      count: 10,
      delay: 50,
      onChange: (progress) => {
        if (this.status !== "error") {
          this.setProgress(progress * 0.25 + 0.75);
        }
      },
    });

    await sleep(10);

    if (user.id === 5) {
      throw new Error("Something bad happened... Oh no!");
    }

    await promise;
  },
});
