import type { Scrobble, TimeFrame } from "./types";

export const TIME_FRAMES: readonly TimeFrame[] = ["6months", "1year", "all"];
export const DEFAULT_TIME_FRAME: TimeFrame = "1year";

/** Start of the time frame as a Unix timestamp in seconds, or undefined for all history. */
export function fromTimestamp(timeFrame: TimeFrame, now: Date): number | undefined {
  if (timeFrame === "all") return undefined;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setMonth(start.getMonth() - (timeFrame === "6months" ? 6 : 12));
  return Math.floor(start.getTime() / 1000);
}

/**
 * Whether a cache holding everything since `coversFrom` (null = entire history) can serve a
 * request starting at `from` (undefined = entire history).
 */
export function coversTimeFrame(coversFrom: number | null, from: number | undefined): boolean {
  if (coversFrom === null) return true;
  return from !== undefined && coversFrom <= from;
}

/** Scrobbles at or after `from`; all of them when `from` is undefined. */
export function filterFrom(scrobbles: Scrobble[], from: number | undefined): Scrobble[] {
  return from === undefined ? scrobbles : scrobbles.filter((s) => s.ts >= from);
}
