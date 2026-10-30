import type { ReactNode } from "react";

interface Props {
  /** Horizontal anchor, in viewport px. */
  x: number;
  /** Top and bottom of the hovered thing, in viewport px; the tooltip sits above, or below if there's no room. */
  top: number;
  bottom: number;
  children: ReactNode;
}

const GAP = 6;
const MIN_ROOM_ABOVE = 160;
/** Half the tooltip's max width, so it stays inside the viewport horizontally. */
const EDGE = 132;

/** One shared, fixed-position tooltip; callers render it for the currently hovered item only. */
export function Tooltip({ x, top, bottom, children }: Props) {
  const below = top < MIN_ROOM_ABOVE;
  const left = Math.min(Math.max(x, EDGE), window.innerWidth - EDGE);
  return (
    <div
      role="tooltip"
      className="rule-thick pointer-events-none fixed z-20 w-max max-w-64 bg-paper px-2.5 py-1.5 text-xs text-ink"
      style={{
        left,
        top: below ? bottom + GAP : top - GAP,
        transform: `translate(-50%, ${below ? "0" : "-100%"})`,
      }}
    >
      {children}
    </div>
  );
}
