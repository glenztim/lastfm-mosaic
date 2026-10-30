/**
 * Small dependency-free color helpers. Colors are `#rrggbb` strings at the edges; mixing and
 * palette generation happen in OKLab / OKLCH (Björn Ottosson), where equal steps look equal.
 * Mixing far-apart colors in sRGB goes through muddy grey midpoints; OKLab does not.
 */

export type Rgb = readonly [number, number, number];
/** L: lightness 0..1, a/b: green-red and blue-yellow axes (about -0.4..0.4). */
export interface Oklab {
  l: number;
  a: number;
  b: number;
}

/** Page background (must match `--background` in globals.css); used to dim colors. */
export const COLOR_PAGE: Rgb = [10, 10, 10];

export function parseHex(hex: string): Rgb {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb;
}

const toHexByte = (v: number) =>
  Math.round(Math.min(255, Math.max(0, v)))
    .toString(16)
    .padStart(2, "0");

export const rgbToHex = ([r, g, b]: Rgb) => `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;

// --- sRGB <-> OKLab ---------------------------------------------------------------------------

const srgbToLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (v: number) =>
  v <= 0.0031308 ? v * 12.92 : 1.055 * Math.sign(v) * Math.abs(v) ** (1 / 2.4) - 0.055;

export function hexToOklab(hex: string): Oklab {
  const [r, g, b] = parseHex(hex).map((v) => srgbToLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** Linear-light sRGB of an OKLab color; channels outside 0..1 mean it is outside the sRGB gamut. */
function oklabToLinear({ l, a, b }: Oklab): [number, number, number] {
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const GAMUT_EPSILON = 1e-4;
const inGamut = (rgb: readonly number[]) =>
  rgb.every((v) => v >= -GAMUT_EPSILON && v <= 1 + GAMUT_EPSILON);

/** OKLCH: lightness, chroma, hue in degrees. */
export function hexToOklch(hex: string): { l: number; c: number; h: number } {
  const { l, a, b } = hexToOklab(hex);
  return { l, c: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
}

/**
 * `#rrggbb` for an OKLCH color. If it lies outside the sRGB gamut, chroma is reduced (lightness
 * and hue kept) until it fits, so the result never shifts hue or lightness the way channel
 * clipping does.
 */
export function oklchToHex(l: number, c: number, h: number): string {
  const light = Math.min(1, Math.max(0, l));
  const rad = (h * Math.PI) / 180;
  const at = (chroma: number) =>
    oklabToLinear({ l: light, a: chroma * Math.cos(rad), b: chroma * Math.sin(rad) });

  let chroma = Math.max(0, c);
  if (!inGamut(at(chroma))) {
    // Binary search for the largest chroma that still fits.
    let lo = 0;
    let hi = chroma;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(at(mid))) lo = mid;
      else hi = mid;
    }
    chroma = lo;
  }
  const rgb = at(chroma).map((v) => linearToSrgb(Math.min(1, Math.max(0, v))) * 255);
  return rgbToHex(rgb as unknown as Rgb);
}

function oklabToHex({ l, a, b }: Oklab): string {
  return oklchToHex(l, Math.hypot(a, b), (Math.atan2(b, a) * 180) / Math.PI);
}

// --- mixing and gradients ---------------------------------------------------------------------

/** Mix of two `#rrggbb` colors in OKLab; `t` 0 = `a`, 1 = `b`. */
export function mixColors(a: string, b: string, t: number): string {
  const x = hexToOklab(a);
  const y = hexToOklab(b);
  return oklabToHex({
    l: x.l + (y.l - x.l) * t,
    a: x.a + (y.a - x.a) * t,
    b: x.b + (y.b - x.b) * t,
  });
}

/** Color at `t` (0..1) along evenly spaced gradient stops, interpolated piecewise in OKLab. */
export function gradientColor(stops: readonly string[], t: number): string {
  if (stops.length === 1) return stops[0];
  const pos = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(pos));
  return mixColors(stops[i], stops[i + 1], pos - i);
}

/** `steps` colors sampled evenly along the gradient (both ends included), e.g. for a CSS gradient. */
export function gradientSamples(stops: readonly string[], steps = 12): string[] {
  return Array.from({ length: steps }, (_, i) => gradientColor(stops, i / (steps - 1)));
}

// --- tuning -----------------------------------------------------------------------------------

/** User adjustments applied in OKLCH: hue shift in degrees, saturation in % (100 = unchanged), brightness added to L. */
export interface Tune {
  hue: number;
  sat: number;
  bright: number;
}
export const NO_TUNE: Tune = { hue: 0, sat: 100, bright: 0 };
export const TUNE_RANGES = {
  hue: { min: -180, max: 180, step: 1 },
  sat: { min: 0, max: 200, step: 1 },
  bright: { min: -0.15, max: 0.15, step: 0.01 },
} as const;

export const isNoTune = (t: Tune) => t.hue === 0 && t.sat === 100 && t.bright === 0;

/** `hex` with hue shifted, chroma scaled and lightness offset; out-of-gamut results lose chroma only. */
export function tuneColor(hex: string, tune: Tune): string {
  if (isNoTune(tune)) return hex;
  const { l, c, h } = hexToOklch(hex);
  return oklchToHex(l + tune.bright, (c * tune.sat) / 100, (((h + tune.hue) % 360) + 360) % 360);
}

const GRADIENT_L_MIN = 0.05;
const GRADIENT_L_MAX = 0.98;

/**
 * Tunes every stop of a gradient. Lightness is clamped to [0.05, 0.98] and kept non-decreasing
 * along the stops, so a gradient stays sequential (dark = few, bright = many) whatever the sliders do.
 */
export function tuneGradient(stops: readonly string[], tune: Tune): string[] {
  if (isNoTune(tune)) return [...stops];
  let floor = 0;
  return stops.map((hex) => {
    const { l, c, h } = hexToOklch(hex);
    const light = Math.max(floor, Math.min(GRADIENT_L_MAX, Math.max(GRADIENT_L_MIN, l + tune.bright)));
    floor = light;
    return oklchToHex(light, (c * tune.sat) / 100, (((h + tune.hue) % 360) + 360) % 360);
  });
}

// --- generated and extended palettes ------------------------------------------------------------

const CANDIDATE_LIGHTNESS = [0.45, 0.55, 0.65, 0.75, 0.85];
/** The first pick: lightness 0.65, the middle chroma, hue 20 (a red) in hue sector 0. */
const START_LIGHTNESS = 0.65;
const START_HUE = 20;

/** Chromatic candidates are grouped in 12 hue sectors of 30 degrees. */
const SECTOR_COUNT = 12;
const SECTOR_DEGREES = 360 / SECTOR_COUNT;
/** Sector visiting order of the first round: far-apart hues in a row. Later rounds rotate it. */
const SECTOR_ORDER = [0, 6, 3, 9, 1, 7, 4, 10, 2, 8, 5, 11];
/** One near-neutral color is inserted after this many chromatic ones. */
const NEUTRAL_EVERY = 6;
/** Near-neutral candidates (C <= 0.03): greys at many lightness steps, plus a warm and a cool tint. */
const NEUTRAL_LIGHTNESS = Array.from({ length: 12 }, (_, i) => 0.4 + i * 0.05);
const NEUTRAL_TINTS: readonly (readonly [chroma: number, hue: number])[] = [
  [0, 0],
  [0.03, 60],
  [0.03, 240],
];
/** Chroma differences count less than lightness differences in `paletteDistance`. */
const CHROMA_WEIGHT = 0.7;

/** OKLab distance with the a/b (chroma) axes weighted down: lightness differences matter more. */
function paletteDistance(x: Oklab, y: Oklab): number {
  return Math.hypot(x.l - y.l, CHROMA_WEIGHT * (x.a - y.a), CHROMA_WEIGHT * (x.b - y.b));
}

/**
 * `n` colors, hue balanced and deterministic. Why not plain maximin: in OKLab the sRGB gamut has
 * its widest chroma range around violet/magenta/pink, so unconstrained farthest-point selection
 * clusters there and leaves other hues empty.
 *
 * - Candidates: hue 0..350 (step 10) x lightness {0.45 .. 0.85} x the given `chromas`, gamut-reduced
 *   and deduplicated afterwards (reduction can collapse neighbors), split into 12 hue sectors of
 *   30 degrees. Separately, near-neutral candidates (C <= 0.03).
 * - Selection runs in rounds, each taking one color from every sector. The sectors are visited in
 *   the order [0,6,3,9,1,7,4,10,2,8,5,11] rotated by one position per round, so consecutive ranks
 *   are far apart in hue. Within a sector the pick is the candidate with the largest minimum
 *   `paletteDistance` to everything selected so far (ties: earliest candidate).
 * - After every 6 chromatic colors one near-neutral color is inserted, its lightness chosen by the
 *   same maximin rule.
 * - The very first color is a fixed candidate (L 0.65, middle chroma, hue 20).
 */
export function hueBalancedPalette(n: number, chromas: readonly number[]): string[] {
  interface Candidate {
    hex: string;
    lab: Oklab;
  }
  const seen = new Set<string>();
  const make = (l: number, c: number, h: number): Candidate | null => {
    const hex = oklchToHex(l, c, h);
    if (seen.has(hex)) return null;
    seen.add(hex);
    return { hex, lab: hexToOklab(hex) };
  };

  const sectors: Candidate[][] = Array.from({ length: SECTOR_COUNT }, () => []);
  for (const l of CANDIDATE_LIGHTNESS) {
    for (const c of chromas) {
      for (let h = 0; h < 360; h += 10) {
        const cand = make(l, c, h);
        if (cand) sectors[Math.floor(h / SECTOR_DEGREES)].push(cand);
      }
    }
  }
  const neutrals: Candidate[] = [];
  for (const l of NEUTRAL_LIGHTNESS) {
    for (const [c, h] of NEUTRAL_TINTS) {
      const cand = make(l, c, h);
      if (cand) neutrals.push(cand);
    }
  }

  // Minimum distance of every candidate to the selected colors; selected ones drop to 0.
  const minDist = new Map<Candidate, number>();
  for (const cand of [...sectors.flat(), ...neutrals]) minDist.set(cand, Infinity);
  const selected: string[] = [];
  const choose = (pick: Candidate) => {
    selected.push(pick.hex);
    for (const [cand, d] of minDist) {
      const nd = cand === pick ? 0 : Math.min(d, paletteDistance(cand.lab, pick.lab));
      minDist.set(cand, nd);
    }
  };
  const best = (pool: readonly Candidate[]): Candidate | undefined => {
    let pick: Candidate | undefined;
    let pickDist = 0;
    for (const cand of pool) {
      const d = minDist.get(cand)!;
      if (d > pickDist) {
        pick = cand;
        pickDist = d;
      }
    }
    return pick;
  };

  const startHex = oklchToHex(START_LIGHTNESS, chromas[Math.floor(chromas.length / 2)], START_HUE);
  let chromatic = 0;
  let neutralCount = 0;
  while (selected.length < n) {
    let pick: Candidate | undefined;
    if (chromatic > 0 && chromatic % NEUTRAL_EVERY === 0 && neutralCount < chromatic / NEUTRAL_EVERY) {
      neutralCount++;
      pick = best(neutrals);
    } else {
      const round = Math.floor(chromatic / SECTOR_COUNT);
      const sector = SECTOR_ORDER[(chromatic + round) % SECTOR_COUNT];
      pick =
        chromatic === 0
          ? (sectors[sector].find((c) => c.hex === startHex) ?? best(sectors[sector]))
          : (best(sectors[sector]) ?? best(sectors.flat()));
      chromatic++;
    }
    if (!pick) break; // candidates exhausted
    choose(pick);
  }
  return selected;
}

/** Lightness change and hue nudge of the k-th repetition (k = 0 is the original palette). */
const VARIANT_LIGHTNESS = [0, 0.1, -0.1];
const VARIANT_HUE_STEP = 6;
const VARIANT_L_MIN = 0.2;
const VARIANT_L_MAX = 0.95;

/**
 * `n` colors from a (shorter) palette: the palette itself, then variants of it so ranks beyond its
 * length stay mostly distinct: second round lighter (+0.10), third darker (-0.10), later rounds
 * repeat that pattern with the hue nudged a few more degrees each round. A longer palette is cut.
 */
export function extendPalette(colors: readonly string[], n: number): string[] {
  if (n <= colors.length || colors.length === 0) return colors.slice(0, n);
  const out = [...colors];
  for (let i = colors.length; i < n; i++) {
    const round = Math.floor(i / colors.length);
    const { l, c, h } = hexToOklch(colors[i % colors.length]);
    const light = Math.min(VARIANT_L_MAX, Math.max(VARIANT_L_MIN, l + VARIANT_LIGHTNESS[round % 3]));
    out.push(oklchToHex(light, c, (h + VARIANT_HUE_STEP * round) % 360));
  }
  return out;
}
