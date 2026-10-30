import { memo, type MouseEvent } from "react";
import { computeNestedRects } from "@/lib/nestedSquares";

export interface NestedLayer {
  color: string;
  /** Side as a fraction of `size`; outermost layer first (= 1), strictly decreasing. */
  scale: number;
}

interface Props {
  layers: readonly NestedLayer[];
  /** Side in px; also the SVG's coordinate size. */
  size: number;
  /** Overrides the default fixed pixel size, e.g. "h-full w-full" to fill a sized parent. */
  className?: string;
  onLayerMove?: (index: number, e: MouseEvent<SVGRectElement>) => void;
  onLayerLeave?: () => void;
}

/** Albers-style nested squares: horizontally centered, shifted down. */
export const NestedSquares = memo(function NestedSquares({
  layers,
  size,
  className = "block",
  onLayerMove,
  onLayerLeave,
}: Props) {
  const rects = computeNestedRects(
    layers.map((l) => l.scale),
    size,
  );
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {rects.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.size}
          height={r.size}
          fill={layers[i].color}
          onMouseEnter={onLayerMove && ((e) => onLayerMove(i, e))}
          onMouseMove={onLayerMove && ((e) => onLayerMove(i, e))}
          onMouseLeave={onLayerLeave}
        />
      ))}
    </svg>
  );
});
