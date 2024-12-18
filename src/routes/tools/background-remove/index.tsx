import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tools/background-remove/")({
  staticData: {
    title: "Background Remove",
    features: {
      whatIsThis: false,
    },
  },
});
