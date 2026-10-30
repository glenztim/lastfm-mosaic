"use client";

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { useColors } from "@/components/ColorsContext";
import { NestedSquares, type NestedLayer } from "@/components/NestedSquares";
import { Tooltip } from "@/components/Tooltip";
import { ringColors } from "@/lib/artistColors";
import { bucketLayers } from "@/lib/bucketLayers";
import {
  GUTTER_GAP_PX,
  GUTTER_PX,
  groupByYear,
  layoutFor,
  leadingCells,
  monthLabels,
  yearLabels,
} from "@/lib/gridLayout";
import type { ColorScale } from "@/lib/scale";
import type { Nesting, PerRowIndex } from "@/lib/settings";
import type { ArtistCount, Bucket, Granularity } from "@/lib/types";
import { ZOOM_LEVELS, type ZoomLevel } from "@/lib/zoom";

interface Props {
  buckets: Bucket[];
  granularity: Granularity;
  scale: ColorScale;
  zoom: ZoomLevel;
  nesting: Nesting;
  /** Ring size variation in % (Artists only nesting). */
  variation: number;
  /** Every artist per bucket, plays descending: the tooltip's list. Null when not computed. */
  topByBucket: Map<string, ArtistCount[]> | null;
  /** The artists the rings may draw (`topByBucket` minus those outside the pool when skipping). */
  drawnByBucket: Map<string, ArtistCount[]> | null;
  /** The mosaic panel's measured inner width (0 until measured), and the narrow-screen "Per row". */
  width: number;
  perRow: PerRowIndex;
}

interface Hover {
  index: number;
  x: number;
  top: number;
  bottom: number;
}

/** Height of the month header row plus the space below it (calendar month layout only). */
const MONTH_HEADER_PX = 16;
const MONTH_HEADER_GAP_PX = 4;
const TOOLTIP_ARTISTS = 5;
/** Coordinate size of a cell's SVG; it is scaled to the cell by CSS, so cells don't depend on px size. */
const CELL_VIEWBOX = 100;

const dayFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "numeric",
});
const monthFmt = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

function bucketLabel(bucket: Bucket, granularity: Granularity): string {
  switch (granularity) {
    case "days":
      return dayFmt.format(bucket.start);
    case "weeks":
      return `Week of ${dayFmt.format(bucket.start)}`;
    case "months":
      return monthFmt.format(bucket.start);
  }
}

interface CellProps {
  index: number;
  color: string;
  /** Set when the cell nests several squares; otherwise it is a flat square in `color`. */
  layers?: NestedLayer[];
  /** An empty square: inside-colored with an inset 2px border in `color`. */
  hollow?: boolean;
}

/** Fills its grid cell, whatever size the layout gives it (the nested SVG scales with it). */
const Cell = memo(function Cell({ index, color, layers, hollow }: CellProps) {
  if (layers) {
    return (
      <div data-i={index}>
        <NestedSquares layers={layers} size={CELL_VIEWBOX} className="block h-full w-full" />
      </div>
    );
  }
  return (
    <div
      data-i={index}
      style={
        hollow
          ? { background: "var(--paper)", boxShadow: `inset 0 0 0 2px ${color}` }
          : { background: color }
      }
    />
  );
});

export function Mosaic({
  buckets,
  granularity,
  scale,
  zoom,
  nesting,
  variation,
  topByBucket,
  drawnByBucket,
  width,
  perRow,
}: Props) {
  const { coloring } = useColors();
  const [hover, setHover] = useState<Hover | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { size: nominal, gap } = ZOOM_LEVELS[zoom];
  const monthly = granularity === "months";

  // A fixed tooltip would drift away from its square while scrolling; and on touch screens it
  // stays until another tap lands somewhere else than on a square.
  useEffect(() => {
    const hide = () => setHover(null);
    const hideOutside = (e: globalThis.PointerEvent) => {
      if (!(e.target as Element | null)?.closest?.("[data-i]")) hide();
    };
    window.addEventListener("scroll", hide, { passive: true });
    document.addEventListener("pointerdown", hideOutside);
    return () => {
      window.removeEventListener("scroll", hide);
      document.removeEventListener("pointerdown", hideOutside);
    };
  }, []);

  const layout = width > 0 ? layoutFor(width, nominal, gap, granularity, perRow) : null;
  const columns = layout?.columns ?? 0;
  const size = layout?.size ?? nominal;
  const flow = layout?.mode === "flow";
  // Fractional columns without pixel seams: the grid has an exact width, the columns share it.
  const columnsStyle = `repeat(${columns}, minmax(0, 1fr))`;

  // Calendar layout: fixed-width year gutter + grid fitted to the rest of the width. Only capped
  // months leave space over (or a panel too narrow for the minimum size overflows): the row is
  // then centered, never pushed off-screen to the left.
  const gridWidth = layout?.mode === "calendar" ? layout.width : 0;
  const offset =
    layout?.mode === "calendar"
      ? Math.max(0, Math.floor((width - GUTTER_PX - GUTTER_GAP_PX - gridWidth) / 2))
      : 0;
  const leading = flow ? 0 : leadingCells(buckets, granularity);
  const rows = columns > 0 ? Math.ceil((leading + buckets.length) / columns) : 0;
  const gridHeight = rows > 0 ? rows * (size + gap) - gap : 0;
  const headerOffset = monthly ? MONTH_HEADER_PX + MONTH_HEADER_GAP_PX : 0;

  const labels = useMemo(
    () => (columns > 0 && !flow ? yearLabels(buckets, leading, columns, granularity) : []),
    [buckets, leading, columns, flow, granularity],
  );
  const segments = useMemo(() => (flow ? groupByYear(buckets) : []), [flow, buckets]);
  // Single letters when the squares are too narrow for "Jan".
  const months = useMemo(() => monthLabels(size < 24 ? "narrow" : "short"), [size]);

  const cells = useMemo(() => {
    return buckets.map((b, i) => {
      const layers = bucketLayers({
        coloring,
        zoom,
        nesting,
        variation,
        count: b.count,
        countColor: scale.color(b.count),
        top: drawnByBucket?.get(b.key),
      });
      return layers.length > 1 ? (
        <Cell key={b.key} index={i} color={layers[0].color} layers={layers} />
      ) : (
        <Cell key={b.key} index={i} color={layers[0].color} hollow={layers[0].hollow} />
      );
    });
  }, [buckets, scale, coloring, zoom, nesting, variation, drawnByBucket]);

  /** Shows the tooltip of the square under `target`; anything else hides it. */
  function showFor(target: EventTarget | null) {
    const cell = (target as Element | null)?.closest<HTMLElement>("[data-i]");
    if (!cell || !gridRef.current?.contains(cell)) {
      setHover(null);
      return;
    }
    const index = Number(cell.dataset.i);
    setHover((prev) => {
      if (prev?.index === index) return prev;
      const r = cell.getBoundingClientRect();
      return { index, x: r.left + r.width / 2, top: r.top, bottom: r.bottom };
    });
  }
  // One delegated set of handlers for all cells, so cells carry no handlers or state of their own.
  // Mouse: hover. Touch and pen: the tap that lands on a square shows its tooltip (the document
  // listener above hides it when a tap lands elsewhere).
  const handlers = {
    onMouseMove: (e: MouseEvent<HTMLDivElement>) => showFor(e.target),
    onMouseLeave: () => setHover(null),
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== "mouse") showFor(e.target);
    },
  };

  const hovered = hover ? buckets[hover.index] : null;
  const hoveredArtists = hovered ? topByBucket?.get(hovered.key)?.slice(0, TOOLTIP_ARTISTS) : null;
  // The same colors the rings use, including the neighbor nudge; the nudge only compares artists
  // that are drawn. Artists left out of the rings (skipping outside the pool) get no color.
  const hoveredDrawn = hoveredArtists?.filter((a) => coloring.isDrawn(a.artist)) ?? [];
  const hoveredDrawnColors = ringColors(
    hoveredDrawn.map((a) => a.artist),
    coloring,
  );
  const swatchOf = (artist: string) => {
    const i = hoveredDrawn.findIndex((a) => a.artist === artist);
    return i < 0 ? null : hoveredDrawnColors[i];
  };

  return (
    <div>
      {layout?.mode === "calendar" && (
        <div className="flex" style={{ marginLeft: offset, gap: GUTTER_GAP_PX }}>
          <div
            className="relative shrink-0"
            style={{ width: GUTTER_PX, height: gridHeight, marginTop: headerOffset }}
            aria-hidden
          >
            {labels.map((l) => (
              <span
                key={l.row}
                className="absolute right-0 flex items-center whitespace-nowrap text-xs tabular-nums text-ink-dim"
                style={{ top: l.row * (size + gap), height: size }}
              >
                {l.text}
              </span>
            ))}
          </div>
          <div className="shrink-0" style={{ width: gridWidth }}>
            {monthly && (
              <div
                className="grid text-xs text-ink-dim"
                style={{
                  gridTemplateColumns: columnsStyle,
                  gap,
                  height: MONTH_HEADER_PX,
                  marginBottom: MONTH_HEADER_GAP_PX,
                }}
                aria-hidden
              >
                {months.map((m, i) => (
                  <span key={i} className="flex items-end justify-center overflow-visible">
                    {m}
                  </span>
                ))}
              </div>
            )}
            <div
              ref={gridRef}
              className="grid"
              style={{ gridTemplateColumns: columnsStyle, gridAutoRows: `${size}px`, gap }}
              {...handlers}
            >
              {Array.from({ length: leading }, (_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {cells}
            </div>
          </div>
        </div>
      )}

      {flow && (
        <div ref={gridRef} className="flex flex-col gap-4" {...handlers}>
          {segments.map((seg) => (
            <section key={seg.year} aria-label={String(seg.year)}>
              <div className="mb-2 flex items-center gap-3" aria-hidden>
                <h3 className="ui-label-sm">{seg.year}</h3>
                <span className="h-px grow bg-ink" />
              </div>
              <div
                className="grid"
                style={{ gridTemplateColumns: columnsStyle, gridAutoRows: `${size}px`, gap }}
              >
                {cells.slice(seg.start, seg.start + seg.count)}
              </div>
            </section>
          ))}
        </div>
      )}

      {hover && hovered && (
        <Tooltip x={hover.x} top={hover.top} bottom={hover.bottom}>
          <div className="font-bold">{bucketLabel(hovered, granularity)}</div>
          <div className="tabular-nums text-ink-dim">
            {hovered.count.toLocaleString()} scrobble{hovered.count === 1 ? "" : "s"}
          </div>
          {hoveredArtists && hoveredArtists.length > 0 && (
            <ul className="rule-t mt-1.5 flex flex-col gap-1 pt-1.5">
              {hoveredArtists.map((a) => {
                const color = swatchOf(a.artist);
                return (
                  <li key={a.artist} className="flex items-center gap-1.5">
                    {/* Filled when the artist is drawn, an empty outline when it is not. */}
                    <span
                      className="rule-thin h-3 w-3 shrink-0"
                      style={{ background: color ?? "transparent" }}
                    />
                    <span className="min-w-0 flex-1 truncate">{a.artist}</span>
                    <span className="tabular-nums text-ink-dim">{a.count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Tooltip>
      )}
    </div>
  );
}
