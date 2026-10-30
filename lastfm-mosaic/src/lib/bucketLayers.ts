import { ringColors, type ArtistColoring } from "./artistColors";
import { oklchToHex } from "./color";
import { ringScales } from "./nestedSquares";
import type { Nesting } from "./settings";
import type { ArtistCount } from "./types";
import { ARTIST_LAYER_SCALES, ARTISTS_ONLY_LAYER_COUNT, type ZoomLevel } from "./zoom";

export interface BucketLayer {
  color: string;
  /** Side as a fraction of the cell; outermost layer first (= 1), strictly decreasing. */
  scale: number;
  /** Drawn as an empty square: page-colored fill with an inset border in `color`. */
  hollow?: boolean;
}

/** Border of the hollow square: a mid-dark neutral, between the page and the grey rings. */
export const HOLLOW_BORDER = oklchToHex(0.38, 0, 0);

interface Options {
  coloring: ArtistColoring;
  zoom: ZoomLevel;
  nesting: Nesting;
  /** Ring size variation in % ("Artists only" only). */
  variation: number;
  /** The bucket's scrobble count and its count-gradient color (the zero color if 0). */
  count: number;
  countColor: string;
  /**
   * The bucket's artists that may be drawn, by plays descending (already filtered to the pool
   * when skipping); undefined when not computed.
   */
  top: readonly ArtistCount[] | undefined;
}

/**
 * Nested squares for one timeline bucket, outermost first. A single layer means a flat square.
 *
 * - "volume": the count color, then the top artists at `ARTIST_LAYER_SCALES[zoom]`.
 * - "artists": no count square. The top artists only, sized by `ringScales(counts, variation, n)`.
 *
 * Artist colors are rank based (`ArtistColoring`); adjacent rings never share a color
 * (`ringColors`). Empty buckets are the zero color. A bucket with scrobbles but no drawable
 * artist (skipping outside the pool) is a hollow square in "artists" and just the count square
 * in "volume".
 */
export function bucketLayers({
  coloring,
  zoom,
  nesting,
  variation,
  count,
  countColor,
  top,
}: Options): BucketLayer[] {
  const flat: BucketLayer[] = [{ color: countColor, scale: 1 }];
  if (count <= 0 || !top) return flat;
  if (top.length === 0) {
    return nesting === "artists" ? [{ color: HOLLOW_BORDER, scale: 1, hollow: true }] : flat;
  }

  if (nesting === "volume") {
    const scales = ARTIST_LAYER_SCALES[zoom];
    const artists = top.slice(0, scales.length);
    const colors = ringColors(
      artists.map((a) => a.artist),
      coloring,
    );
    return [...flat, ...artists.map((_, i) => ({ color: colors[i], scale: scales[i] }))];
  }

  const artists = top.slice(0, ARTISTS_ONLY_LAYER_COUNT[zoom]);
  const colors = ringColors(
    artists.map((a) => a.artist),
    coloring,
  );
  const scales = ringScales(
    artists.map((a) => a.count),
    variation,
    artists.length,
  );
  return artists.map((_, i) => ({ color: colors[i], scale: scales[i] }));
}
