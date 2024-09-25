import { ErrorComponent } from "@/components/route/error-component";
import { Tasks } from "@/components/tmp/tasks";
import { Button } from "@/components/ui/button";
import { useTaskManager } from "@/context/task-manager.context";
import { ParsedTask, Task, TaskManager, TaskManagerFlag } from "@lilbunnyrabbit/task-manager";
import { createLazyFileRoute, Navigate } from "@tanstack/react-router";
import clsx from "clsx";
import React from "react";

const _taskManager = new TaskManager();
_taskManager.addTasks(Tasks.CreateUser(5, "Janez Novak"));
_taskManager.addTasks(Tasks.CreateUser(1, "Martin Novak"));

export const Route = createLazyFileRoute("/sys/task-manager/")({
  component: TaskManagerRoute,
  errorComponent: ErrorComponent,
});

function TaskManagerRoute(): React.ReactNode {
  const { taskManager } = useTaskManager();

  if (!taskManager) {
    return <Navigate to="/" />;
  }

  return <TaskManagerDisplay taskManager={taskManager} />;
}

interface TaskManagerDisplayProps {
  taskManager: TaskManager;
}

const TaskManagerDisplay: React.FC<TaskManagerDisplayProps> = ({ taskManager }) => {
  const [, setHasError] = React.useState(false);
  const counterState = React.useState(0);

  React.useEffect(() => {
    function onChange(this: TaskManager) {
      counterState[1]((c) => c + 1);
    }

    taskManager.on("change", onChange);
    taskManager.on("fail", () => setHasError(true));

    return () => {
      taskManager.off("change", onChange);
    };
  }, [taskManager]);

  return (
    <div className="p-8 h-full w-full overflow-hidden grid grid-cols-1 grid-rows-[min-content,1fr] gap-y-4">
      <div className="flex gap-4 justify-between items-center p-4 border-2 border-foreground">
        <h1 className="font-bold">
          [{taskManager.status}] {"Title"}
        </h1>

        <div className="flex gap-4 justify-between items-center text-sm">
          {taskManager.flags.map((flag) => `[${TaskManagerFlag[flag]}]`).join(", ")}
        </div>

        <div>{`${Math.round(taskManager.progress * 100)}%`}</div>

        <div className="flex gap-2 items-center">
          <Button
            variant="inverted"
            disabled={!taskManager.isStatus("idle", "stopped", "fail")}
            onClick={() => taskManager.start(taskManager.isStatus("fail"))}
          >
            {taskManager.isStatus("idle") ? "Start" : "Continue"} {taskManager.isStatus("fail") && "(force)"}
          </Button>
          <Button variant="inverted" disabled={!taskManager.isStatus("in-progress")} onClick={() => taskManager.stop()}>
            Stop
          </Button>
          <Button
            variant="inverted"
            disabled={taskManager.isStatus("in-progress", "idle")}
            onClick={() => taskManager.reset()}
          >
            Reset
          </Button>
          <Button variant="inverted" disabled={!taskManager.queue.length} onClick={() => taskManager.clearQueue()}>
            Clear Queue
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto max-h-full">
        {taskManager.tasks.map((task) => (
          <TaskDisplay key={`task-${task.id}`} task={task} />
        ))}

        {taskManager.queue.map((task) => (
          <TaskDisplay key={`task-${task.id}`} task={task} />
        ))}
      </div>
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
  parsed: ParsedTask;
  task: Task;
}

const ParsedDisplay: React.FC<ParsedDisplayProps> = ({ parsed, task }) => {
  const head = (
    <div
      className={clsx(
        "font-bold text-background px-4 py-2 flex justify-between items-center border-b-2",
        {
          idle: "bg-gray-400 border-gray-400",
          "in-progress": "bg-orange-400 border-orange-400",
          success: "bg-green-600 border-green-600",
          error: "bg-red-400 border-red-400",
        }[task.status]
      )}
    >
      <div>
        [{task.status}] {parsed.status}
      </div>

      <div>{task.progress > 0 && `${Math.round(task.progress * 100)}%`}</div>
    </div>
  );

  if (task.status === "idle" || !(parsed.result || parsed.warnings || parsed.errors)) {
    return head;
  }

  return (
    <div
      className={clsx(
        "border-2 border-t-0",
        {
          idle: "border-gray-400",
          "in-progress": "border-orange-400",
          success: "border-green-600",
          error: "border-red-400",
        }[task.status]
      )}
    >
      {head}
      <div className={clsx("flex flex-col gap-2 p-4")}>
        {parsed.result && <pre className="font-hack">{parsed.result}</pre>}

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
