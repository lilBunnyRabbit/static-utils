import { Rect, roundRect } from "@/services/sprite-extract";
import clsx from "clsx";
import React from "react";

export interface FrameThumbProps {
  image: CanvasImageSource;
  rect: Rect;
  size: number;
  className?: string;
}

/** Small canvas preview of one frame, fit into a `size × size` box. */
export const FrameThumb: React.FC<FrameThumbProps> = ({ image, rect, size, className }) => {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const src = roundRect(rect);
    if (src.w <= 0 || src.h <= 0) return;
    const scale = Math.min(size / src.w, size / src.h);
    const w = src.w * scale;
    const h = src.h * scale;
    ctx.imageSmoothingEnabled = scale < 1;
    ctx.drawImage(image, src.x, src.y, src.w, src.h, (size - w) / 2, (size - h) / 2, w, h);
  }, [image, rect, size]);

  return (
    <canvas
      ref={ref}
      className={clsx("block", className)}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
};
