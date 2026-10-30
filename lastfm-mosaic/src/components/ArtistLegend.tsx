"use client";

import { useColors } from "@/components/ColorsContext";
import { OTHER_GREYS } from "@/lib/artistColors";
import { LEGEND_ARTISTS } from "@/lib/settings";

function Chip({ color, name }: { color: string; name: string }) {
  return (
    <li className="flex max-w-56 items-center gap-2">
      <span className="rule-thin h-3.5 w-3.5 shrink-0" style={{ background: color }} />
      <span className="truncate">{name}</span>
    </li>
  );
}

/**
 * Chips (swatch + name) for the top 15 artists by overall rank, plus a grey "Other artists" chip
 * in Grey mode. Fixed size: no toggle, no expansion, no inner scroll. Follows the sliders without
 * lag (`legend.artistColors`).
 */
export function ArtistLegend() {
  const { coloring, legend } = useColors();
  const { names } = coloring.ranking;
  const shown = names.slice(0, LEGEND_ARTISTS);
  // Grey mode: artists beyond the pool are drawn grey (never when skipping, or when the pool is everyone).
  const hasGrey = !coloring.skipOutside && coloring.poolCount < names.length;

  if (shown.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="ui-label font-bold">Top {shown.length} artists</h3>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        {shown.map((name, i) => (
          <Chip key={name} color={legend.artistColors[i]} name={name} />
        ))}
        {hasGrey && <Chip color={OTHER_GREYS[0]} name="Other artists" />}
      </ul>
    </div>
  );
}
