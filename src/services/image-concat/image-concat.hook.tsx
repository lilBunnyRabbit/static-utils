import { ImageFile } from "@/helpers/image-file";
import { useObjectState } from "@/hooks/use-object-state";
import { useStateResolve } from "@/hooks/use-state-resolve";
import React from "react";
import { ImageConcatService, ImageConcatServiceSettings } from "./image-concat.service";
import { useDebounced } from "@/hooks/use-debounced";

export function useImageConcatSettings() {
  return useObjectState<ImageConcatServiceSettings>(ImageConcatService.DEFAULT_SETTINGS);
}

export function useImageConcat(imageFiles?: ImageFile[], settings?: ImageConcatServiceSettings) {
  const [debouncedSettings] = useDebounced(settings, 150);

  const [state, resolve, extracted] = useStateResolve<Awaited<ReturnType<ImageConcatService["render"]>>>();

  const { current: service } = React.useRef<ImageConcatService>(new ImageConcatService());

  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    service.bind(ref);
  }, [service]);

  React.useEffect(() => {
    if (!imageFiles) return;

    return resolve(service.render.bind(service), imageFiles, debouncedSettings);
  }, [resolve, service, imageFiles, debouncedSettings]);

  return {
    ref,
    service,
    state,
    ...extracted,
  };
}
