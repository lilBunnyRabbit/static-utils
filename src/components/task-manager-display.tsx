import { ParsedTask, Task, TaskManager } from "@lilbunnyrabbit/task-manager";
import React from "react";
import { Progress } from "./ui/progress";
import clsx from "clsx";
import { Button } from "./ui/button";

interface TaskManagerDisplayProps {
  title: React.ReactNode;
  taskManager: TaskManager;
}

export const TaskManagerDisplay: React.FC<TaskManagerDisplayProps> = ({ title, taskManager }) => {
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
    <div className="flex flex-col gap-4 px-8 mt-8">
      <div className="flex gap-4 justify-between items-center">
        <h1>
          [{taskManager.status}] {title}
        </h1>

        <div className="flex gap-2 items-center">
          <Button
            className="text-primary-400 border-primary-400"
            size="sm"
            disabled={!taskManager.isStatus("idle", "stopped")}
            onClick={() => taskManager.start()}
          >
            Start
          </Button>
          <Button
            className="text-secondary-400 border-secondary-400"
            size="sm"
            disabled={!taskManager.isStatus("idle", "stopped", "fail")}
            onClick={() => taskManager.start(true)}
          >
            Start (force)
          </Button>
          <Button
            className="text-red-400 border-red-400"
            size="sm"
            disabled={!taskManager.isStatus("in-progress")}
            onClick={() => taskManager.stop()}
          >
            Stop
          </Button>
          <Button
            className="text-orange-400 border-orange-400"
            size="sm"
            disabled={taskManager.isStatus("in-progress", "idle")}
            onClick={() => taskManager.reset()}
          >
            Reset
          </Button>
          <Button
            className="text-tertiary-400 border-tertiary-400"
            size="sm"
            disabled={!taskManager.queue.length}
            onClick={() => taskManager.clearQueue()}
          >
            Clear Queue
          </Button>
        </div>
      </div>

      <Progress
        className={clsx((taskManager.status === "fail" || hasError) && "bg-red-500")}
        value={taskManager.progress * 100}
        max={100}
      />

      {taskManager.tasks.map((task) => (
        <TaskDisplay key={`task-${task.id}`} task={task} />
      ))}

      {taskManager.queue.map((task) => (
        <TaskDisplay key={`task-${task.id}`} task={task} />
      ))}
    </div>
  );
};

interface TaskDisplayProps {
  task: Task;
}

const TaskDisplay: React.FC<TaskDisplayProps> = ({ task }) => {
  const [parsed, setParsed] = React.useState<ParsedTask>(() => task.parse());

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
    <div
      className={clsx(
        "grid grid-cols-[1fr,min-content] gap-x-4 items-center pb-4 last:pb-0 border-2",
        task.status === "idle" && "opacity-40",
        {
          idle: "border-gray-400",
          "in-progress": "border-orange-400",
          success: "border-green-600",
          error: "border-red-400",
        }[task.status]
      )}
    >
      <ParsedDisplay parsed={parsed} task={task} />

      <div>{task.progress < 1 && task.progress > 0 && `${Math.round(task.progress * 100)}%`}</div>
    </div>
  );
};
interface ParsedDisplayProps {
  parsed: ParsedTask;
  task: Task;
}

const ParsedDisplay: React.FC<ParsedDisplayProps> = ({ parsed, task }) => {
  return (
    <div>
      <div
        className={clsx(
          "font-bold mb-2 text-background px-4 py-1",
          {
            idle: "bg-gray-400",
            "in-progress": "bg-orange-400",
            success: "bg-green-600",
            error: "bg-red-400",
          }[task.status]
        )}
      >
        [{task.status}] {parsed.status}
      </div>

      <div className="flex flex-col gap-2 pl-4 text-sm">
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
