import React from "react";

export interface JsonState<S> {
  value: S;
  set: React.Dispatch<React.SetStateAction<S>>;
}

export function useJsonState<S>(initialState: S | (() => S)): JsonState<S>;
export function useJsonState<S = undefined>(): JsonState<S | undefined>;
export function useJsonState<S = undefined>(...args: Parameters<typeof React.useState<S>>) {
  const [value, set] = React.useState<S>(...args);

  return { value, set };
}
