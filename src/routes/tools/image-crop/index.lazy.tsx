import { ErrorComponent, ErrorElement } from "@/components/route/error-component";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavbar } from "@/context/navbar.context";
import { ImageFile, useImageFileClipboard, useImageFileDrop } from "@/helpers/image-file";
import { useImageCrop, useImageCropSettings } from "@/services/image-crop";
import { createLazyFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import { ArrowRight, Ellipsis, Loader2 } from "lucide-react";
import React from "react";

export const Route = createLazyFileRoute("/tools/image-crop/")({
  component: ImageCropRoute,
  errorComponent: ErrorComponent,
});

function ImageCropRoute(): React.ReactNode {
  const { showInfo } = useNavbar();
  const [imageFile, setImageFile] = React.useState<ImageFile>();

  const [settings, setSetting] = useImageCropSettings();
  const { refs, isLoading, state, data } = useImageCrop(imageFile, settings);

  React.useEffect(() => {
    console.log("state", state);
  }, [state]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dropRef, { activeDrag }] = useImageFileDrop<HTMLDivElement>((images) => setImageFile(images[0]));

  useImageFileClipboard((images) => setImageFile(images[0]));

  return (
    <div ref={dropRef} className={clsx("grid grid-cols-[min-content,1fr]", activeDrag && "bg-primary-950")}>
      <div className="h-full w-64 rounded-xs border-r-2 border-foreground">
        <div className="p-4 flex flex-col gap-2 justify-between h-full">
          <div>
            <h3 className="mb-2">Settings</h3>

            <Input
              label="Alpha"
              tooltip="Maximum pixel transparency (0 - 100%)"
              suffix="%"
              type="number"
              value={settings.alphaLimit}
              min={0}
              max={100}
              onChange={(e) => setSetting("alphaLimit", e.target.valueAsNumber)}
            />
          </div>

          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept="image/*"
            onChange={ImageFile.fromUpload((images) => setImageFile(images[0]))}
          />

          <Button className="!w-full" onClick={() => fileInputRef.current?.click()} children="Upload" />
        </div>
      </div>

      <div
        className={clsx(
          "relative w-full h-full grid grid-cols-[1fr,min-content,1fr] grid-rows-[1fr,min-content] place-items-center overflow-hidden p-8 gap-8",
          !imageFile && "opacity-0"
        )}
      >
        <canvas
          ref={refs.original}
          className="object-contain"
          style={{
            imageRendering: "pixelated",
          }}
        />
        {isLoading ? <Loader2 size={32} className="animate-spin" /> : <ArrowRight size={32} />}
        <canvas
          ref={refs.cropped}
          className="object-contain"
          style={{
            imageRendering: "pixelated",
          }}
        />

        <div className="h-10 border-2 border-foreground px-2 w-full flex items-center justify-center">
          {data && `${data.original.width} × ${data.original.height} px`}
          {isLoading && <Ellipsis className="h-6 animate-pulse" />}
        </div>
        <div />
        <div className="h-10 border-2 border-foreground px-2 w-full flex items-center justify-center">
          {data && `${data.crop.width} × ${data.crop.height} px`}
          {isLoading && <Ellipsis className="h-6 animate-pulse" />}
        </div>

        {state.status === "error" && (
          <div className="absolute top-0 right-0 bottom-0 left-0 bg-background flex items-center justify-center">
            <ErrorElement error={state.error} reset={() => window.location.reload()} />
          </div>
        )}

        {showInfo.value && (
          <div className="absolute top-0 right-0 bottom-0 left-0 bg-foreground text-background p-8">
            <h1 className="text-2xl font-bold pb-1 mb-2 border-b-2 border-current">Image Crop</h1>

            <p className="mt-2">
              This tool trims your image from all sides until it detects pixels larger than the selected alpha level. It
              automatically removes transparent areas, ensuring the cropped image is as large as possible without
              unwanted transparency.
            </p>

            <p className="mt-2">
              You can upload any image, set the alpha threshold, and the tool will crop the image down to its visible
              content.
            </p>

            <p className="font-bold mt-4">How to use:</p>
            <ol className="list-decimal list-inside mt-2">
              <li>Upload your image file.</li>
              <li>Adjust the alpha level to define which pixels should be considered transparent.</li>
              <li>Let the tool automatically crop the image, removing all transparent borders.</li>
            </ol>

            <p className="font-bold mt-4">Ways to upload:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Click the "Upload" button.</li>
              <li>Drag and drop the image into the tool.</li>
              <li>Paste the image from your clipboard.</li>
            </ul>

            <p className="mt-4">
              This tool is ideal for cleaning up images with transparency and ensuring your content occupies as much
              space as possible.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
