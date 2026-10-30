import { extendPalette, parseHex } from "./color";
import type { OutsidePool } from "./settings";
import { guardLightness, type CardLook } from "./theme";
import type { ArtistCount } from "./types";

/** Artists by plays descending over the loaded range: rank = index. */
export interface ArtistRanking {
  names: readonly string[];
  rank: ReadonlyMap<string, number>;
}

export function makeRanking(ranked: readonly ArtistCount[]): ArtistRanking {
  return {
    names: ranked.map((a) => a.artist),
    rank: new Map(ranked.map((a, i) => [a.artist, i])),
  };
}

/**
 * Colors of artists by rank. The pool is the top `poolCount` ranks: they get palette colors.
 * Artists beyond it are drawn in alternating greys (derived from the card inside and its ink), or
 * not drawn at all (`skipOutside`).
 */
export interface ArtistColoring {
  ranking: ArtistRanking;
  /** The colors derived from the card inside: zero color, greys, hollow border, lightness. */
  look: CardLook;
  /** Size of the pool: min(pool, number of artists). "All" makes it the whole ranking. */
  poolCount: number;
  /** Artists outside the pool are left out of the rings (never true when the pool is everyone). */
  skipOutside: boolean;
  /** Rank of an artist; unknown names rank last. */
  rankOf(artist: string): number;
  /** The palette color of `rank` (extended with variants if the palette is shorter), or a grey. */
  colorOfRank(rank: number): string;
  /** Whether the artist's ring is drawn: always, except outside the pool when skipping. */
  isDrawn(artist: string): boolean;
}

/**
 * Builds the coloring for a ranking. `palette` is the (tuned) base palette; it is extended with
 * variants (`extendPalette`) to cover every pool rank, and every color then gets the contrast
 * guard against the inside (`guardLightness`), before the neighbor nudge of `ringColors`.
 * `pool` may be Infinity.
 */
export function makeColoring(
  ranking: ArtistRanking,
  palette: readonly string[],
  pool: number,
  outside: OutsidePool,
  look: CardLook,
): ArtistColoring {
  const poolCount = Math.min(pool, ranking.names.length);
  const skipOutside = outside === "skip" && poolCount < ranking.names.length;
  const colors = extendPalette(palette, poolCount).map((c) => guardLightness(c, look.insideL));
  const rankOf = (artist: string) => ranking.rank.get(artist) ?? ranking.names.length;
  return {
    ranking,
    look,
    poolCount,
    skipOutside,
    rankOf,
    colorOfRank: (rank) => (rank < poolCount ? colors[rank] : look.greys[rank % 2]),
    isDrawn: (artist) => !skipOutside || rankOf(artist) < poolCount,
  };
}

/**
 * Skip mode: removes every artist outside the pool from each bucket's list (order, i.e. plays
 * descending, is kept). Buckets keep their key even when nothing is left, so "no pool artist" is
 * distinguishable from "not computed". Run once per aggregation, not per cell.
 */
export function filterBucketsToPool(
  byBucket: ReadonlyMap<string, ArtistCount[]>,
  ranking: ArtistRanking,
  poolCount: number,
): Map<string, ArtistCount[]> {
  const result = new Map<string, ArtistCount[]>();
  for (const [key, artists] of byBucket) {
    result.set(
      key,
      artists.filter((a) => (ranking.rank.get(a.artist) ?? Infinity) < poolCount),
    );
  }
  return result;
}

/**
 * Ring colors for artists in ring order, outermost first. A ring whose color equals its outer
 * neighbor's takes the color of the next rank instead (for greys that flips to the other grey),
 * so adjacent rings are always distinguishable.
 */
export function ringColors(artists: readonly string[], coloring: ArtistColoring): string[] {
  const colors: string[] = [];
  for (const artist of artists) {
    const rank = coloring.rankOf(artist);
    let color = coloring.colorOfRank(rank);
    if (colors.length > 0 && color === colors[colors.length - 1]) {
      color = coloring.colorOfRank(rank + 1);
    }
    colors.push(color);
  }
  return colors;
}

/** Mixes a `#rrggbb` color toward `bg` (the card inside); `amount` 0 = unchanged, 1 = `bg`. */
export function dimColor(hex: string, amount: number, bg: string): string {
  const target = parseHex(bg);
  const rgb = parseHex(hex).map((v, i) => Math.round(v + (target[i] - v) * amount));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}
