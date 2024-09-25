import type { ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "../ui/button";
import { PickPartial } from "@lilbunnyrabbit/utils";
import clsx from "clsx";

export const ErrorComponent: React.FC<ErrorComponentProps> = (props) => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <ErrorElement className="max-h-[50%] max-w-[50%] min-w-[30%]" {...props} />
    </div>
  );
};

export type ErrorElementProps = PickPartial<ErrorComponentProps, "reset"> & {
  className?: string;
};

export const ErrorElement: React.FC<ErrorElementProps> = ({ error, reset, className }) => {
  return (
    <div
      className={clsx("border-2 border-red-600 text-red-600 grid grid-rows-[min-content,1fr,min-content]", className)}
    >
      <h3 className="font-bold text-lg border-b-2 border-current px-4 py-2 mb-4">{error.name}</h3>

      <p className={clsx("text-sm text-red-600/80 text-justify px-4", reset && "mb-4")}>{error.message}</p>

      {reset && (
        <Button
          className="float-end w-fit flex gap-2 text-base self-end justify-self-end place-self-end border-red-600 hover:bg-red-600 mx-4 mb-4 text-red-600"
          onClick={reset}
        >
          Reset
        </Button>
      )}
    </div>
  );
};
