import { hexToOklab, hexToOklch, mixColors, oklchToHex, parseHex } from "./color";
import type { PageBackground } from "./settings";

/** The two fixed page backgrounds and the two inks (also the panel's fixed colors). */
export const PAGE_BLACK = "#0a0a0a";
export const PAGE_PAPER = "#f2f0e8";
export const INK_DARK = "#0a0a0a";
export const INK_LIGHT = "#f2f0e8";

/** A page whose background has OKLab lightness above this is "light" (dark ink). */
const LIGHT_TONE_THRESHOLD = 0.6;

/** Scheme backgrounds are tinted with the accent's hue; chroma is kept low so they stay calm. */
const SCHEME_DARK = { lightness: 0.2, chromaShare: 0.5, maxChroma: 0.06 };
const SCHEME_LIGHT = { lightness: 0.93, chromaShare: 0.35, maxChroma: 0.04 };

/** Dark tinted background from the accent: oklch(0.20, min(c * 0.5, 0.06), h). */
export function schemeDark(accent: string): string {
  const { c, h } = hexToOklch(accent);
  return oklchToHex(SCHEME_DARK.lightness, Math.min(c * SCHEME_DARK.chromaShare, SCHEME_DARK.maxChroma), h);
}

/** Light tinted background from the accent: oklch(0.93, min(c * 0.35, 0.04), h). */
export function schemeLight(accent: string): string {
  const { c, h } = hexToOklch(accent);
  return oklchToHex(
    SCHEME_LIGHT.lightness,
    Math.min(c * SCHEME_LIGHT.chromaShare, SCHEME_LIGHT.maxChroma),
    h,
  );
}

/** Background color of every choice. `accent` drives the two scheme backgrounds. */
export function pageBackgrounds(accent: string, custom: string): Record<PageBackground, string> {
  return {
    black: PAGE_BLACK,
    paper: PAGE_PAPER,
    "scheme-dark": schemeDark(accent),
    "scheme-light": schemeLight(accent),
    custom,
  };
}

export type Tone = "dark" | "light";

export const toneOf = (bg: string): Tone =>
  hexToOklab(bg).l > LIGHT_TONE_THRESHOLD ? "light" : "dark";

/** WCAG relative luminance of a `#rrggbb` color. */
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

/** Secondary text: the ink pulled toward the background as far as 4.5:1 contrast allows (max 35 %). */
function dimInk(ink: string, bg: string): string {
  for (const t of [0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.05]) {
    const dim = mixColors(ink, bg, t);
    if (contrastRatio(dim, bg) >= 4.5) return dim;
  }
  return ink;
}

export interface PageTheme {
  bg: string;
  ink: string;
  inkDim: string;
  tone: Tone;
}

/** Light backgrounds get dark ink, dark backgrounds get warm off-white ink. */
export function pageTheme(bg: string): PageTheme {
  const tone = toneOf(bg);
  const ink = tone === "light" ? INK_DARK : INK_LIGHT;
  return { bg, ink, inkDim: dimInk(ink, bg), tone };
}
