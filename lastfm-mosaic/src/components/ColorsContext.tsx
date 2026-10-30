"use client";

import { createContext, useContext } from "react";
import { makeColoring, makeRanking, type ArtistColoring } from "@/lib/artistColors";
import type { ActiveGradient } from "@/lib/colorPresets";
import { BLACK, cardLook, type CardLook } from "@/lib/theme";

/**
 * The colors in use. `gradient` and `coloring` feed the mosaic and may lag a tick behind the
 * sliders (the page defers them); `legend` holds the same choices without lag, for the legends.
 * `look` is what the card inside implies (zero color, greys, ...); everything is already adapted
 * to it: the gradient is oriented, the artist colors are contrast-guarded.
 */
export interface ColorsValue {
  gradient: ActiveGradient;
  coloring: ArtistColoring;
  legend: {
    gradient: ActiveGradient;
    /** Colors of the top ranks (palette order), for the artist legend chips. */
    artistColors: readonly string[];
  };
  look: CardLook;
}

const LOOK = cardLook(BLACK);
const GRADIENT: ActiveGradient = { stops: ["#3a1c71", "#f4d6a0"], zero: LOOK.zero };

const ColorsContext = createContext<ColorsValue>({
  gradient: GRADIENT,
  coloring: makeColoring(makeRanking([]), [], 0, "skip", LOOK),
  legend: { gradient: GRADIENT, artistColors: [] },
  look: LOOK,
});

export const ColorsProvider = ColorsContext.Provider;
export const useColors = () => useContext(ColorsContext);
