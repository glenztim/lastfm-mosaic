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
/** Half the tooltip's max width (16rem + border), so it stays inside the viewport horizontally. */
const EDGE = 132;
/** Breathing room kept to the viewport edges, px. */
const MARGIN = 4;

/** One shared, fixed-position tooltip; callers render it for the currently hovered item only. */
export function Tooltip({ x, top, bottom, children }: Props) {
  const below = top < MIN_ROOM_ABOVE;
  // On a viewport narrower than the tooltip, it is as wide as the viewport minus the margins.
  const edge = Math.min(EDGE, window.innerWidth / 2);
  const left = Math.min(Math.max(x, edge), window.innerWidth - edge);
  return (
    <div
      role="tooltip"
      className="rule-thick pointer-events-none fixed z-20 w-max bg-paper px-2.5 py-1.5 text-xs text-ink"
      style={{
        maxWidth: `min(16rem, calc(100vw - ${2 * MARGIN}px))`,
        left,
        top: below ? bottom + GAP : top - GAP,
        transform: `translate(-50%, ${below ? "0" : "-100%"})`,
      }}
    >
      {children}
    </div>
  );
}
