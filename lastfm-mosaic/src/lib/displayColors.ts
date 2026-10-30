import { tuneColor, type Tune } from "./color";
import { gradientPalette, type ActiveGradient } from "./colorPresets";
import { guardLightness, orientStops, type CardLook } from "./theme";

/**
 * The count gradient as the mosaic draws it: the tuned stops oriented for the card inside (reversed
 * on a light inside, so low counts stay close to the background and high counts far from it), and
 * the zero color derived from the inside.
 */
export function displayGradient(tunedStops: readonly string[], look: CardLook): ActiveGradient {
  return { stops: orientStops(tunedStops, look.tone), zero: look.zero };
}

interface PaletteInput {
  /** The tuned base colors of the chosen palette (for "Match gradient": sampled from the un-oriented gradient). */
  colors: readonly string[];
  /** The chosen palette is "Match gradient" (follows the gradient). */
  matchGradient: boolean;
  /** The tuned, un-oriented gradient stops, and the palette's own tune (for re-sampling). */
  tunedStops: readonly string[];
  tune: Tune;
  look: CardLook;
}

/**
 * The artist palette as the mosaic uses it: "Match gradient" is re-sampled from the oriented
 * gradient on a light inside; then every color gets the contrast guard against the inside.
 */
export function displayPalette({
  colors,
  matchGradient,
  tunedStops,
  tune,
  look,
}: PaletteInput): string[] {
  const base =
    matchGradient && look.tone === "light"
      ? gradientPalette(orientStops(tunedStops, look.tone)).map((c) => tuneColor(c, tune))
      : colors;
  return base.map((c) => guardLightness(c, look.insideL));
}
