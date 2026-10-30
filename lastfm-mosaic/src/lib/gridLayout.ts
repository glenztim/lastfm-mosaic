import { addDays } from "./aggregate";
import type { Bucket, Granularity } from "./types";

/** Month layout: one row per year. */
export const MONTHS_PER_ROW = 12;

/** Smallest square side the fit will produce (a very narrow panel overflows instead of vanishing). */
const MIN_SIZE = 4;
/** Months stretch at most this much beyond the zoom's nominal size; beyond that the grid is centered. */
export const MONTH_MAX_STRETCH = 1.5;

export interface GridFit {
  columns: number;
  /** Square side in px (a fraction): the squares stretch or shrink so the grid fills its width. */
  size: number;
  /** Width the grid actually takes: `available`, except for capped months and the minimum size. */
  width: number;
}

/**
 * Fit-to-width layout. `available` is the grid's width (panel width minus the year gutter),
 * `nominal` the zoom level's square side, `gap` the space between squares. The squares then
 * stretch or shrink slightly so the grid spans the full width, with no leftover space.
 *
 * - Days: columns are a multiple of 7 (every column is one weekday). Of cols = 7k, k >= 1, take the
 *   k whose resulting side is closest to `nominal` (smallest |ln(side / nominal)|).
 * - Weeks: as many columns as fit at the nominal size, then stretched.
 * - Months: always 12 columns; side = min(fit, 1.5 x nominal). If capped, `width` is less than
 *   `available` and the caller centers the grid.
 */
export function fitGrid(
  available: number,
  nominal: number,
  gap: number,
  granularity: Granularity,
): GridFit {
  const sideFor = (columns: number) => (available - (columns - 1) * gap) / columns;
  const result = (columns: number, side: number): GridFit => {
    const size = Math.max(MIN_SIZE, side);
    return { columns, size, width: columns * size + (columns - 1) * gap };
  };

  if (granularity === "months") {
    return result(MONTHS_PER_ROW, Math.min(sideFor(MONTHS_PER_ROW), nominal * MONTH_MAX_STRETCH));
  }
  if (granularity === "weeks") {
    const columns = Math.max(1, Math.floor((available + gap) / (nominal + gap)));
    return result(columns, sideFor(columns));
  }

  // Days: the widest k that still leaves squares of at least MIN_SIZE bounds the search.
  const maxK = Math.max(1, Math.floor(Math.floor((available + gap) / (MIN_SIZE + gap)) / 7));
  let bestK = 1;
  let bestError = Infinity;
  for (let k = 1; k <= maxK; k++) {
    const side = sideFor(7 * k);
    if (side < MIN_SIZE) break;
    const error = Math.abs(Math.log(side / nominal));
    if (error < bestError) {
      bestError = error;
      bestK = k;
    }
  }
  return result(7 * bestK, sideFor(7 * bestK));
}

/**
 * Empty cells before the first bucket: days start on their weekday (Monday = column 0), months
 * on their month (January = column 0). Weeks always start on Monday already.
 */
export function leadingCells(buckets: Bucket[], granularity: Granularity): number {
  if (buckets.length === 0) return 0;
  if (granularity === "days") return (buckets[0].start.getDay() + 6) % 7;
  if (granularity === "months") return buckets[0].start.getMonth();
  return 0;
}

/** Column headers for the month layout. */
export function monthLabels(style: "short" | "narrow"): string[] {
  const fmt = new Intl.DateTimeFormat(undefined, { month: style });
  return Array.from({ length: MONTHS_PER_ROW }, (_, m) => fmt.format(new Date(2001, m, 1)));
}

export interface YearLabel {
  row: number;
  text: string;
}

/**
 * Left-gutter labels: a year is shown at the first row containing its Jan 1 (for months, that is
 * simply each row's year). The first row also carries the year the data starts in. If several
 * years land on the same row (narrow squares, weekly buckets) they are combined, e.g. "2021–23".
 */
export function yearLabels(
  buckets: Bucket[],
  leading: number,
  columns: number,
  granularity: Granularity,
): YearLabel[] {
  if (buckets.length === 0) return [];
  const rows = new Map<number, Set<number>>();
  const add = (row: number, year: number) => {
    const years = rows.get(row) ?? new Set<number>();
    years.add(year);
    rows.set(row, years);
  };

  add(0, buckets[0].start.getFullYear());
  buckets.forEach((b, i) => {
    const last = granularity === "weeks" ? addDays(b.start, 6) : b.start;
    const startsOnJan1 = b.start.getMonth() === 0 && b.start.getDate() === 1;
    // A week contains Jan 1 when it spans two years.
    if (startsOnJan1 || last.getFullYear() !== b.start.getFullYear()) {
      add(Math.floor((leading + i) / columns), last.getFullYear());
    }
  });

  return [...rows]
    .sort((a, b) => a[0] - b[0])
    .map(([row, set]) => {
      const years = [...set].sort((a, b) => a - b);
      const first = years[0];
      const last = years[years.length - 1];
      return { row, text: years.length > 1 ? `${first}–${String(last).slice(-2)}` : String(first) };
    });
}
