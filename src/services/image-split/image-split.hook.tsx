import { ImageFile } from "@/helpers/image-file";
import { useDebounced } from "@/hooks/use-debounced";
import { useObjectState } from "@/hooks/use-object-state";
import { useStateResolve } from "@/hooks/use-state-resolve";
import React from "react";
import { ImageSplitService, ImageSplitServiceSettings } from "./image-split.service";

export function useImageSplitSettings() {
  return useObjectState<ImageSplitServiceSettings>(ImageSplitService.DEFAULT_SETTINGS);
}

export function useImageSplit(imageFile?: ImageFile, settings?: ImageSplitServiceSettings) {
  const [debouncedSettings] = useDebounced(settings, 150);

  const [state, resolve, extracted] = useStateResolve<Awaited<ReturnType<ImageSplitService["render"]>>>();

  const { current: service } = React.useRef<ImageSplitService>(new ImageSplitService());

  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    service.bind(ref);
  }, [service]);

  React.useEffect(() => {
    if (!imageFile) return;

    return resolve(service.render.bind(service), imageFile, debouncedSettings);
  }, [resolve, service, imageFile, debouncedSettings]);

  return {
    ref,
    service,
    state,
    ...extracted,
  };
}
