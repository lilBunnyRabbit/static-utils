import { InputWrapper } from "@/components/input-wrapper";
import { ErrorComponent, ErrorElement } from "@/components/route/error-component";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useNavbar } from "@/context/navbar.context";
import { ImageFile, useImageFileClipboard, useImageFileDrop } from "@/helpers/image-file";
import { ImageConcatServiceSettings, useImageConcat, useImageConcatSettings } from "@/services/image-concat";
import { createLazyFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import React from "react";
import classes from "./index.module.scss";

export const Route = createLazyFileRoute("/tools/image-concat/")({
  component: ImageConcatRoute,
  errorComponent: ErrorComponent,
});

function ImageConcatRoute(): React.ReactNode {
  const { showInfo } = useNavbar();
  const [imageFiles, setImageFiles] = React.useState<ImageFile[]>([]);
  const [zoom, setZoom] = React.useState<number | undefined>(50);

  const [settings, setSetting] = useImageConcatSettings();
  const { ref, isLoading, error, state } = useImageConcat(imageFiles, settings);

  React.useEffect(() => {
    console.log("state", state);
  }, [state]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dropRef, { activeDrag }] = useImageFileDrop<HTMLDivElement>((images) =>
    setImageFiles((current) => [...current, ...images])
  );

  useImageFileClipboard((images) => setImageFiles((current) => [...current, ...images]));

  return (
    <div
      ref={dropRef}
      className={clsx("grid grid-cols-[min-content,1fr] overflow-hidden", activeDrag && "bg-primary-950")}
    >
      <div className="h-full w-64 rounded-xs border-r-2 border-foreground">
        <div className="p-4 h-full flex flex-col gap-2 justify-between">
          <div className="flex flex-col gap-2">
            <h3>Settings</h3>

            <Input
              label="Gap"
              tooltip="* use this to do that and also do this"
              suffix="px"
              type="number"
              value={settings.gap}
              min={0}
              max={100}
              onChange={(e) => setSetting("gap", e.target.valueAsNumber)}
            />

            <InputWrapper label="Align" tooltip="* use this to do that and also do this">
              <Select
                value={settings.align}
                onValueChange={(v) => setSetting("align", v as ImageConcatServiceSettings["align"])}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Align" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">Start</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="end">End</SelectItem>
                </SelectContent>
              </Select>
            </InputWrapper>

            <Input
              label="Background"
              tooltip="* use this to do that and also do this"
              type="color"
              value={settings.background}
              onChange={(e) => setSetting("background", e.target.value)}
            />

            <Input
              label="Bg Alpha"
              tooltip="* use this to do that and also do this"
              suffix="%"
              type="number"
              variant="ghost"
              value={settings.alpha}
              min={0}
              max={100}
              onChange={(e) => setSetting("alpha", e.target.valueAsNumber)}
            />

            <InputWrapper
              label={settings.fit ? "Fit size" : "Original size"}
              tooltip="* use this to do that and also do this"
            >
              <Switch checked={settings.fit} onCheckedChange={(checked) => setSetting("fit", !!checked)} />
            </InputWrapper>

            <InputWrapper
              label={settings.direction === "column" ? "Y-Axis" : "X-Axis"}
              tooltip="* use this to do that and also do this"
            >
              <Switch
                checked={settings.direction === "column"}
                onCheckedChange={(checked) => setSetting("direction", checked ? "column" : "row")}
              />
            </InputWrapper>

            <Input
              label="Zoom"
              tooltip="* use this to do that and also do this"
              type="number"
              value={zoom}
              min={0}
              max={100}
              onChange={(e) => setZoom(e.target.valueAsNumber)}
            />

            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              multiple
              accept="image/*"
              onChange={ImageFile.fromUpload((images) => setImageFiles((current) => [...current, ...images]))}
            />
          </div>

          <Button className="!w-full" onClick={() => fileInputRef.current?.click()} children="Upload" />
        </div>
      </div>

      <div
        data-direction={settings.direction}
        className={clsx("relative p-8", classes["canvas-wrapper"], isLoading && "animate-spin")}
      >
        <canvas
          ref={ref}
          className={clsx("border-2 border-foreground", !imageFiles.length && "hidden")}
          style={{
            [settings.direction === "column" ? "maxWidth" : "maxHeight"]: `${zoom}%`,
          }}
        />

        {error && (
          <div className="absolute top-0 right-0 bottom-0 left-0 bg-background p-8">
            <ErrorElement error={error} reset={() => window.location.reload()} />
          </div>
        )}

        {showInfo.value && (
          <div className="absolute top-0 right-0 bottom-0 left-0 bg-foreground text-background p-8">
            <h1 className="text-2xl font-bold pb-1 mb-2 border-b-2 border-current">Image Concat</h1>

            <p className="mt-2">
              This tool allows you to join multiple images into one, giving you full control over how they are combined.
            </p>

            <p className="mt-2">
              You can customize various settings to control the appearance of the concatenated image, including gap
              size, alignment, background color, and more.
            </p>

            <p className="font-bold mt-4">Settings available:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Gap between images in pixels</li>
              <li>Alignment: start, center, or end</li>
              <li>Background color and alpha</li>
              <li>Size options: "Original size" or "Fit largest"</li>
              <li>Join images along the X or Y axis</li>
            </ul>

            <p className="font-bold mt-4">How to use:</p>
            <ol className="list-decimal list-inside mt-2">
              <li>Upload the images you want to concatenate.</li>
              <li>Adjust the settings to your preference, including alignment, gap size, and background color.</li>
              <li>Select whether to join the images horizontally (X-axis) or vertically (Y-axis).</li>
              <li>Click "Join" to merge the images into one file.</li>
            </ol>

            <p className="mt-4">
              This tool is perfect for combining multiple images into a single file, whether for creating sprites,
              banners, or collages.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
