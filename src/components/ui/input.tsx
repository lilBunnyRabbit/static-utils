import * as React from "react";

import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";
import { InputWrapper } from "../input-wrapper";

const inputVariants = cva("", {
  variants: {
    variant: {
      default: "bg-red-500 text-blue-500 ",
      // "flex h-8 w-full border-2 border-foreground bg-transparent px-4 py-1 font-hack text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-neutral-950 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:file:text-neutral-50 dark:placeholder:text-neutral-400 dark:focus-visible:ring-neutral-300" // TODO!!,
      ghost: "h-6 w-full bg-transparent text-sm px-2 rounded-none outline-none",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, VariantProps<typeof inputVariants> {
  label?: React.ReactNode;
  tooltip?: React.ReactNode;
  suffix?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, tooltip, suffix, className, variant, type, ...props }, ref) => {
    return (
      <InputWrapper label={label} tooltip={tooltip} suffix={suffix}>
        <input
          type={type}
          className={cn(inputVariants({ variant: label || tooltip ? "ghost" : variant, className }))}
          ref={ref}
          {...props}
        />
      </InputWrapper>
    );
  }
);
Input.displayName = "Input";

export { Input };
