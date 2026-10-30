export interface Rect {
  x: number;
  y: number;
  size: number;
}

/**
 * Albers "Homage to the Square": of the free space around an inner square, the band above it
 * gets this share and the band below gets the rest, so the top band is twice as thick as the bottom.
 */
const TOP_BAND_SHARE = 2 / 3;

/**
 * Rectangles for nested squares inside a `size` x `size` box.
 * `scales` are side fractions of the box, outermost first (= 1), strictly decreasing.
 * Every square is horizontally centered and shifted down.
 */
export function computeNestedRects(scales: readonly number[], size: number): Rect[] {
  return scales.map((scale) => {
    const side = size * scale;
    const free = size - side;
    return { x: free / 2, y: free * TOP_BAND_SHARE, size: side };
  });
}

/** Minimum difference between the sides of two consecutive rings (as a fraction of the outermost side). */
const MIN_RING_STEP = 0.05;
/** Minimum side of the innermost square. */
const MIN_INNER_SCALE = 0.06;

/**
 * Side fractions for rings sized by listening counts (sorted descending): the area of each square
 * is proportional to its count, so scale = sqrt(count / topCount). A minimum thickness is enforced
 * so small rings stay visible; the result is strictly decreasing, starting at 1. Used by the Top
 * artists view.
 */
export function proportionalRingScales(counts: readonly number[]): number[] {
  const n = counts.length;
  const scales: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      scales.push(1);
      continue;
    }
    const natural = Math.sqrt(counts[i] / counts[0]);
    // Leave room for all the rings inside this one.
    const floor = MIN_INNER_SCALE + (n - 1 - i) * MIN_RING_STEP;
    scales.push(Math.max(floor, Math.min(natural, scales[i - 1] - MIN_RING_STEP)));
  }
  return scales;
}

/** Side of the innermost ring when all rings are equally thick. */
const EQUAL_INNER_SCALE = 0.28;
/** Smallest allowed ring side (before the room needed for the rings inside it). */
const VARIATION_MIN_INNER = 0.18;

/**
 * Side fractions for the `n` outermost rings of the timeline's "Artists only" nesting.
 * `variation` (0..100 %) blends between equally thick rings (0) and rings proportional to the
 * counts (100, side = sqrt(count / topCount)). Rings are then clamped from the outside in, so the
 * result starts at 1, decreases strictly by at least 0.05 per ring and never goes below 0.18.
 * `counts` are sorted descending; for n = 1 the result is [1].
 */
export function ringScales(counts: readonly number[], variation: number, n: number): number[] {
  const rings = Math.min(n, counts.length);
  const mix = Math.min(100, Math.max(0, variation)) / 100;
  const scales: number[] = [];
  for (let i = 0; i < rings; i++) {
    if (i === 0) {
      scales.push(1);
      continue;
    }
    const equal = 1 - (i * (1 - EQUAL_INNER_SCALE)) / (rings - 1);
    const proportional = Math.sqrt(counts[i] / counts[0]);
    const raw = equal + (proportional - equal) * mix;
    const min = VARIATION_MIN_INNER + (rings - 1 - i) * MIN_RING_STEP;
    scales.push(Math.max(min, Math.min(raw, scales[i - 1] - MIN_RING_STEP)));
  }
  return scales;
}
