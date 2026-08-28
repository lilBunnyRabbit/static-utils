import { Filmstrip } from "@/components/sprite-extract/filmstrip";
import { PreviewPlayer, PreviewPlayerHandle } from "@/components/sprite-extract/preview-player";
import { SheetCanvas, SheetCanvasHandle } from "@/components/sprite-extract/sheet-canvas";
import { ErrorComponent } from "@/components/route/error-component";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputWrapper } from "@/components/input-wrapper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavbar } from "@/context/navbar.context";
import { ImageFile, useImageFileClipboard, useImageFileDrop } from "@/helpers/image-file";
import {
  Anchor,
  ANCHORS,
  exportFramesZip,
  exportSheet,
  formatSequence,
  GridMode,
  parseSequence,
  useSpriteExtract,
} from "@/services/sprite-extract";
import { createLazyFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import {
  ArrowDownUp,
  Columns3,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  Maximize,
  Rows3,
  ScanSearch,
  Tag,
  Trash2,
  Upload,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import React from "react";

export const Route = createLazyFileRoute("/tools/sprite-extract/")({
  component: SpriteExtractRoute,
  errorComponent: ErrorComponent,
});

function SpriteExtractRoute(): React.ReactNode {
  const { showInfo } = useNavbar();
  const sprite = useSpriteExtract();
  const {
    imageFile,
    image,
    width,
    height,
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
    resetSequence,
    toggleInSequence,
    removeSequenceAt,
    moveSequenceItem,
    setAnchor,
    setFps,
    setUniform,
  } = sprite;

  const canvasRef = React.useRef<SheetCanvasHandle>(null);
  const playerRef = React.useRef<PreviewPlayerHandle>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [zoom, setZoom] = React.useState(1);
  const [showLabels, setShowLabels] = React.useState(true);
  const [sheetColumns, setSheetColumns] = React.useState(0);
  const [exporting, setExporting] = React.useState<number | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const load = React.useCallback((images: ImageFile[]) => images[0] && setImageFile(images[0]), [setImageFile]);
  const [dropRef, { activeDrag }] = useImageFileDrop<HTMLDivElement>(load);
  useImageFileClipboard(load);

  // -------------------------------------------------------------------------------------------------------------------
  // Sequence text (two-way, applied live when valid)
  // -------------------------------------------------------------------------------------------------------------------

  const [sequenceText, setSequenceText] = React.useState("");
  const [sequenceValid, setSequenceValid] = React.useState(true);
  const sequenceFocused = React.useRef(false);

  React.useEffect(() => {
    if (sequenceFocused.current) return;
    setSequenceText(formatSequence(sequence));
    setSequenceValid(true);
  }, [sequence]);

  const onSequenceText = (text: string) => {
    setSequenceText(text);
    const parsed = parseSequence(text, grid.frames.length);
    setSequenceValid(!!parsed);
    if (parsed) setSequence(parsed);
  };

  // -------------------------------------------------------------------------------------------------------------------
  // Notices
  // -------------------------------------------------------------------------------------------------------------------

  React.useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(id);
  }, [notice]);

  // -------------------------------------------------------------------------------------------------------------------
  // Keyboard
  // -------------------------------------------------------------------------------------------------------------------

  React.useEffect(() => {
    if (!image) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey) return;

      const frame = selected !== null ? grid.frames[selected] : null;
      const step = e.shiftKey ? 10 : 1;

      switch (e.key) {
        case "ArrowLeft":
        case "ArrowRight":
        case "ArrowUp":
        case "ArrowDown": {
          if (selected === null || !frame) return;
          e.preventDefault();
          const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
          const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
          if (e.altKey) {
            setFrameRect(selected, { ...frame, w: Math.max(1, frame.w + dx), h: Math.max(1, frame.h + dy) });
          } else {
            setFrameRect(selected, { ...frame, x: frame.x + dx, y: frame.y + dy });
          }
          return;
        }
        case "Delete":
        case "Backspace":
          if (selected === null) return;
          e.preventDefault();
          toggleInSequence(selected);
          return;
        case "Escape":
          setSelected(null);
          return;
        case "r":
          if (selected !== null) resetFrame(selected);
          return;
        case "c":
          if (selected !== null) fitFrameToContent(selected);
          return;
        case "f":
          canvasRef.current?.fit();
          return;
        case "p":
          playerRef.current?.toggle();
          return;
        case "[":
          playerRef.current?.prev();
          return;
        case "]":
          playerRef.current?.next();
          return;
        case "l":
          setShowLabels((v) => !v);
          return;
        case "+":
        case "=":
          canvasRef.current?.zoomBy(1.25);
          return;
        case "-":
          canvasRef.current?.zoomBy(1 / 1.25);
          return;
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [image, grid.frames, selected, setFrameRect, toggleInSequence, setSelected, resetFrame, fitFrameToContent]);

  // -------------------------------------------------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------------------------------------------------

  const onAutoDetect = () => {
    const ok = autoDetect();
    setNotice(ok ? "Grid detected from transparent gaps." : "Could not detect a grid — no clear gaps between frames.");
  };

  const exportOptions = () => ({
    filename: imageFile?.file.name ?? "sprite.png",
    uniform,
    anchor,
    sheetColumns: sheetColumns || grid.columns.length || sequence.length,
    fps,
  });

  const onDownloadFrames = async () => {
    if (!image || !sequence.length) return;
    setExporting(0);
    try {
      await exportFramesZip(image, grid.frames, sequence, exportOptions(), setExporting);
    } catch (e) {
      console.error(e);
      setNotice(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(null);
    }
  };

  const onDownloadSheet = async () => {
    if (!image || !sequence.length) return;
    setExporting(0.5);
    try {
      await exportSheet(image, grid.frames, sequence, exportOptions());
    } catch (e) {
      console.error(e);
      setNotice(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(null);
    }
  };

  const selectedFrame = selected !== null ? grid.frames[selected] : null;
  const selectedIncluded = selected !== null && sequence.includes(selected);
  const overrideCount =
    Object.keys(overrides.frames).length + Object.keys(overrides.columns).length + Object.keys(overrides.rows).length;

  const numberInput = (
    label: string,
    value: number,
    onChange: (v: number) => void,
    props?: Partial<React.ComponentProps<typeof Input>>
  ) => (
    <Input
      label={label}
      type="number"
      value={Number.isFinite(value) ? Math.round(value) : ""}
      onChange={(e) => {
        const v = e.target.valueAsNumber;
        if (Number.isFinite(v)) onChange(v);
      }}
      onFocus={(e) => e.target.select()}
      {...props}
    />
  );

  return (
    <div
      ref={dropRef}
      className={clsx(
        "grid grid-cols-[min-content,1fr,min-content] h-full w-full min-h-0",
        activeDrag && "bg-primary-950"
      )}
    >
      {/* ---------------------------------------------------------------- Left: settings */}
      <div className="h-full w-72 border-r-2 border-foreground overflow-y-auto">
        <div className="p-4 flex flex-col gap-2">
          <h3 className="font-bold">Sheet</h3>

          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept="image/*"
            onChange={(e) => {
              ImageFile.fromUpload(load)(e);
              e.target.value = "";
            }}
          />
          <Button className="!w-full gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Upload
          </Button>
          {imageFile ? (
            <p className="text-xs text-foreground/60 break-all">
              {imageFile.file.name} · {width}×{height}
            </p>
          ) : (
            <p className="text-xs text-foreground/60">PNG / JPG / WebP. Drag & drop or paste also work.</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              className="gap-1 px-2"
              disabled={!image}
              onClick={onAutoDetect}
              title="Detect grid from transparent gaps"
            >
              <ScanSearch size={14} /> Detect
            </Button>
            <Button
              className="gap-1 px-2"
              disabled={!image || !overrideCount}
              onClick={resetOverrides}
              title="Clear every manual line / frame adjustment"
            >
              <Trash2 size={14} /> Reset ({overrideCount})
            </Button>
          </div>

          <h3 className="font-bold mt-3">Grid</h3>

          <InputWrapper label="Mode">
            <Select value={settings.mode} onValueChange={(v) => setSetting("mode", v as GridMode)}>
              <SelectTrigger className="flex-1 h-6 border-0 rounded-none text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Columns × rows</SelectItem>
                <SelectItem value="size">Frame size</SelectItem>
              </SelectContent>
            </Select>
          </InputWrapper>

          {settings.mode === "grid" ? (
            <div className="grid grid-cols-2 gap-2">
              {numberInput("Cols", settings.columns, (v) => setSetting("columns", Math.max(1, v)), { min: 1 })}
              {numberInput("Rows", settings.rows, (v) => setSetting("rows", Math.max(1, v)), { min: 1 })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {numberInput("W", settings.frameWidth, (v) => setSetting("frameWidth", Math.max(1, v)), { min: 1 })}
              {numberInput("H", settings.frameHeight, (v) => setSetting("frameHeight", Math.max(1, v)), { min: 1 })}
            </div>
          )}

          <p className="text-xs text-foreground/60 mt-1">
            Padding <span className="text-foreground/40">(outer margin, px)</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {numberInput("L", settings.padding.left, (v) => setPadding("left", v), { min: 0 })}
            {numberInput("R", settings.padding.right, (v) => setPadding("right", v), { min: 0 })}
            {numberInput("T", settings.padding.top, (v) => setPadding("top", v), { min: 0 })}
            {numberInput("B", settings.padding.bottom, (v) => setPadding("bottom", v), { min: 0 })}
          </div>

          <p className="text-xs text-foreground/60 mt-1">
            Spacing <span className="text-foreground/40">(gap between frames, px)</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {numberInput("X", settings.spacing.x, (v) => setSpacing("x", v), { min: 0 })}
            {numberInput("Y", settings.spacing.y, (v) => setSpacing("y", v), { min: 0 })}
          </div>

          <p className="text-xs text-foreground/50 mt-1">
            {grid.columns.length} × {grid.rows.length} = {grid.frames.length} frames
            {grid.columns[0] && grid.rows[0] && (
              <>
                {" · "}
                {Math.round(grid.columns[0].end - grid.columns[0].start)}×
                {Math.round(grid.rows[0].end - grid.rows[0].start)} px
              </>
            )}
          </p>

          <Button
            className="!w-full gap-2 mt-1"
            disabled={!Object.keys(overrides.columns).length && !Object.keys(overrides.rows).length}
            onClick={resetLines}
            title="Snap all dragged grid lines back to the uniform grid"
          >
            <Columns3 size={14} /> Reset lines
          </Button>

          <h3 className="font-bold mt-3">
            Frame {selected !== null && <span className="text-foreground/60">#{selected}</span>}
          </h3>

          {selectedFrame && selected !== null ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {numberInput("X", selectedFrame.x, (v) => setFrameRect(selected, { ...selectedFrame, x: v }))}
                {numberInput("Y", selectedFrame.y, (v) => setFrameRect(selected, { ...selectedFrame, y: v }))}
                {numberInput(
                  "W",
                  selectedFrame.w,
                  (v) => setFrameRect(selected, { ...selectedFrame, w: Math.max(1, v) }),
                  {
                    min: 1,
                  }
                )}
                {numberInput(
                  "H",
                  selectedFrame.h,
                  (v) => setFrameRect(selected, { ...selectedFrame, h: Math.max(1, v) }),
                  {
                    min: 1,
                  }
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="gap-1 px-2"
                  onClick={() => fitFrameToContent(selected)}
                  title="Shrink to visible pixels (C)"
                >
                  <Crosshair size={14} /> Fit content
                </Button>
                <Button
                  className="gap-1 px-2"
                  disabled={!overrides.frames[selected]}
                  onClick={() => resetFrame(selected)}
                  title="Back to grid cell (R)"
                >
                  <Wand2 size={14} /> Reset
                </Button>
                <Button
                  className="gap-1 px-2 col-span-2"
                  variant={selectedIncluded ? "default" : "inverted"}
                  onClick={() => toggleInSequence(selected)}
                  title="Toggle frame in sequence (Del)"
                >
                  {selectedIncluded ? <EyeOff size={14} /> : <Eye size={14} />}
                  {selectedIncluded ? "Exclude from sequence" : "Include in sequence"}
                </Button>
              </div>
              <p className="text-xs text-foreground/50">Arrows move · Shift ×10 · Alt+arrows resize</p>
            </>
          ) : (
            <p className="text-xs text-foreground/60">
              Click a frame on the sheet to adjust it. Drag it or its handles, or use arrow keys.
            </p>
          )}

          <Button
            className="!w-full gap-2"
            disabled={!image}
            onClick={fitAllToContent}
            title="Shrink every frame to its visible pixels (breaks alignment — use with uniform export + anchor)"
          >
            <Crosshair size={14} /> Fit all to content
          </Button>

          <h3 className="font-bold mt-3">Export</h3>

          <InputWrapper label="Anchor" tooltip="Where a smaller frame sits inside the uniform cell">
            <Select value={anchor} onValueChange={(v) => setAnchor(v as Anchor)}>
              <SelectTrigger className="flex-1 h-6 border-0 rounded-none text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANCHORS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InputWrapper>

          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-primary-400"
              checked={uniform}
              onChange={(e) => setUniform(e.target.checked)}
            />
            Uniform frame size (zip)
          </label>

          {numberInput("Sheet cols", sheetColumns, (v) => setSheetColumns(Math.max(0, v)), {
            min: 0,
            placeholder: String(grid.columns.length),
            title: "Columns in the repacked sheet. 0 = same as source grid.",
          })}

          <Button
            className="!w-full gap-2"
            disabled={!image || !sequence.length || exporting !== null}
            onClick={onDownloadFrames}
          >
            <Download size={16} /> Frames (zip)
          </Button>
          <Button
            className="!w-full gap-2"
            disabled={!image || !sequence.length || exporting !== null}
            onClick={onDownloadSheet}
          >
            <Download size={16} /> Clean sheet (png)
          </Button>
          {exporting !== null && (
            <div className="h-1 w-full bg-foreground/20">
              <div
                className="h-full bg-primary-400 transition-all"
                style={{ width: `${Math.round(exporting * 100)}%` }}
              />
            </div>
          )}
          <p className="text-xs text-foreground/50">Both include a JSON with source rects and order.</p>
        </div>
      </div>

      {/* ---------------------------------------------------------------- Center: sheet */}
      <div className="relative h-full w-full min-w-0 min-h-0 grid grid-cols-1 grid-rows-[min-content,1fr]">
        <div className="flex items-center gap-1 px-2 h-10 border-b-2 border-foreground text-xs min-w-0 overflow-hidden">
          <Button
            size="icon"
            className="h-7 w-7"
            disabled={!image}
            onClick={() => canvasRef.current?.zoomBy(1 / 1.25)}
            title="Zoom out (-)"
          >
            <ZoomOut size={14} />
          </Button>
          <span className="w-14 text-center font-hack text-foreground/80">{Math.round(zoom * 100)}%</span>
          <Button
            size="icon"
            className="h-7 w-7"
            disabled={!image}
            onClick={() => canvasRef.current?.zoomBy(1.25)}
            title="Zoom in (+)"
          >
            <ZoomIn size={14} />
          </Button>
          <Button
            size="icon"
            className="h-7 w-7"
            disabled={!image}
            onClick={() => canvasRef.current?.fit()}
            title="Fit (F)"
          >
            <Maximize size={14} />
          </Button>
          <Button
            size="icon"
            className="h-7 w-7"
            variant={showLabels ? "inverted" : "default"}
            disabled={!image}
            onClick={() => setShowLabels((v) => !v)}
            title="Toggle frame labels (L)"
          >
            <Tag size={14} />
          </Button>

          <span className="ml-auto min-w-0 truncate text-foreground/50 hidden xl:inline">
            drag lines · click frame · drag frame / handles · dbl-click toggle · space/alt/middle drag pan ·
            ⌘/ctrl+scroll zoom
          </span>

          {notice && (
            <span className="ml-2 shrink-0 px-2 py-0.5 bg-foreground text-background whitespace-nowrap">{notice}</span>
          )}
        </div>

        <div className="relative min-h-0 min-w-0">
          <SheetCanvas
            ref={canvasRef}
            image={image}
            width={width}
            height={height}
            grid={grid}
            overrides={overrides}
            selected={selected}
            sequence={sequence}
            showLabels={showLabels}
            onSelect={setSelected}
            onToggleInSequence={toggleInSequence}
            onSetLine={setLine}
            onSetPadding={setPadding}
            onSetFrameRect={setFrameRect}
            onZoomChange={setZoom}
          />

          {!image && (
            <div className="absolute inset-0 flex items-center justify-center text-foreground/60 pointer-events-none">
              <div className="text-center">
                <p className="text-lg mb-2">No sprite sheet loaded</p>
                <p className="text-sm">Upload, drag & drop, or paste an image.</p>
              </div>
            </div>
          )}
        </div>

        {showInfo.value && (
          <div className="absolute inset-0 bg-foreground text-background p-8 overflow-auto z-10">
            <h1 className="text-2xl font-bold pb-1 mb-2 border-b-2 border-current">Sprite Sheet Extractor</h1>

            <p className="mt-2">
              Slice an imperfect (e.g. AI-generated) sprite sheet into frames. Define the grid, fix the parts that don't
              line up, preview the animation, then export frames or a clean, evenly packed sheet.
            </p>

            <p className="font-bold mt-4">Workflow:</p>
            <ol className="list-decimal list-inside mt-2">
              <li>Load the sheet. Try "Detect" — it finds gaps in transparent sheets.</li>
              <li>Set columns × rows (or frame size), padding and spacing until the grid roughly matches.</li>
              <li>Drag any grid line to fix a row/column that is off. Outer lines change padding.</li>
              <li>Click a frame to fine-tune it: drag it, resize with handles, or nudge with arrow keys.</li>
              <li>
                Double-click (or Del) to exclude a frame. Reorder in the sequence panel or type ranges like "0-7, 15-8".
              </li>
              <li>Export frames as a zip or a repacked sheet — both include JSON with the source rects.</li>
            </ol>

            <p className="font-bold mt-4">Colors on the sheet:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Green lines — uniform grid. Purple lines — manually dragged.</li>
              <li>Green frame outline — frame has a manual rect. White — selected.</li>
              <li>Red cross — frame excluded from the sequence. Red tint — spacing gaps. Dark — padding.</li>
            </ul>

            <p className="font-bold mt-4">Keyboard:</p>
            <ul className="list-disc list-inside mt-2">
              <li>
                <strong>Arrows</strong> — move selected frame (Shift ×10, Alt = resize)
              </li>
              <li>
                <strong>Del</strong> — toggle selected frame in sequence · <strong>R</strong> — reset frame ·{" "}
                <strong>C</strong> — fit to content
              </li>
              <li>
                <strong>P</strong> — play / pause · <strong>[ ]</strong> — step preview
              </li>
              <li>
                <strong>F</strong> — fit view · <strong>+ / -</strong> — zoom · <strong>L</strong> — labels ·{" "}
                <strong>Esc</strong> — deselect
              </li>
              <li>
                <strong>Space / Alt / middle mouse</strong> + drag — pan · <strong>⌘/Ctrl + scroll</strong> — zoom
              </li>
            </ul>

            <p className="mt-4">
              All processing happens in your browser — nothing is uploaded. Grid settings persist between visits.
            </p>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- Right: preview + sequence */}
      <div className="h-full w-72 border-l-2 border-foreground min-h-0 grid grid-rows-[min-content,min-content,1fr] overflow-hidden">
        <div className="p-4 pb-2 flex flex-col gap-2">
          <h3 className="font-bold">Preview</h3>
          <PreviewPlayer
            ref={playerRef}
            image={image}
            frames={grid.frames}
            sequence={sequence}
            fps={fps}
            anchor={anchor}
            selected={selected}
            className="h-64"
            onSelect={setSelected}
          />
          {numberInput("FPS", fps, (v) => setFps(Math.max(1, Math.min(120, v))), { min: 1, max: 120 })}
        </div>

        <div className="px-4 pt-2 flex flex-col gap-2">
          <h3 className="font-bold">
            Sequence <span className="text-foreground/60 text-sm">({sequence.length})</span>
          </h3>
          <div className="grid grid-cols-3 gap-1">
            <Button
              className="gap-1 px-1 text-xs h-7"
              disabled={!image}
              onClick={() => resetSequence("row")}
              title="Row-major order"
            >
              <Rows3 size={12} /> Rows
            </Button>
            <Button
              className="gap-1 px-1 text-xs h-7"
              disabled={!image}
              onClick={() => resetSequence("column")}
              title="Column-major order"
            >
              <Columns3 size={12} /> Cols
            </Button>
            <Button
              className="gap-1 px-1 text-xs h-7"
              disabled={!image || !sequence.length}
              onClick={() => setSequence([...sequence].reverse())}
              title="Reverse current order"
            >
              <ArrowDownUp size={12} /> Rev
            </Button>
          </div>
          <div className={clsx(!sequenceValid && "[&_*]:!border-red-500 [&_label]:!bg-red-500")}>
            <Input
              label="Order"
              tooltip='Frame indices, e.g. "0-7, 9, 15-8". Ranges are inclusive and may go backwards.'
              value={sequenceText}
              spellCheck={false}
              disabled={!image}
              onFocus={() => (sequenceFocused.current = true)}
              onBlur={() => {
                sequenceFocused.current = false;
                setSequenceText(formatSequence(sequence));
                setSequenceValid(true);
              }}
              onChange={(e) => onSequenceText(e.target.value)}
            />
          </div>
        </div>

        <Filmstrip
          className="px-4 pb-4 pt-2"
          image={image}
          frames={grid.frames}
          sequence={sequence}
          selected={selected}
          onSelect={setSelected}
          onRemoveAt={removeSequenceAt}
          onMove={moveSequenceItem}
        />
      </div>
    </div>
  );
}
