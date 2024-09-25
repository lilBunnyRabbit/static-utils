import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import React from "react";

export const Route = createFileRoute("/testing")({
  component: TestingRoute,
});

function TestingRoute(): React.ReactNode {
  const [clicked, setClicked] = React.useState(0);

  return (
    <div>
      <Button onClick={() => setClicked((c) => c + 1)}>Clicked {clicked}</Button>
    </div>
  );
}
