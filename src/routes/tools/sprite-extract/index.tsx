import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tools/sprite-extract/")({
  staticData: {
    title: "Sprite Sheet Extractor",
    features: {
      whatIsThis: true,
    },
  },
});
