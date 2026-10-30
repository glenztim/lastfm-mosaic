export interface Scrobble {
  /** Unix timestamp in seconds. */
  ts: number;
  artist: string;
  track: string;
  album: string;
}

export type Granularity = "days" | "weeks" | "months";

export type TimeFrame = "6months" | "1year" | "all";

export interface ScrobblePage {
  scrobbles: Scrobble[];
  page: number;
  totalPages: number;
}

export interface ArtistCount {
  artist: string;
  count: number;
}

export interface Bucket {
  /** Local date `YYYY-MM-DD` of the day, or of the Monday that starts the week; `YYYY-MM` for a month. */
  key: string;
  /** Local midnight of the first day of the bucket. */
  start: Date;
  count: number;
}
