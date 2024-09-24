import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tools/image-split/")({
  staticData: {
    title: "Image Split",
    features: {
      whatIsThis: true,
    },
  },
});
