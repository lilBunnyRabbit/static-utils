import { ErrorComponent } from "@/components/route/error-component";
import { Button } from "@/components/ui/button";
import { useNavbar } from "@/context/navbar.context";
import { TaskManagerProvider } from "@/context/task-manager.context";
import { createRootRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import clsx from "clsx";
import { LayoutGridIcon } from "lucide-react";
import React from "react";

export const Route = createRootRoute({
  component: Root,
  errorComponent: ErrorComponent,
});

function Root(): React.ReactNode {
  const { showInfo } = useNavbar();
  const matches = useMatches();

  const route = React.useMemo(() => {
    if (!matches.length) {
      return null;
    }

    const data = matches[matches.length - 1].staticData as any;

    return {
      title: data?.title ?? null,
      features: data?.features ?? {},
    };
  }, [matches]);

  return (
    <TaskManagerProvider>
      <main className="relative overflow-hidden h-full w-full">
        <Outlet />
      </main>

      <div className="border-t-2 border-t-foreground h-fit">
        <div className="flex gap-2 justify-between items-center">
          <div className="flex whitespace-nowrap items-center">
            {route && (
              <>
                {route.features?.whatIsThis && (
                  <Button
                    variant={showInfo.value ? "default" : "inverted"}
                    className={clsx(
                      "w-full border-y-0 border-l-0 min-w-[168.86px]",
                      showInfo.value && "text-primary-400"
                    )}
                    onClick={() => showInfo.set((v) => !v)}
                  >
                    {showInfo.value ? "Okay I get it!" : "What is this?"}
                  </Button>
                )}
                <span className="ml-4">{route.title}</span>
              </>
            )}
          </div>

          <Button asChild className="border-t-0 border-r-0 border-b-0 px-4 py-2">
            <Link to="/">
              <LayoutGridIcon />
            </Link>
          </Button>
        </div>
      </div>

      {/* <TanStackRouterDevtools position="top-right" /> */}
    </TaskManagerProvider>
  );
}
