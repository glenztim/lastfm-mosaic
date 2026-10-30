import type { Granularity } from "./types";

/**
 * Display-time settings (toolbar). Changing them never touches the network or IndexedDB;
 * they are remembered in localStorage. The fetch-time inputs (username, time frame) live in the form.
 */

export type View = "timeline" | "artists";
export const VIEWS: readonly View[] = ["timeline", "artists"];
export const DEFAULT_VIEW: View = "timeline";

export const GRANULARITIES: readonly Granularity[] = ["days", "weeks", "months"];
export const DEFAULT_GRANULARITY: Granularity = "days";

/** Timeline nesting: count square with artists inside, or the bucket's top artists alone. */
export type Nesting = "volume" | "artists";
export const NESTINGS: readonly Nesting[] = ["volume", "artists"];
export const DEFAULT_NESTING: Nesting = "volume";

/** "Pool": the top N artists (by plays in the loaded range) that get a palette color. */
export type PoolSize = 15 | 30 | 50 | "all";
export const POOL_OPTIONS: readonly PoolSize[] = [15, 30, 50, "all"];
export const DEFAULT_POOL: PoolSize = 30;
export const poolLimit = (pool: PoolSize) => (pool === "all" ? Infinity : pool);

/** "Outside the pool": artists beyond the pool are left out of the rings (skip) or drawn grey. */
export type OutsidePool = "skip" | "grey";
export const OUTSIDE_POOL_OPTIONS: readonly OutsidePool[] = ["skip", "grey"];
export const DEFAULT_OUTSIDE_POOL: OutsidePool = "skip";

/** The artist legend names this many artists by overall rank, whatever the pool is. */
export const LEGEND_ARTISTS = 15;
/** "Size variation" of the rings in Artists only nesting, in %. */
export const SIZE_VARIATION = { min: 0, max: 100, step: 5, fallback: 25 } as const;

export const TOP_N_OPTIONS: readonly number[] = [5, 8, 12];
export const DEFAULT_TOP_N = 8;

/** Singular unit name, e.g. for "scrobbles per day". */
export const GRANULARITY_UNIT: Record<Granularity, string> = {
  days: "day",
  weeks: "week",
  months: "month",
};

/** Page background (header, form, controls, Advanced panel). The mosaic panel is always dark. */
export type PageBackground = "black" | "paper" | "scheme-dark" | "scheme-light" | "custom";
export const PAGE_BACKGROUNDS: readonly PageBackground[] = [
  "black",
  "paper",
  "scheme-dark",
  "scheme-light",
  "custom",
];
export const DEFAULT_PAGE_BACKGROUND: PageBackground = "black";
export const DEFAULT_CUSTOM_BACKGROUND = "#1d2433";

/** The Advanced panel (pool, size variation, color tuning, custom page color) is open or closed. */
export type AdvancedState = "open" | "closed";
export const ADVANCED_STATES: readonly AdvancedState[] = ["open", "closed"];
export const DEFAULT_ADVANCED: AdvancedState = "closed";
