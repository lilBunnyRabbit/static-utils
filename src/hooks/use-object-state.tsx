import { isFunction } from "@lilbunnyrabbit/utils";
import React from "react";
import { useDebounced } from "./use-debounced";

export function useObjectState<T extends Record<string | number | symbol, any>>(defaultValues: T) {
  const [values, setValues] = React.useState<T>(defaultValues);

  const setValue = React.useCallback(function <K extends keyof T>(key: K, value: T[K]) {
    setValues((values) => ({ ...values, [key]: isFunction(value) ? value(values[key]) : value }));
  }, []);

  return [values, setValue] as const;
}

export function useDebouncedObjectState<T extends Record<string | number | symbol, any>>(
  defaultValues: T,
  wait: number,
  options?: {
    leading: boolean;
  }
) {
  const [values, setValues] = React.useState<T>(defaultValues);
  const [debounced] = useDebounced(values, wait, options);

  const setValue = React.useCallback(function <K extends keyof T>(key: K, value: T[K]) {
    setValues((values) => ({ ...values, [key]: isFunction(value) ? value(values[key]) : value }));
  }, []);

  return [debounced, setValue] as const;
}
