import { ImageFile } from "@/helpers/image-file";
import React from "react";
import { Anchor } from "./sprite-extract.export";
import {
  clampRectToImage,
  computeBaseGrid,
  computeGrid,
  contentBounds,
  DEFAULT_SETTINGS,
  defaultSequence,
  detectGrid,
  detectionToState,
  EMPTY_OVERRIDES,
  parseSequence,
  RangeOverride,
  Rect,
  SequenceOrder,
  SpriteExtractOverrides,
  SpriteExtractSettings,
} from "./sprite-extract.model";

const STORAGE_KEY = "sprite-extract:settings";

function loadSettings(): SpriteExtractSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      padding: { ...DEFAULT_SETTINGS.padding, ...parsed?.padding },
      spacing: { ...DEFAULT_SETTINGS.spacing, ...parsed?.spacing },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface Core {
  settings: SpriteExtractSettings;
  overrides: SpriteExtractOverrides;
  sequence: number[];
  selected: number | null;
}

export type LineAxis = "column" | "row";
export type LineEdge = keyof RangeOverride;

export function useSpriteExtract() {
  const [imageFile, setImageFileState] = React.useState<ImageFile>();
  const [core, setCore] = React.useState<Core>(() => ({
    settings: loadSettings(),
    overrides: EMPTY_OVERRIDES,
    sequence: [],
    selected: null,
  }));
  const [anchor, setAnchor] = React.useState<Anchor>("center");
  const [fps, setFps] = React.useState(12);
  const [uniform, setUniform] = React.useState(true);

  const image = imageFile?.image;
  const width = image?.naturalWidth ?? 0;
  const height = image?.naturalHeight ?? 0;

  const { settings, overrides, sequence, selected } = core;

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  const grid = React.useMemo(
    () => computeGrid(width, height, settings, overrides),
    [width, height, settings, overrides]
  );

  /** Offscreen copy of the image for pixel reads. */
  const imageCtx = React.useMemo(() => {
    if (!image) return null;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0);
    return ctx;
  }, [image, width, height]);

  // -------------------------------------------------------------------------------------------------------------------
  // Image
  // -------------------------------------------------------------------------------------------------------------------

  const setImageFile = React.useCallback((file: ImageFile | undefined) => {
    setImageFileState(file);
    setCore((core) => {
      if (!file) return { ...core, overrides: EMPTY_OVERRIDES, sequence: [], selected: null };
      const w = file.image.naturalWidth;
      const h = file.image.naturalHeight;
      const base = computeBaseGrid(w, h, core.settings);
      return {
        ...core,
        overrides: EMPTY_OVERRIDES,
        sequence: defaultSequence(base.columns.length, base.rows.length),
        selected: null,
      };
    });
  }, []);

  // -------------------------------------------------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------------------------------------------------

  const patchSettings = React.useCallback(
    (patch: Partial<SpriteExtractSettings> | ((s: SpriteExtractSettings) => Partial<SpriteExtractSettings>)) => {
      setCore((core) => {
        const next = { ...core.settings, ...(typeof patch === "function" ? patch(core.settings) : patch) };
        if (!width || !height) return { ...core, settings: next };

        const before = computeBaseGrid(width, height, core.settings);
        const after = computeBaseGrid(width, height, next);
        const shapeChanged = before.columns.length !== after.columns.length || before.rows.length !== after.rows.length;

        if (!shapeChanged) return { ...core, settings: next };

        return {
          settings: next,
          overrides: EMPTY_OVERRIDES,
          sequence: defaultSequence(after.columns.length, after.rows.length),
          selected: null,
        };
      });
    },
    [width, height]
  );

  const setSetting = React.useCallback(
    <K extends keyof SpriteExtractSettings>(key: K, value: SpriteExtractSettings[K]) => patchSettings({ [key]: value }),
    [patchSettings]
  );

  const setPadding = React.useCallback(
    (side: keyof SpriteExtractSettings["padding"], value: number) =>
      patchSettings((s) => ({ padding: { ...s.padding, [side]: Math.max(0, Math.round(value)) } })),
    [patchSettings]
  );

  const setSpacing = React.useCallback(
    (axis: keyof SpriteExtractSettings["spacing"], value: number) =>
      patchSettings((s) => ({ spacing: { ...s.spacing, [axis]: Math.max(0, Math.round(value)) } })),
    [patchSettings]
  );

  // -------------------------------------------------------------------------------------------------------------------
  // Overrides
  // -------------------------------------------------------------------------------------------------------------------

  /** Set (or clear with `undefined`) one grid line override. Values are absolute image coordinates. */
  const setLine = React.useCallback((axis: LineAxis, index: number, edge: LineEdge, value: number | undefined) => {
    setCore((core) => {
      const key = axis === "column" ? "columns" : "rows";
      const current = { ...(core.overrides[key][index] ?? {}) };
      if (value === undefined) delete current[edge];
      else current[edge] = Math.round(value);

      const next = { ...core.overrides[key] };
      if (Object.keys(current).length) next[index] = current;
      else delete next[index];

      return { ...core, overrides: { ...core.overrides, [key]: next } };
    });
  }, []);

  const setFrameRect = React.useCallback(
    (index: number, rect: Rect) => {
      setCore((core) => ({
        ...core,
        overrides: {
          ...core.overrides,
          frames: { ...core.overrides.frames, [index]: clampRectToImage(rect, width, height) },
        },
      }));
    },
    [width, height]
  );

  const resetFrame = React.useCallback((index: number) => {
    setCore((core) => {
      if (!(index in core.overrides.frames)) return core;
      const frames = { ...core.overrides.frames };
      delete frames[index];
      return { ...core, overrides: { ...core.overrides, frames } };
    });
  }, []);

  const resetLines = React.useCallback(() => {
    setCore((core) => ({ ...core, overrides: { ...core.overrides, columns: {}, rows: {} } }));
  }, []);

  const resetOverrides = React.useCallback(() => {
    setCore((core) => ({ ...core, overrides: EMPTY_OVERRIDES }));
  }, []);

  const fitFrameToContent = React.useCallback(
    (index: number) => {
      if (!imageCtx) return;
      const frame = grid.frames[index];
      if (!frame) return;
      const bounds = contentBounds(imageCtx, frame);
      if (bounds) setFrameRect(index, bounds);
    },
    [imageCtx, grid.frames, setFrameRect]
  );

  const fitAllToContent = React.useCallback(() => {
    if (!imageCtx) return;
    setCore((core) => {
      const frames = { ...core.overrides.frames };
      grid.frames.forEach((frame, index) => {
        const bounds = contentBounds(imageCtx, frame);
        if (bounds) frames[index] = bounds;
      });
      return { ...core, overrides: { ...core.overrides, frames } };
    });
  }, [imageCtx, grid.frames]);

  const autoDetect = React.useCallback((): boolean => {
    if (!image) return false;
    const detected = detectGrid(image);
    if (!detected) return false;
    const next = detectionToState(width, height, detected, settings);
    setCore({
      settings: next.settings,
      overrides: next.overrides,
      sequence: defaultSequence(detected.columns.length, detected.rows.length),
      selected: null,
    });
    return true;
  }, [image, width, height, settings]);

  // -------------------------------------------------------------------------------------------------------------------
  // Sequence & selection
  // -------------------------------------------------------------------------------------------------------------------

  const setSelected = React.useCallback((index: number | null) => {
    setCore((core) => (core.selected === index ? core : { ...core, selected: index }));
  }, []);

  const setSequence = React.useCallback((sequence: number[]) => {
    setCore((core) => ({ ...core, sequence }));
  }, []);

  const setSequenceText = React.useCallback(
    (text: string): boolean => {
      const parsed = parseSequence(text, grid.frames.length);
      if (!parsed) return false;
      setSequence(parsed);
      return true;
    },
    [grid.frames.length, setSequence]
  );

  const resetSequence = React.useCallback(
    (order: SequenceOrder = "row", reverse = false) => {
      setSequence(defaultSequence(grid.columns.length, grid.rows.length, order, reverse));
    },
    [grid.columns.length, grid.rows.length, setSequence]
  );

  /** Remove every occurrence of `index` from the sequence, or append it when absent. */
  const toggleInSequence = React.useCallback((index: number) => {
    setCore((core) => {
      const present = core.sequence.includes(index);
      return {
        ...core,
        sequence: present ? core.sequence.filter((i) => i !== index) : [...core.sequence, index],
      };
    });
  }, []);

  const removeSequenceAt = React.useCallback((position: number) => {
    setCore((core) => ({ ...core, sequence: core.sequence.filter((_, i) => i !== position) }));
  }, []);

  const moveSequenceItem = React.useCallback((from: number, to: number) => {
    setCore((core) => {
      if (from === to || from < 0 || from >= core.sequence.length) return core;
      const next = [...core.sequence];
      const [item] = next.splice(from, 1);
      next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
      return { ...core, sequence: next };
    });
  }, []);

  return {
    imageFile,
    image,
    width,
    height,
    imageCtx,
    settings,
    overrides,
    grid,
    sequence,
    selected,
    anchor,
    fps,
    uniform,

    setImageFile,
    setSetting,
    setPadding,
    setSpacing,
    setLine,
    setFrameRect,
    resetFrame,
    resetLines,
    resetOverrides,
    fitFrameToContent,
    fitAllToContent,
    autoDetect,
    setSelected,
    setSequence,
    setSequenceText,
    resetSequence,
    toggleInSequence,
    removeSequenceAt,
    moveSequenceItem,
    setAnchor,
    setFps,
    setUniform,
  };
}

export type SpriteExtract = ReturnType<typeof useSpriteExtract>;
