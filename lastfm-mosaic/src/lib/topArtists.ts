import { bucketKey, bucketStart } from "./aggregate";
import type { ArtistCount, Granularity, Scrobble } from "./types";

function ranked(counts: Map<string, number>): ArtistCount[] {
  return [...counts]
    .map(([artist, count]) => ({ artist, count }))
    .sort((a, b) => b.count - a.count || (a.artist < b.artist ? -1 : 1));
}

/**
 * Artists per bucket, sorted by plays descending. Keys match `aggregate`'s bucket keys
 * (local-time-zone day, ISO week or month). Buckets without scrobbles are absent.
 */
export function topArtistsByBucket(
  scrobbles: Scrobble[],
  granularity: Granularity,
): Map<string, ArtistCount[]> {
  const perBucket = new Map<string, Map<string, number>>();
  for (const s of scrobbles) {
    const key = bucketKey(bucketStart(new Date(s.ts * 1000), granularity), granularity);
    let counts = perBucket.get(key);
    if (!counts) perBucket.set(key, (counts = new Map()));
    counts.set(s.artist, (counts.get(s.artist) ?? 0) + 1);
  }
  const result = new Map<string, ArtistCount[]>();
  for (const [key, counts] of perBucket) result.set(key, ranked(counts));
  return result;
}

/** All artists over all scrobbles, sorted by plays descending (ties by name): rank = index. */
export function rankedArtists(scrobbles: Scrobble[]): ArtistCount[] {
  const counts = new Map<string, number>();
  for (const s of scrobbles) counts.set(s.artist, (counts.get(s.artist) ?? 0) + 1);
  return ranked(counts);
}

/** The `n` most played artists over all scrobbles, sorted by plays descending. */
export function topArtistsOverall(scrobbles: Scrobble[], n: number): ArtistCount[] {
  return rankedArtists(scrobbles).slice(0, n);
}
