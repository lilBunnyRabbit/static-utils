import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tools/image-concat/")({
  staticData: {
    title: "Image Concat",
    features: {
      whatIsThis: true,
    },
  },
});
