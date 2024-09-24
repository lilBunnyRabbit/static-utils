/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    fontFamily: {
      hack: 'Hack, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },

    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "#000",
        foreground: "#999",

        primary: {
          50: "#fafde8",
          100: "#f3f9ce",
          200: "#e5f3a3",
          300: "#d2e96d",
          400: "#b5d72b", // ---
          500: "#9fc121",
          600: "#7b9a16",
          700: "#5d7516",
          800: "#4b5d17",
          900: "#404f18",
          950: "#202b08",
        },
        secondary: {
          50: "#f0fdf4",
          100: "#ddfbe8",
          200: "#bcf6d2",
          300: "#88edaf",
          400: "#4cdc85",
          500: "#2bd76f", // ---
          600: "#18a14f",
          700: "#177e40",
          800: "#176436",
          900: "#15522f",
          950: "#062d17",
        },
        tertiary: {
          50: "#fcf4ff",
          100: "#f8e8ff",
          200: "#f1d0fe",
          300: "#e8acfb",
          400: "#db7af8",
          500: "#c847ee",
          600: "#b42bd7", // ---
          700: "#931dae",
          800: "#7a1a8e",
          900: "#671b74",
          950: "#42054d",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
