import React from "react";

type AsyncState<TData> =
  | {
      status: "idle";
    }
  | {
      status: "loading";
    }
  | {
      status: "data";
      data: TData;
    }
  | {
      status: "error";
      error?: any;
    };

export function useStateResolve<TData>() {
  const [state, setState] = React.useState<AsyncState<TData>>({ status: "idle" });

  const resolve = React.useCallback(
    <TArgs extends unknown[]>(callback: (...args: TArgs) => TData | Promise<TData>, ...args: TArgs) => {
      let isAborted = false;

      setState({ status: "loading" });

      // TODO: Kinda working?
      setTimeout(() => {
        Promise.resolve(callback(...args))
          .then((data) => {
            if (!isAborted) {
              setState({ status: "data", data });
            }
          })
          .catch((error) => {
            if (!isAborted) {
              setState({ status: "error", error });
            }
          });
      }, 0);

      return () => {
        isAborted = true;
      };
    },
    []
  );

  const extracted = React.useMemo(() => {
    return {
      data: state.status === "data" ? state.data : undefined,
      isLoading: state.status === "loading",
      isError: state.status === "error",
      error: state.status === "error" ? state.error : undefined,
    };
  }, [state]);

  return [state, resolve, extracted] as const;
}
