"use client";

import { createContext, useContext } from "react";
import { makeColoring, makeRanking, type ArtistColoring } from "@/lib/artistColors";
import { GRADIENT_PRESETS, type ActiveGradient } from "@/lib/colorPresets";

/**
 * The colors in use. `gradient` and `coloring` feed the mosaic and may lag a tick behind the
 * sliders (the page defers them); `legend` holds the same choices without lag, for the legends.
 */
export interface ColorsValue {
  gradient: ActiveGradient;
  coloring: ArtistColoring;
  legend: {
    gradient: ActiveGradient;
    /** Colors of the top ranks (palette order), for the artist legend chips. */
    artistColors: readonly string[];
  };
}

const DEFAULT_GRADIENT: ActiveGradient = {
  stops: GRADIENT_PRESETS[0].stops,
  zero: GRADIENT_PRESETS[0].zero,
};

const ColorsContext = createContext<ColorsValue>({
  gradient: DEFAULT_GRADIENT,
  coloring: makeColoring(makeRanking([]), [], 0, "skip"),
  legend: { gradient: DEFAULT_GRADIENT, artistColors: [] },
});

export const ColorsProvider = ColorsContext.Provider;
export const useColors = () => useContext(ColorsContext);
