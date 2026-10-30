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

/**
 * Themes: "outside" is the page background (header, form), "inside" the fill of every card
 * (controls, Advanced, mosaic panel, tooltip). See `src/lib/theme.ts`.
 */
export type ThemeId =
  | "black"
  | "white"
  | "dark-on-white"
  | "light-on-black"
  | "scheme-dark"
  | "scheme-light"
  | "custom";
export const THEME_IDS: readonly ThemeId[] = [
  "black",
  "white",
  "dark-on-white",
  "light-on-black",
  "scheme-dark",
  "scheme-light",
  "custom",
];
export const DEFAULT_THEME: ThemeId = "black";
/** The Custom theme starts as black outside, charcoal inside. */
export const DEFAULT_CUSTOM_OUTSIDE = "#0a0a0a";
export const DEFAULT_CUSTOM_INSIDE = "#1c1c1c";

/**
 * Narrow screens: the mosaic panel's measured inner width is below this (px). Then "Zoom" is
 * relabeled "Detail" and the "Per row" control appears.
 */
export const NARROW_PANEL_PX = 640;

/** "Per row" is stored as an index so it survives granularity changes. */
export type PerRowIndex = 0 | 1 | 2;
export const PER_ROW_INDEXES: readonly PerRowIndex[] = [0, 1, 2];
export const DEFAULT_PER_ROW: PerRowIndex = 0;
/** Columns of index 1 and 2 (index 0 keeps the calendar layout); days and weeks 7 / 4 / 2, months 12 / 6 / 3. */
export const PER_ROW_COLUMNS: Record<Granularity, readonly [number, number, number]> = {
  days: [7, 4, 2],
  weeks: [7, 4, 2],
  months: [12, 6, 3],
};

/** The Advanced panel (pool, size variation, color tuning, custom page color) is open or closed. */
export type AdvancedState = "open" | "closed";
export const ADVANCED_STATES: readonly AdvancedState[] = ["open", "closed"];
export const DEFAULT_ADVANCED: AdvancedState = "closed";
