import "../styles/global.scss";

export namespace ThemeState {
  export const prefix = "static-utils:theme";
  export type ColorProperties =
    | "background"
    | "background-dark"
    | "text"
    | "primary"
    | "secondary"
    | "error"
    | "success";
  export type Colors = Record<ColorProperties, `#${string}`>;
}

const { State } = (window as any).lilState;

export const themeState = new State(
  {
    prefix: ThemeState.prefix,
    useChangeEvent: false,
    useLogs: true,
    useRefetchOnFocus: true,
  },
  {
    colors: {
      defaultValue: {
        background: "#2c2f33",
        "background-dark": "#23272a",
        text: "#f0f0fc",
        primary: "#90d627",
        secondary: "#7927d6",
        error: "#d62727",
        success: "#90d627",
      } satisfies ThemeState.Colors,
      config: {
        useLocalStorage: true,
        useEvents: true,
        useRefetchOnFocus: true,
      },
    },
  }
);

export const setColorVariables = (colors?: ThemeState.Colors) => {
  if (!colors) colors = themeState.get("colors");

  Object.keys(colors).forEach((property) => {
    document.documentElement.style.setProperty(`--${property}`, colors[property as keyof typeof colors]);
  });
};

themeState.attach("colors").addListener(setColorVariables);

setColorVariables();
