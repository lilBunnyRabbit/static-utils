import { ImageFile } from "@/helpers/image-file";
import { useDebounced } from "@/hooks/use-debounced";
import { useObjectState } from "@/hooks/use-object-state";
import { useStateResolve } from "@/hooks/use-state-resolve";
import React from "react";
import { BackgroundRemoveService, BackgroundRemoveServiceSettings } from "./background-remove.service";

export function useBackgroundRemoveSettings() {
  return useObjectState<BackgroundRemoveServiceSettings>(BackgroundRemoveService.DEFAULT_SETTINGS);
}

export function useBackgroundRemove(imageFile?: ImageFile, settings?: BackgroundRemoveServiceSettings) {
  const [debouncedSettings] = useDebounced(settings, 150);

  const [state, resolve, extracted] = useStateResolve<Awaited<ReturnType<BackgroundRemoveService["render"]>>>();

  const { current: service } = React.useRef<BackgroundRemoveService>(new BackgroundRemoveService());

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
