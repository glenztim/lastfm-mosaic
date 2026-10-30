"use client";

import { useMemo } from "react";
import { ArtistLegend } from "@/components/ArtistLegend";
import { useColors } from "@/components/ColorsContext";
import { Legend } from "@/components/Legend";
import { Mosaic } from "@/components/Mosaic";
import { aggregate, displayRange } from "@/lib/aggregate";
import { filterBucketsToPool } from "@/lib/artistColors";
import { makeColorScale } from "@/lib/scale";
import { GRANULARITY_UNIT, type Nesting, type PerRowIndex } from "@/lib/settings";
import { topArtistsByBucket } from "@/lib/topArtists";
import type { Granularity, Scrobble } from "@/lib/types";
import { artistColorsVisible, volumeVisible } from "@/lib/visibility";
import type { ZoomLevel } from "@/lib/zoom";

interface Props {
  /** Already filtered to the requested time frame. */
  scrobbles: Scrobble[];
  granularity: Granularity;
  zoom: ZoomLevel;
  nesting: Nesting;
  /** Ring size variation in % (Artists only nesting). */
  variation: number;
  /** Start of the requested time frame (Unix seconds), undefined = entire history. */
  from: number | undefined;
  now: Date;
  /** The mosaic panel's measured inner width, and the narrow-screen "Per row" choice. */
  width: number;
  perRow: PerRowIndex;
}

/**
 * Everything derived from the in-memory scrobbles is memoized: buckets on granularity, the
 * artists per bucket on granularity, the pool-filtered artists on (pool, skip/grey) as well.
 */
export function Timeline({
  scrobbles,
  granularity,
  zoom,
  nesting,
  variation,
  from,
  now,
  width,
  perRow,
}: Props) {
  const { gradient, coloring } = useColors();
  const { ranking, poolCount, skipOutside } = coloring;
  // Artists are needed wherever artist colors are visible ("Artists only" at every zoom, since
  // S/M show the #1 artist as a flat square; "Volume + artists" from L up).
  const needsArtists = artistColorsVisible({ view: "timeline", nesting, zoom });
  const showVolume = volumeVisible({ view: "timeline", nesting, zoom });

  const buckets = useMemo(() => {
    const [start, end] = displayRange(scrobbles, granularity, from, now);
    return aggregate(scrobbles, granularity, start, end);
  }, [scrobbles, granularity, from, now]);

  // The clamp is computed from this granularity's own counts.
  const scale = useMemo(
    () => makeColorScale(buckets.map((b) => b.count), gradient),
    [buckets, gradient],
  );

  // Every artist of every bucket, plays descending: what the tooltip lists.
  const topByBucket = useMemo(
    () => (needsArtists ? topArtistsByBucket(scrobbles, granularity) : null),
    [needsArtists, scrobbles, granularity],
  );

  // What the rings may draw. Skip mode removes artists outside the pool BEFORE the ring count is
  // taken and the ring sizes are computed, so this is done here once, not per cell.
  const drawnByBucket = useMemo(
    () => (topByBucket && skipOutside ? filterBucketsToPool(topByBucket, ranking, poolCount) : topByBucket),
    [topByBucket, ranking, poolCount, skipOutside],
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Legends sit above the grid. */}
      <div className="rule-b flex flex-wrap items-start gap-x-12 gap-y-4 pb-5">
        {needsArtists && <ArtistLegend />}
        {showVolume ? (
          <Legend cap={scale.cap} granularity={granularity} />
        ) : (
          <p className="ui-label text-ink-dim">
            Outer square = top artist of the {GRANULARITY_UNIT[granularity]}
          </p>
        )}
      </div>
      <Mosaic
        buckets={buckets}
        granularity={granularity}
        scale={scale}
        zoom={zoom}
        nesting={nesting}
        variation={variation}
        topByBucket={topByBucket}
        drawnByBucket={drawnByBucket}
        width={width}
        perRow={perRow}
      />
    </div>
  );
}
