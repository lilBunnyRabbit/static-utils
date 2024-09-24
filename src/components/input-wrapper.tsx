import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import classes from "./input-wrapper.module.scss";
import clsx from "clsx";

interface InputWrapperProps {
  label?: React.ReactNode;
  tooltip?: React.ReactNode;
  suffix?: React.ReactNode;
  children?: React.ReactNode;
}
// TODO: Polish

export const InputWrapper: React.FC<InputWrapperProps> = ({ label, tooltip, suffix, children }) => {
  if (!label && !tooltip) {
    return children;
  }

  return (
    <div className={clsx("border-2 border-foreground flex overflow-hidden", classes["input-wrapper"])}>
      {!tooltip ? (
        <label className="px-2 whitespace-nowrap bg-foreground border-r-2 text-base border-foreground text-background font-medium flex items-center gap-1 cursor-help ">
          {label}
        </label>
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <label className="px-2 whitespace-nowrap bg-foreground border-r-2 text-sm border-foreground text-background font-medium flex items-center gap-1 cursor-help ">
                {label}
                <QuestionMarkCircledIcon height={16} className="block" />
              </label>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="start"
              className="border-2 border-secondary-500 bg-background text-secondary-500 font-hack -ml-[2px] mt-px"
            >
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {children}

      {suffix && (
        <label className="px-2 bg-foreground border-r-2 text-sm border-foreground text-background font-medium flex items-center gap-1 cursor-help ">
          {suffix}
        </label>
      )}
    </div>
  );
};
