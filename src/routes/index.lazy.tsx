import { Button } from "@/components/ui/button";
import { baseUrl } from "@/utils/url.util";
import { createLazyFileRoute, Link, LinkProps } from "@tanstack/react-router";
import clsx from "clsx";
import { ArrowUpRightIcon } from "lucide-react";
import React from "react";

export const Route = createLazyFileRoute("/")({
  component: IndexRoute,
});

function IndexRoute() {
  return (
    <div className="grid grid-cols-5 grid-rows-6 gap-8 p-8">
      <ToolBox name="Legacy" description="Legacy static utils" href={baseUrl("/legacy/index.html")} />

      <ToolBox name="Image Crop" description="Description, description, description, ..." to="/tools/image-crop" />

      <ToolBox name="Image Concat" description="Description, description, description, ..." to="/tools/image-concat" />

      <ToolBox name="Image Split" description="Description, description, description, ..." to="/tools/image-split" />

      <ToolBox
        name="[WIP] Background Remove"
        description="Description, description, description, ..."
        to="/tools/background-remove"
      />

      {Array(5 * 6 - 4)
        .fill(0)
        .map((_, i) => (
          <div
            key={`todo-${i}`}
            className="border-2 border-foreground p-4 h-full flex items-center justify-center text-3xl opacity-20"
          >
            TODO
          </div>
        ))}
    </div>
  );
}

interface ToolBoxProps {
  name: string;
  description?: React.ReactNode;
  to?: LinkProps["to"];
  href?: string;
}

const ToolBox: React.FC<ToolBoxProps> = ({ name, description, to, href }) => {
  return (
    <div className="border-2 border-foreground p-4 h-full grid grid-rows-[min-content,1fr,min-content]">
      <h3 className={clsx("font-bold text-lg", description ? "mb-1" : "mb-2")}>{name}</h3>

      <p className="text-sm text-foreground/80 text-justify mb-4">{description}</p>

      <Button asChild className="float-end w-fit flex gap-2 text-base self-end justify-self-end place-self-end">
        {href ? (
          <a href={href}>
            Open <ArrowUpRightIcon size={20} />
          </a>
        ) : (
          <Link to={to} href={href}>
            Open <ArrowUpRightIcon size={20} />
          </Link>
        )}
      </Button>
    </div>
  );
};
