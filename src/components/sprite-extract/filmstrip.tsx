import { Rect } from "@/services/sprite-extract";
import clsx from "clsx";
import { X } from "lucide-react";
import React from "react";
import { FrameThumb } from "./frame-thumb";

export interface FilmstripProps {
  image: CanvasImageSource | undefined;
  frames: Rect[];
  sequence: number[];
  selected: number | null;
  className?: string;
  onSelect: (index: number) => void;
  onRemoveAt: (position: number) => void;
  onMove: (from: number, to: number) => void;
}

const THUMB = 44;

/** Ordered list of sequence entries. Click selects the frame, drag reorders, × removes. */
export const Filmstrip: React.FC<FilmstripProps> = ({
  image,
  frames,
  sequence,
  selected,
  className,
  onSelect,
  onRemoveAt,
  onMove,
}) => {
  const [dragFrom, setDragFrom] = React.useState<number | null>(null);
  const [dropAt, setDropAt] = React.useState<number | null>(null);

  const finish = () => {
    setDragFrom(null);
    setDropAt(null);
  };

  if (!image) return null;

  return (
    <div className={clsx("flex flex-wrap gap-1 content-start overflow-auto min-h-0", className)}>
      {sequence.map((index, position) => {
        const rect = frames[index];
        if (!rect) return null;
        const isSelected = index === selected;
        const isDropTarget = dropAt === position && dragFrom !== null && dragFrom !== position;

        return (
          <div
            key={`${position}-${index}`}
            draggable
            onDragStart={(e) => {
              setDragFrom(position);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(position));
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dropAt !== position) setDropAt(position);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const from = dragFrom ?? Number(e.dataTransfer.getData("text/plain"));
              if (Number.isFinite(from)) onMove(from, position);
              finish();
            }}
            onDragEnd={finish}
            onClick={() => onSelect(index)}
            title={`Position ${position + 1} · frame #${index}\nClick to select, drag to reorder`}
            className={clsx(
              "relative group border-2 cursor-grab active:cursor-grabbing select-none bg-background",
              isSelected ? "border-white" : "border-foreground/40 hover:border-foreground",
              isDropTarget && "border-primary-400 border-dashed",
              dragFrom === position && "opacity-40"
            )}
            style={{ width: THUMB + 4, height: THUMB + 4 }}
          >
            <FrameThumb image={image} rect={rect} size={THUMB} />
            <span className="absolute left-0 top-0 px-1 text-[10px] leading-3 font-hack bg-background/80 text-foreground pointer-events-none">
              {index}
            </span>
            <span className="absolute right-0 bottom-0 px-1 text-[10px] leading-3 font-hack bg-background/80 text-foreground/60 pointer-events-none">
              {position + 1}
            </span>
            <button
              type="button"
              className="absolute -right-px -top-px hidden group-hover:flex items-center justify-center w-4 h-4 bg-red-600 text-white"
              title="Remove from sequence"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveAt(position);
              }}
            >
              <X size={10} />
            </button>
          </div>
        );
      })}
      {!sequence.length && <span className="text-xs text-foreground/60">Sequence is empty.</span>}
    </div>
  );
};
