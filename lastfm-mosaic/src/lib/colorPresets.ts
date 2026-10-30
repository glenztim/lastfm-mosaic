import { gradientColor, hueBalancedPalette } from "./color";

/** 2 to 4 evenly spaced `#rrggbb` stops, low counts first. */
export type GradientStops =
  | readonly [string, string]
  | readonly [string, string, string]
  | readonly [string, string, string, string];

/**
 * The count gradient and the zero color. Sequential: perceived lightness must increase
 * monotonically along the stops (dark = few, bright = many); hue is decoration.
 */
export interface GradientPreset {
  id: string;
  name: string;
  /** Interpolated in OKLab (`gradientColor`). */
  stops: GradientStops;
  /** Squares with zero scrobbles: a very dark neutral just above the page background. */
  zero: string;
}

/** The gradient actually in use: a preset after the tune sliders. */
export interface ActiveGradient {
  stops: readonly string[];
  zero: string;
}

/** Categorical colors for artists, assigned by rank: the top artist gets `colors[0]`, and so on. */
export interface ArtistPalette {
  id: string;
  name: string;
  /** Shown next to the name in the picker. */
  note?: string;
  /** Distinguishable `#rrggbb` colors, readable on the dark page. Empty for `fromGradient`. */
  colors: readonly string[];
  /** The colors are sampled from the active gradient instead (`gradientPalette`). */
  fromGradient?: boolean;
}

export const GRADIENT_PRESETS: readonly GradientPreset[] = [
  {
    id: "violet-cream",
    name: "Violet & Cream",
    stops: ["#3a1c71", "#f4d6a0"],
    zero: "#181818",
  },
  {
    id: "albers",
    name: "Albers",
    stops: ["#2e3d52", "#d4a843"],
    zero: "#181a1c",
  },
  {
    id: "deep-sea",
    name: "Deep Sea",
    stops: ["#0b3a47", "#bff0e6"],
    zero: "#161a1c",
  },
  {
    id: "ember",
    name: "Ember",
    stops: ["#5a2610", "#ffb43a"],
    zero: "#1a1615",
  },
  {
    id: "mono",
    name: "Mono",
    stops: ["#333333", "#f5f5f5"],
    zero: "#171717",
  },
  {
    id: "sunset",
    name: "Sunset",
    stops: ["#1c1450", "#b3267f", "#f2742c", "#fff1a6"], // indigo, magenta, orange, pale yellow
    zero: "#171717",
  },
  {
    id: "spectrum",
    name: "Spectrum",
    stops: ["#1c2fa0", "#1ba8d6", "#4fd05a", "#f4ec55"], // blue, cyan, green, yellow
    zero: "#171717",
  },
  {
    id: "bauhaus",
    name: "Bauhaus",
    stops: ["#101b45", "#1f4fb5", "#d8352a", "#f6c915"], // navy, blue, red, yellow
    zero: "#171717",
  },
  {
    id: "pastel",
    name: "Pastel",
    stops: ["#2a1a52", "#e98dbd", "#ffc9a6", "#c4f5dd"], // dark violet, pink, peach, mint
    zero: "#171717",
  },
];

export const DEFAULT_GRADIENT_ID = "violet-cream";

/**
 * Purple family to go with the Violet & Cream gradient: aubergine, plum, violet, iris, lavender,
 * lilac, mauve, dusty rose, orchid, parchment and cream, plus accents (muted gold, teal, sage,
 * slate blue, terracotta). Lightness spread over L 0.32 to 0.93; consecutive entries are at least
 * 0.15 apart in OKLab, so neighbors (and the nudged neighbor of an equal pair) always differ.
 */
const VIOLET: ArtistPalette = {
  id: "violet",
  name: "Violet",
  colors: [
    "#7e57c2", // violet
    "#f1e6c9", // cream
    "#4a2360", // aubergine
    "#c9a24a", // muted gold
    "#b9a4e6", // lavender
    "#2f8f8b", // teal
    "#8e3b7a", // plum
    "#d9cfb4", // parchment
    "#5b62d6", // iris
    "#d79cae", // dusty rose
    "#2b2570", // deep indigo
    "#8fae8b", // sage
    "#b565b0", // orchid
    "#5d7390", // slate blue
    "#c9b8e0", // lilac
    "#6a3d5c", // dark mauve
    "#e6c27a", // pale gold
    "#9b6f94", // mauve
    "#1f6a6e", // dark teal
    "#e8b9d2", // blush
    "#8d9be0", // periwinkle
    "#7a6a2e", // olive gold
    "#a05cd6", // amethyst
    "#c27a6a", // terracotta rose
  ],
};

const ALBERS_PALETTE: ArtistPalette = {
  id: "albers",
  name: "Albers",
  colors: [
    "#d0a23c", // ochre
    "#9c4a2b", // rust
    "#6f7a34", // olive
    "#5b7f9f", // dusty blue
    "#75506b", // plum
    "#e2dac6", // off-white
    "#4a4642", // charcoal
    "#b9683c", // burnt orange
    "#7e3a32", // oxblood
    "#8a9a5b", // moss
    "#3f6485", // steel blue
    "#e0bf6a", // straw
    "#94657e", // mauve
    "#56704f", // fern
    "#b0a68f", // stone
    "#a85a3e", // sienna
    "#6a6a99", // dusty periwinkle
    "#a08a3c", // mustard
    "#7f9fb5", // pale blue-gray
    "#c4a27a", // camel
    "#6a4535", // umber
    "#aab98f", // sage
    "#503f5a", // aubergine
    "#cf9d8a", // dusty pink
  ],
};

const BAUHAUS_PALETTE: ArtistPalette = {
  id: "bauhaus",
  name: "Bauhaus",
  colors: [
    "#d8352a", // red
    "#f6c915", // yellow
    "#2a5bd7", // blue
    "#f07f1d", // orange
    "#2f9e5b", // green
    "#34343a", // black-ish
    "#f1ead8", // off-white
    "#b32a22", // dark red
    "#d9ad10", // mustard
    "#1f4aa8", // deep blue
    "#d4640f", // burnt orange
    "#1f7d46", // deep green
    "#46464c", // graphite
    "#d9d1bc", // cream
    "#e8574a", // light red
    "#ffdf5e", // light yellow
    "#5f8fe8", // light blue
    "#ff9d4d", // light orange
    "#5fbf82", // light green
    "#5a5a60", // slate
    "#bfb8a6", // stone
    "#8c1f1c", // oxblood
    "#3b6fe0", // mid blue
    "#8a8577", // warm gray
  ],
};

/** How many colors the generated palettes have (more are made by `extendPalette` when needed). */
const GENERATED_SIZE = 50;

/** "Match gradient" samples this many colors, from this position on (so the dark end doesn't vanish). */
export const GRADIENT_PALETTE_SIZE = 24;
const GRADIENT_PALETTE_FROM = 0.2;

/** Colors for the "Match gradient" palette: sampled along the (tuned) gradient. */
export function gradientPalette(stops: readonly string[], n = GRADIENT_PALETTE_SIZE): string[] {
  return Array.from({ length: n }, (_, i) =>
    gradientColor(stops, GRADIENT_PALETTE_FROM + ((1 - GRADIENT_PALETTE_FROM) * i) / (n - 1)),
  );
}

export const ARTIST_PALETTES: readonly ArtistPalette[] = [
  VIOLET,
  ALBERS_PALETTE,
  BAUHAUS_PALETTE,
  { id: "distinct", name: "Distinct", colors: hueBalancedPalette(GENERATED_SIZE, [0.05, 0.09, 0.13]) },
  {
    id: "distinct-muted",
    name: "Distinct muted",
    colors: hueBalancedPalette(GENERATED_SIZE, [0.03, 0.05, 0.07]),
  },
  {
    id: "match-gradient",
    name: "Match gradient",
    note: "pretty, less distinct",
    colors: [],
    fromGradient: true,
  },
];

export const DEFAULT_PALETTE_ID = "albers";

export function gradientPresetById(id: string): GradientPreset {
  return GRADIENT_PRESETS.find((g) => g.id === id) ?? GRADIENT_PRESETS[0];
}

export function paletteById(id: string): ArtistPalette {
  return ARTIST_PALETTES.find((p) => p.id === id) ?? ARTIST_PALETTES[1];
}
