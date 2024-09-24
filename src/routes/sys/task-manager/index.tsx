import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sys/task-manager/")({
  staticData: {
    title: "Task Manager (powered by @lilbunnyrabbit/task-manager)",
  },
});
