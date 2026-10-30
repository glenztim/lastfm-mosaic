"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { useColors } from "@/components/ColorsContext";
import { NestedSquares, type NestedLayer } from "@/components/NestedSquares";
import { Tooltip } from "@/components/Tooltip";
import { dimColor, ringColors } from "@/lib/artistColors";
import { proportionalRingScales } from "@/lib/nestedSquares";
import { topArtistsOverall } from "@/lib/topArtists";
import type { Scrobble } from "@/lib/types";

interface Props {
  /** Already filtered to the requested time frame. */
  scrobbles: Scrobble[];
  topN: number;
}

interface Hover {
  index: number;
  x: number;
  y: number;
}

/** Coordinate size of the SVG; it is scaled to fit by CSS. */
const VIEWBOX = 720;
/** How much the non-hovered rings fade toward the background. */
const DIM = 0.65;

const percent = (count: number, total: number) => `${((count / total) * 100).toFixed(1)}%`;

export function TopArtists({ scrobbles, topN }: Props) {
  const { coloring } = useColors();
  const [hover, setHover] = useState<Hover | null>(null);

  const artists = useMemo(() => topArtistsOverall(scrobbles, topN), [scrobbles, topN]);
  const colors = useMemo(
    () =>
      ringColors(
        artists.map((a) => a.artist),
        coloring,
      ),
    [artists, coloring],
  );
  const scales = useMemo(() => proportionalRingScales(artists.map((a) => a.count)), [artists]);

  const layers: NestedLayer[] = artists.map((_, i) => ({
    color: hover && hover.index !== i ? dimColor(colors[i], DIM) : colors[i],
    scale: scales[i],
  }));

  const total = scrobbles.length;
  const hovered = hover ? artists[hover.index] : null;

  function handleHover(index: number, e: MouseEvent) {
    setHover({ index, x: e.clientX, y: e.clientY });
  }

  return (
    <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center">
      <div className="aspect-square shrink-0" style={{ width: "min(80vw, 720px)" }}>
        <NestedSquares
          layers={layers}
          size={VIEWBOX}
          className="block h-full w-full"
          onLayerMove={handleHover}
          onLayerLeave={() => setHover(null)}
        />
      </div>
      <ol className="flex w-full max-w-md flex-col text-sm" onMouseLeave={() => setHover(null)}>
        {artists.map((a, i) => (
          <li
            key={a.artist}
            className={`flex items-center gap-3 px-2 py-1.5 ${
              hover?.index === i ? "bg-ink text-paper" : ""
            }`}
            onMouseEnter={(e) => handleHover(i, e)}
            onMouseMove={(e) => handleHover(i, e)}
          >
            <span className="w-5 text-right tabular-nums opacity-60">{i + 1}</span>
            <span className="rule-thin h-3.5 w-3.5 shrink-0" style={{ background: colors[i] }} />
            <span className="min-w-0 flex-1 truncate">{a.artist}</span>
            <span className="tabular-nums opacity-70">{a.count.toLocaleString()}</span>
            <span className="w-12 text-right tabular-nums opacity-60">
              {percent(a.count, total)}
            </span>
          </li>
        ))}
      </ol>
      {hover && hovered && (
        <Tooltip x={hover.x} top={hover.y - 8} bottom={hover.y + 18}>
          <div className="font-bold">
            #{hover.index + 1} {hovered.artist}
          </div>
          <div className="tabular-nums text-ink-dim">
            {hovered.count.toLocaleString()} scrobbles · {percent(hovered.count, total)}
          </div>
        </Tooltip>
      )}
    </div>
  );
}
