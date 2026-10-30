"use client";

import { memo, useEffect, useMemo, useState, type MouseEvent } from "react";
import { useColors } from "@/components/ColorsContext";
import { NestedSquares, type NestedLayer } from "@/components/NestedSquares";
import { Tooltip } from "@/components/Tooltip";
import { useContainerWidth } from "@/hooks/useContainerWidth";
import { ringColors } from "@/lib/artistColors";
import { bucketLayers } from "@/lib/bucketLayers";
import { fitGrid, leadingCells, monthLabels, yearLabels } from "@/lib/gridLayout";
import type { ColorScale } from "@/lib/scale";
import type { Nesting } from "@/lib/settings";
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
}

interface Hover {
  index: number;
  x: number;
  top: number;
  bottom: number;
}

/** Fixed width of the year gutter on the left, and the space between it and the grid. */
const GUTTER_PX = 48;
const GUTTER_GAP_PX = 8;
/** Coordinate size of a cell's SVG; it is scaled to the cell by CSS, so cells don't depend on px size. */
const CELL_VIEWBOX = 100;
/** Height of the month header row plus the space below it (month layout only). */
const MONTH_HEADER_PX = 16;
const MONTH_HEADER_GAP_PX = 4;
const TOOLTIP_ARTISTS = 5;

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
  /** An empty square: panel-colored with an inset 2px border in `color`. */
  hollow?: boolean;
}

/** Fills its grid cell, whatever size the fit gives it (the nested SVG scales with it). */
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
}: Props) {
  const { coloring } = useColors();
  const [ref, width] = useContainerWidth<HTMLDivElement>();
  const [hover, setHover] = useState<Hover | null>(null);
  const { size: nominal, gap } = ZOOM_LEVELS[zoom];
  const monthly = granularity === "months";

  // Fixed tooltip would drift away from its square while scrolling.
  useEffect(() => {
    const hide = () => setHover(null);
    window.addEventListener("scroll", hide, { passive: true });
    return () => window.removeEventListener("scroll", hide);
  }, []);

  // `width` is the panel's inner width; the grid gets what the fixed-width gutter leaves over and
  // is fitted to it: the squares stretch or shrink (`fitGrid`) so the grid spans the full width.
  const available = Math.max(0, width - GUTTER_PX - GUTTER_GAP_PX);
  const fit = width > 0 ? fitGrid(available, nominal, gap, granularity) : null;
  const columns = fit?.columns ?? 0;
  const size = fit?.size ?? nominal;
  const gridWidth = fit?.width ?? 0;
  // Only capped months leave space over (or a panel too narrow for the minimum size overflows): the
  // row is then centered, never pushed off-screen to the left.
  const offset = fit ? Math.max(0, Math.floor((width - GUTTER_PX - GUTTER_GAP_PX - gridWidth) / 2)) : 0;
  const leading = leadingCells(buckets, granularity);
  const rows = columns > 0 ? Math.ceil((leading + buckets.length) / columns) : 0;
  const gridHeight = rows > 0 ? rows * (size + gap) - gap : 0;
  const headerOffset = monthly ? MONTH_HEADER_PX + MONTH_HEADER_GAP_PX : 0;
  // Fractional columns without pixel seams: the grid has an exact width, the columns share it.
  const columnsStyle = `repeat(${columns}, minmax(0, 1fr))`;

  const labels = useMemo(
    () => (columns > 0 ? yearLabels(buckets, leading, columns, granularity) : []),
    [buckets, leading, columns, granularity],
  );
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

  // One delegated handler for all cells, so cells carry no handlers or state of their own.
  function handleMove(e: MouseEvent<HTMLDivElement>) {
    const cell = (e.target as Element).closest<HTMLElement>("[data-i]");
    if (!cell) {
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
    <div ref={ref}>
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
          {columns > 0 && monthly && (
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
          {columns > 0 && (
            <div
              className="grid"
              style={{ gridTemplateColumns: columnsStyle, gridAutoRows: `${size}px`, gap }}
              onMouseMove={handleMove}
              onMouseLeave={() => setHover(null)}
            >
              {Array.from({ length: leading }, (_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {cells}
            </div>
          )}
        </div>
      </div>
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
