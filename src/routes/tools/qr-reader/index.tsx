import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tools/qr-reader/")({
  staticData: {
    title: "QR Reader",
    features: {
      whatIsThis: true,
    },
  },
});
