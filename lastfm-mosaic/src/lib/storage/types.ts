import type { Scrobble } from "../types";

/** Describes what a cached scrobble list covers. */
export interface CacheMeta {
  /** Earliest timestamp (Unix seconds) the cache covers; null = entire history. */
  coversFrom: number | null;
  /** When the data was fetched from Last.fm (ms since epoch). */
  fetchedAt: number;
}

export interface CachedScrobbles {
  scrobbles: Scrobble[];
  meta: CacheMeta;
}

export interface ScrobbleStore {
  /** Replaces the user's cache (scrobbles and metadata are written together). */
  save(user: string, scrobbles: Scrobble[], meta: CacheMeta): Promise<void>;
  /** Undefined when nothing usable is cached (no entry, or an entry without metadata). */
  load(user: string): Promise<CachedScrobbles | undefined>;
  clear(): Promise<void>;
}
