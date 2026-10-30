import { hexToOklab, hexToOklch, mixColors, oklchToHex, parseHex } from "./color";
import type { ThemeId } from "./settings";

/** The two inks, and the two backgrounds that go with them. */
export const INK_DARK = "#0a0a0a";
export const INK_LIGHT = "#f2f0e8";
export const BLACK = "#0a0a0a";
export const PAPER = "#f2f0e8";

/** A color whose OKLab lightness is above this is "light". */
const LIGHT_TONE_THRESHOLD = 0.6;

export type Tone = "dark" | "light";

export const toneOf = (color: string): Tone =>
  hexToOklab(color).l > LIGHT_TONE_THRESHOLD ? "light" : "dark";

/** The ink to use on `bg`: near-black on light colors, warm off-white on dark ones. */
export const inkFor = (bg: string): string => (toneOf(bg) === "light" ? INK_DARK : INK_LIGHT);

/**
 * How far the muted ink is pulled from the background toward the ink. 0.45 gives 3.1 to 3.6:1 contrast
 * (enough for UI parts and disabled states); about 0.61 would reach 4.5:1 for small text everywhere.
 */
export const MUTED_INK_SHARE = 0.45;

/** Secondary text and disabled states: the background mixed 45 % toward the ink (OKLab). */
export const mutedInk = (bg: string, ink: string): string => mixColors(bg, ink, MUTED_INK_SHARE);

/** Everything a scope (the page, or the inside of a card) needs: fill, ink, muted ink, tone. */
export interface ScopeColors {
  bg: string;
  ink: string;
  muted: string;
  tone: Tone;
}

export function scopeColors(bg: string): ScopeColors {
  const ink = inkFor(bg);
  return { bg, ink, muted: mutedInk(bg, ink), tone: toneOf(bg) };
}

// --- scheme tints -------------------------------------------------------------------------------

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** The accent for the scheme themes: the most chromatic (highest OKLCH chroma) of `colors`. */
export function accentOf(colors: readonly string[]): string {
  let best = colors[0] ?? "#888888";
  let bestChroma = -1;
  for (const color of colors) {
    const { c } = hexToOklch(color);
    if (c > bestChroma) {
      best = color;
      bestChroma = c;
    }
  }
  return best;
}

/** A calm tint of the accent's hue at lightness `l`: chroma = clamp(accent chroma x 0.8, 0.04, 0.13). */
export function schemeTint(accent: string, l: number): string {
  const { c, h } = hexToOklch(accent);
  return oklchToHex(l, clamp(c * 0.8, 0.04, 0.13), h);
}

// --- themes -------------------------------------------------------------------------------------

export interface Theme {
  id: ThemeId;
  name: string;
  /** The page background (header, user form). */
  outside: string;
  /** The fill of every card: controls, Advanced panel, mosaic panel, tooltip. */
  inside: string;
}

export const THEME_NAMES: Record<ThemeId, string> = {
  black: "Black",
  white: "White",
  "dark-on-white": "Dark cards on white",
  "light-on-black": "Light cards on black",
  "scheme-dark": "Scheme + dark cards",
  "scheme-light": "Scheme + light cards",
  custom: "Custom",
};

/** The scheme presets' outside lightness. */
const SCHEME_DARK_CARDS_OUTSIDE_L = 0.8;
const SCHEME_LIGHT_CARDS_OUTSIDE_L = 0.34;

/** All themes in picker order. The scheme ones follow `accent`; Custom uses the user's colors. */
export function presetThemes(
  accent: string,
  custom: { outside: string; inside: string },
): Theme[] {
  const colors: Record<ThemeId, [string, string]> = {
    black: [BLACK, BLACK],
    white: [PAPER, PAPER],
    "dark-on-white": [PAPER, BLACK],
    "light-on-black": [BLACK, PAPER],
    "scheme-dark": [schemeTint(accent, SCHEME_DARK_CARDS_OUTSIDE_L), BLACK],
    "scheme-light": [schemeTint(accent, SCHEME_LIGHT_CARDS_OUTSIDE_L), PAPER],
    custom: [custom.outside, custom.inside],
  };
  return (Object.keys(THEME_NAMES) as ThemeId[]).map((id) => ({
    id,
    name: THEME_NAMES[id],
    outside: colors[id][0],
    inside: colors[id][1],
  }));
}

export interface QuickColor {
  name: string;
  hex: string;
}

/** Quick swatches of the Custom theme's "Outside" row: Black, Paper, five scheme tints. */
export function outsideQuickColors(accent: string): QuickColor[] {
  return [
    { name: "Black", hex: BLACK },
    { name: "Paper", hex: PAPER },
    ...[0.22, 0.4, 0.6, 0.78, 0.92].map((l) => ({
      name: `Scheme tint ${l.toFixed(2)}`,
      hex: schemeTint(accent, l),
    })),
  ];
}

/** Quick swatches of the Custom theme's "Inside" row. */
export function insideQuickColors(accent: string): QuickColor[] {
  return [
    { name: "Black", hex: BLACK },
    { name: "Charcoal", hex: "#1c1c1c" },
    { name: "Paper", hex: PAPER },
    { name: "White", hex: "#ffffff" },
    { name: "Scheme tint 0.20", hex: schemeTint(accent, 0.2) },
    { name: "Scheme tint 0.94", hex: schemeTint(accent, 0.94) },
  ];
}

// --- the mosaic's colors follow the inside ---------------------------------------------------------

/** Colors derived from the inside of the cards, for everything the mosaic draws. */
export interface CardLook {
  inside: string;
  ink: string;
  tone: Tone;
  /** OKLab lightness of `inside`. */
  insideL: number;
  /** Zero-scrobble squares: the inside mixed 7 % toward the ink. */
  zero: string;
  /** The two alternating greys of "other artists". */
  greys: readonly [string, string];
  /** The 2px inset border of a hollow square: the inside mixed 25 % toward the ink. */
  hollowBorder: string;
}

export function cardLook(inside: string): CardLook {
  const ink = inkFor(inside);
  return {
    inside,
    ink,
    tone: toneOf(inside),
    insideL: hexToOklab(inside).l,
    zero: mixColors(inside, ink, 0.07),
    // On the black inside these are about the former fixed greys (OKLab L 0.42 and 0.52).
    greys: [mixColors(inside, ink, 0.34), mixColors(inside, ink, 0.46)],
    hollowBorder: mixColors(inside, ink, 0.25),
  };
}

/** Smallest lightness difference an artist color keeps from the inside. */
export const MIN_ARTIST_CONTRAST = 0.14;
/** Quantizing to 8 bits moves lightness by up to ~0.002; stay clear of the limit. */
const GUARD_MARGIN = 0.003;

/**
 * Contrast guard: if the color's lightness is closer than 0.14 to the inside's, move it to 0.14
 * away (hue and chroma kept, gamut-reduced). The direction is toward the middle of the lightness
 * range: up on a dark inside, down on a light one.
 */
export function guardLightness(hex: string, insideL: number): string {
  const { l, c, h } = hexToOklch(hex);
  if (Math.abs(l - insideL) >= MIN_ARTIST_CONTRAST) return hex;
  const gap = MIN_ARTIST_CONTRAST + GUARD_MARGIN;
  return oklchToHex(insideL < 0.5 ? insideL + gap : insideL - gap, c, h);
}

/**
 * The gradient must read as "low = close to the background, high = far from it": a dark inside
 * keeps the stops (dark to bright), a light inside samples them in reverse.
 */
export const orientStops = (stops: readonly string[], insideTone: Tone): string[] =>
  insideTone === "light" ? [...stops].reverse() : [...stops];

// --- contrast (for verification and documentation) ------------------------------------------------

function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1..21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
