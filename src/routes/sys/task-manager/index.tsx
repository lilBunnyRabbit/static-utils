import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sys/task-manager/")({
  staticData: {
    title: (
      <>
        Task Manager (powered by{" "}
        <a className="text-secondary-800" href="https://www.npmjs.com/package/@lilbunnyrabbit/task-manager">@lilbunnyrabbit/task-manager</a>)
      </>
    ),
  },
});
