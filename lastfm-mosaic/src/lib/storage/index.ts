import { indexedDbStore } from "./indexedDbStore";
import type { CacheMeta, CachedScrobbles, ScrobbleStore } from "./types";

export type { CacheMeta, CachedScrobbles, ScrobbleStore };
export const scrobbleStore: ScrobbleStore = indexedDbStore;
