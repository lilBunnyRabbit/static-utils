import { ImageFile } from "@/helpers/image-file";
import { useDebounced } from "@/hooks/use-debounced";
import { useObjectState } from "@/hooks/use-object-state";
import { useStateResolve } from "@/hooks/use-state-resolve";
import React from "react";
import { ImageCropService, ImageCropServiceSettings } from "./image-crop.service";

export function useImageCropSettings() {
  return useObjectState<ImageCropServiceSettings>(ImageCropService.DEFAULT_SETTINGS);
}

export function useImageCrop(imageFile?: ImageFile, settings?: ImageCropServiceSettings) {
  const [debouncedSettings] = useDebounced(settings, 150);

  const [state, resolve, extracted] = useStateResolve<Awaited<ReturnType<ImageCropService["render"]>>>();

  const { current: service } = React.useRef<ImageCropService>(new ImageCropService());

  const originalRef = React.useRef<HTMLCanvasElement>(null);
  const croppedRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    service.bind({ original: originalRef, cropped: croppedRef });
  }, [service]);

  React.useEffect(() => {
    if (!imageFile) return;

    return resolve(service.render.bind(service), imageFile, debouncedSettings);
  }, [resolve, service, imageFile, debouncedSettings]);

  return {
    refs: {
      original: originalRef,
      cropped: croppedRef,
    },
    service,
    state,
    ...extracted,
  };
}
