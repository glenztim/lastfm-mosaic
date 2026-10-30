import type { Nesting, View } from "./settings";
import { ARTIST_LAYER_SCALES, type ZoomLevel } from "./zoom";

/**
 * Which colors can be seen in the current display, and so which color controls apply. Hidden
 * controls are not rendered (never disabled).
 */
export interface DisplayState {
  view: View;
  nesting: Nesting;
  zoom: ZoomLevel;
}

/** The count gradient colors the squares: Timeline with the volume square. */
export const volumeVisible = ({ view, nesting }: DisplayState) =>
  view === "timeline" && nesting === "volume";

/** Artist colors are visible: Top artists view, Artists only nesting, or artist layers (zoom L and up). */
export const artistColorsVisible = ({ view, nesting, zoom }: DisplayState) =>
  view === "artists" || nesting === "artists" || ARTIST_LAYER_SCALES[zoom].length > 0;

/** `matchGradient`: the active artist palette is "Match gradient", which follows the gradient. */
export const gradientSectionVisible = (state: DisplayState, matchGradient: boolean) =>
  volumeVisible(state) || (artistColorsVisible(state) && matchGradient);

export const artistSectionVisible = artistColorsVisible;
