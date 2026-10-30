import { gradientColor } from "./color";
import type { ActiveGradient } from "./colorPresets";

const CLAMP_PERCENTILE = 0.95;

export interface ColorScale {
  /** Count at (and above) which the color is fully saturated. */
  cap: number;
  color(count: number): string;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

/**
 * Sqrt scale clamped at the 95th percentile of non-zero counts, so outliers don't wash out the
 * rest. Build it from the counts of the granularity being shown: its range differs per bucket size.
 */
export function makeColorScale(counts: number[], gradient: ActiveGradient): ColorScale {
  const nonZero = counts.filter((c) => c > 0).sort((a, b) => a - b);
  const cap = Math.max(1, percentile(nonZero, CLAMP_PERCENTILE));
  return {
    cap,
    color(count) {
      if (count <= 0) return gradient.zero;
      return gradientColor(gradient.stops, Math.sqrt(Math.min(count, cap) / cap));
    },
  };
}
