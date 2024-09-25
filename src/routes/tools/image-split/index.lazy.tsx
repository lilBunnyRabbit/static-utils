import { InputWrapper } from "@/components/input-wrapper";
import { ErrorComponent, ErrorElement } from "@/components/route/error-component";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavbar } from "@/context/navbar.context";
import { useTaskManager } from "@/context/task-manager.context";
import { ImageFile, useImageFileClipboard, useImageFileDrop } from "@/helpers/image-file";
import { ImageSplitServiceSettings, useImageSplit, useImageSplitSettings } from "@/services/image-split/";
import DownloadSplitCanvasTasks from "@/services/image-split/tasks/download-split-canvas";
import { TaskManager } from "@lilbunnyrabbit/task-manager";
import { createLazyFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import { Ellipsis, Loader2 } from "lucide-react";
import React from "react";

export const Route = createLazyFileRoute("/tools/image-split/")({
  component: ImageSplitRoute,
  errorComponent: ErrorComponent,
});

function ImageSplitRoute(): React.ReactNode {
  const { showInfo } = useNavbar();
  const [imageFile, setImageFile] = React.useState<ImageFile>();

  const { setTaskManager } = useTaskManager();

  const [settings, setSetting] = useImageSplitSettings();
  const { ref, isLoading, state, data } = useImageSplit(imageFile, settings);

  React.useEffect(() => {
    console.log("state", state);
  }, [state]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dropRef, { activeDrag }] = useImageFileDrop<HTMLDivElement>((images) => setImageFile(images[0]));

  useImageFileClipboard((images) => setImageFile(images[0]));

  return (
    <div
      ref={dropRef}
      className={clsx("grid grid-cols-[min-content,1fr] h-full w-full", activeDrag && "bg-primary-950")}
    >
      <div className="h-full w-64 rounded-xs border-r-2 border-foreground">
        <div className="p-4 flex flex-col gap-2 justify-between h-full">
          <div className="flex flex-col gap-2">
            <h3>Settings</h3>

            <Input
              label="Multiplier"
              tooltip=""
              type="number"
              value={settings.multiplier}
              min={0}
              max={300}
              onChange={(e) => setSetting("multiplier", e.target.valueAsNumber)}
            />

            <InputWrapper label="Direction" tooltip="* use this to do that and also do this">
              <Select
                value={settings.direction}
                onValueChange={(v) => setSetting("direction", v as ImageSplitServiceSettings["direction"])}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="x">X</SelectItem>
                  <SelectItem value="y">Y</SelectItem>
                </SelectContent>
              </Select>
            </InputWrapper>
          </div>

          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept="image/*"
            onChange={ImageFile.fromUpload((images) => setImageFile(images[0]))}
          />

          <Button
            className="!w-full"
            disabled={!data || !imageFile}
            onClick={() => {
              if (data && imageFile) {
                const taskManager = new TaskManager();
                taskManager.addTasks(
                  DownloadSplitCanvasTasks(
                    {
                      ...data,
                      filename: "tralala",
                    },
                    imageFile
                  )
                );
                taskManager.start();
                setTaskManager(taskManager);
              }
            }}
            children="Download"
          />
          <Button className="!w-full" onClick={() => fileInputRef.current?.click()} children="Upload" />
        </div>
      </div>

      <div
        className={clsx(
          "relative w-full h-full grid grid-cols-1 grid-rows-[1fr,min-content] place-items-center overflow-hidden p-8 gap-8",
          !imageFile && "opacity-0"
        )}
      >
        <canvas ref={ref} className="object-contain max-w-full max-h-full min-h-0 min-w-0 border-2 border-foreground" />

        <div className="h-10 border-2 border-foreground px-2 w-full flex items-center justify-center">
          {data && `${data.rows} × ${data.columns} (${data.size} px)`}
          {isLoading && <Ellipsis className="h-6 animate-pulse" />}
        </div>

        {isLoading && (
          <div className="absolute top-0 right-0 bottom-0 left-0 bg-background flex items-center justify-center">
            <Loader2 size={32} className="animate-spin" />
          </div>
        )}

        {state.status === "error" && (
          <div className="absolute top-0 right-0 bottom-0 left-0 bg-background flex items-center justify-center">
            <ErrorElement error={state.error} reset={() => window.location.reload()} />
          </div>
        )}

        {showInfo.value && (
          <div className="absolute top-0 right-0 bottom-0 left-0 bg-foreground text-background p-8">
            <h1 className="text-2xl font-bold pb-1 mb-2 border-b-2 border-current">Image Split</h1>

            <p className="mt-2">
              This tool allows you to split your image into smaller parts, ideal for layouts like Instagram grids. The
              image is divided based on the multiplier and axis settings, making it easy to create perfect grid patterns
              from a single image.
            </p>

            <p className="mt-2">
              You can customize the number of splits (multiplier) and the axis (horizontal or vertical) to create the
              exact number of parts needed. If the image isn't perfectly divisible, empty spaces will be left where
              necessary.
            </p>

            <p className="font-bold mt-4">Settings available:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Multiplier: Defines how many parts the image should be split into.</li>
              <li>Axis: Choose whether to split along the X-axis (horizontal) or Y-axis (vertical).</li>
            </ul>

            <p className="font-bold mt-4">How to use:</p>
            <ol className="list-decimal list-inside mt-2">
              <li>Upload your image.</li>
              <li>Select the multiplier to define how many parts you want to split the image into.</li>
              <li>Choose the axis: horizontal (X-axis) or vertical (Y-axis).</li>
              <li>Click "Split" to divide the image into smaller parts.</li>
            </ol>

            <p className="mt-4">
              This tool is perfect for creating Instagram grid layouts, banners, or any situation where you need to
              split an image into multiple parts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
