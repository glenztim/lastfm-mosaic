export type ZoomLevel = "S" | "M" | "L" | "XL" | "XXL";

export const ZOOM_ORDER: readonly ZoomLevel[] = ["S", "M", "L", "XL", "XXL"];
export const DEFAULT_ZOOM: ZoomLevel = "M";

/** Nominal square side and the gap between squares, in px. The grid stretches or shrinks the squares to fill the panel width (see `fitGrid`). */
export const ZOOM_LEVELS: Record<ZoomLevel, { size: number; gap: number }> = {
  S: { size: 14, gap: 2 },
  M: { size: 24, gap: 3 },
  L: { size: 44, gap: 4 },
  XL: { size: 72, gap: 6 },
  XXL: { size: 120, gap: 8 },
};

/**
 * "Volume + artists" nesting: side fractions of the artist squares nested inside the
 * count-colored square, outermost artist first. (The count square at scale 1 always comes first.)
 * Empty = plain colored square.
 */
export const ARTIST_LAYER_SCALES: Record<ZoomLevel, readonly number[]> = {
  S: [],
  M: [],
  L: [0.5],
  XL: [0.7, 0.45, 0.22],
  XXL: [0.82, 0.64, 0.47, 0.31, 0.16],
};

/**
 * "Artists only" nesting: how many of a bucket's top artists become layers (one more than the
 * artist layers above, since there is no count square). Their sizes come from the artists' counts.
 * 1 = a flat square in the top artist's color.
 */
export const ARTISTS_ONLY_LAYER_COUNT: Record<ZoomLevel, number> = {
  S: 1,
  M: 1,
  L: 2,
  XL: 4,
  XXL: 6,
};
