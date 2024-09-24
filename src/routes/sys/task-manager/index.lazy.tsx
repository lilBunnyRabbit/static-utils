import { ErrorComponent } from "@/components/route/error-component";
import { Tasks } from "@/components/tmp/tasks";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Task, TaskManager } from "@/packages/task-manager";
import { createLazyFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import React from "react";

const _taskManager = new TaskManager();
_taskManager.addTasks(Tasks.CreateUser(5, "Janez Novak"));
_taskManager.addTasks(Tasks.CreateUser(1, "Martin Novak"));

const taskManager = _taskManager;

export const Route = createLazyFileRoute("/sys/task-manager/")({
  component: TaskManagerRoute,
  errorComponent: ErrorComponent,
});

function TaskManagerRoute(): React.ReactNode {
  const [hasError, setHasError] = React.useState(false);
  const counterState = React.useState(0);

  React.useEffect(() => {
    function onChange(this: TaskManager) {
      counterState[1]((c) => c + 1);
    }

    taskManager.on("change", onChange);
    taskManager.on("task", (task) => console.log({ task }));
    taskManager.on("fail", () => setHasError(true));

    return () => {
      taskManager.off("change", onChange);
    };
  }, [taskManager]);

  return (
    <div className="grid grid-cols-1 grid-rows-[min-content,1fr]">
      <div className="flex flex-col p-4 border-b-2 border-foreground">
        <div className="flex gap-4 justify-between items-center mb-2">
          <h1>
            [{taskManager.status}] {"Title"}
          </h1>

          <div className="flex gap-4 justify-between items-center text-sm">
            {taskManager.flags.map((flag) => `[${TaskManager.Flag[flag]}]`).join(", ")}
          </div>

          <div className="flex gap-2 items-center">
            <Button
              className="text-primary-400 border-primary-400"
              disabled={!taskManager.isStatus("idle", "stopped")}
              onClick={() => taskManager.start()}
            >
              {taskManager.isStatus("idle") ? "Start" : "Continue"}
            </Button>
            <Button
              className="text-secondary-400 border-secondary-400"
              disabled={!taskManager.isStatus("idle", "stopped", "fail")}
              onClick={() => taskManager.start(true)}
            >
              {taskManager.isStatus("idle") ? "Start" : "Continue"} (force)
            </Button>
            <Button
              className="text-red-400 border-red-400"
              disabled={!taskManager.isStatus("in-progress")}
              onClick={() => taskManager.stop()}
            >
              Stop
            </Button>
            <Button
              className="text-orange-400 border-orange-400"
              disabled={taskManager.isStatus("in-progress", "idle")}
              onClick={() => taskManager.reset()}
            >
              Reset
            </Button>
            <Button
              className="text-tertiary-400 border-tertiary-400"
              disabled={!taskManager.queue.length}
              onClick={() => taskManager.clearQueue()}
            >
              Clear Queue
            </Button>
          </div>
        </div>

        <Progress
          className={clsx("mt-4 mb-2 rounded-none", (taskManager.status === "fail" || hasError) && "bg-red-500")}
          value={taskManager.progress * 100}
          max={100}
        />
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto max-h-full p-4">
        {taskManager.tasks.map((task) => (
          <TaskDisplay key={`task-${task.id}`} task={task} />
        ))}

        {taskManager.queue.map((task) => (
          <TaskDisplay key={`task-${task.id}`} task={task} />
        ))}
      </div>
    </div>
  );
}

interface TaskDisplayProps {
  task: Task;
}

const TaskDisplay: React.FC<TaskDisplayProps> = ({ task }) => {
  const [parsed, setParsed] = React.useState<Task.Parsed>(() => task.parse());

  React.useEffect(() => {
    function onChange(this: Task) {
      const parsed = this.parse();
      console.log({ parsed });
      setParsed(parsed);
    }

    task.on("change", onChange);

    return () => {
      task.off("change", onChange);
    };
  }, [task]);

  return (
    <div className={clsx(task.status === "idle" && "opacity-40")}>
      <ParsedDisplay parsed={parsed} task={task} />
    </div>
  );
};
interface ParsedDisplayProps {
  parsed: Task.Parsed;
  task: Task;
}

const ParsedDisplay: React.FC<ParsedDisplayProps> = ({ parsed, task }) => {
  const head = (
    <div
      className={clsx(
        "font-bold text-background px-2 py-1 flex justify-between items-center border-2 border-current",
        {
          idle: "text-gray-400",
          "in-progress": "text-orange-400",
          success: "text-green-600",
          error: "text-red-400",
        }[task.status],
        task.status !== "idle" && "mb-2"
      )}
    >
      <div>
        [{task.status}] {parsed.status}
      </div>

      <div>{task.progress > 0 && `${Math.round(task.progress * 100)}%`}</div>
    </div>
  );

  if (task.status === "idle") {
    return head;
  }

  return (
    <div>
      {head}
      <div className={clsx("flex flex-col gap-2 text-sm")}>
        {parsed.result && <pre className="border-l-2 border-foreground pl-4 ml-1">{parsed.result}</pre>}

        {(parsed.warnings?.length || parsed.errors?.length) && (
          <ul className="ml-5 list-disc">
            {(parsed.warnings ?? []).map((warning, i) => (
              <li key={`warning-${i}`} className="text-orange-400" children={warning} />
            ))}

            {(parsed.errors ?? []).map((errors, i) => (
              <li key={`error-${i}`} className="text-red-400" children={errors} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
