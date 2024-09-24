import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tools/image-crop/")({
  staticData: {
    title: "Image Crop",
    features: {
      whatIsThis: true,
    },
  },
});
