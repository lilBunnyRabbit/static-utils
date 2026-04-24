import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tools/gif-player/")({
  staticData: {
    title: "GIF & Video Player",
    features: {
      whatIsThis: true,
    },
  },
});
