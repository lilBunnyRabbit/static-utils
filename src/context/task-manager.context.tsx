import { TaskManager } from "@lilbunnyrabbit/task-manager";
import React from "react";
import { useNavigate } from "@tanstack/react-router";

export interface TaskManagerContextProps {
  taskManager: TaskManager | null;
  setTaskManager: (taskManager: TaskManager | null) => void;
}

export const TaskManagerContext = React.createContext<TaskManagerContextProps | null>(null);

export interface TaskManagerProviderProps {
  children: React.ReactNode;
}

export const TaskManagerProvider: React.FC<TaskManagerProviderProps> = ({ children }) => {
  const [taskManager, setTaskManager] = React.useState<TaskManager | null>(null);

  const navigate = useNavigate();

  const set = React.useCallback(
    (taskManager: TaskManager | null) => {
      setTaskManager(taskManager);
      if (taskManager) {
        navigate({ to: "/sys/task-manager" });
      }
    },
    [navigate]
  );

  return <TaskManagerContext.Provider value={{ taskManager, setTaskManager: set }} children={children} />;
};

export const useTaskManager = () => {
  const context = React.useContext(TaskManagerContext);
  if (!context) {
    throw new Error(`${useTaskManager.name} must be used within ${TaskManagerProvider.name}`);
  }

  return context;
};
