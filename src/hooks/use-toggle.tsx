import { isUndefined } from "@lilbunnyrabbit/utils";
import React from "react";

export function useToggle(initial?: boolean) {
  const [internal, setInternal] = React.useState<boolean>(Boolean(initial));

  const toggle = React.useCallback(
    (value?: boolean) => {
      setInternal((i) => (isUndefined(value) ? !i : value));
    },
    [setInternal]
  );

  return [internal, toggle] as const;
}
