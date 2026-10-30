import { useCallback, useMemo } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { usePersistedTunes } from "@/hooks/usePersistedTunes";
import { NO_TUNE, tuneColor, tuneGradient, type Tune } from "@/lib/color";
import {
  ARTIST_PALETTES,
  DEFAULT_GRADIENT_ID,
  DEFAULT_PALETTE_ID,
  GRADIENT_PRESETS,
  gradientPalette,
  gradientPresetById,
  paletteById,
  type TunedGradient,
} from "@/lib/colorPresets";

const GRADIENT_IDS = GRADIENT_PRESETS.map((g) => g.id);
const PALETTE_IDS = ARTIST_PALETTES.map((p) => p.id);

/**
 * The two independent color choices and their tune sliders. Slider values are stored per preset
 * (each preset starts neutral), all persisted. The results are tuned but not yet adapted to the
 * theme (no gradient reversal, no contrast guard: see `src/lib/displayColors.ts`).
 */
export interface ColorSettings {
  gradientId: string;
  onGradient: (id: string) => void;
  /** Tune of the CURRENT gradient preset. */
  gradientTune: Tune;
  onGradientTune: (change: Partial<Tune>) => void;
  onGradientReset: () => void;

  paletteId: string;
  onPalette: (id: string) => void;
  /** Tune of the CURRENT artist palette. */
  paletteTune: Tune;
  onPaletteTune: (change: Partial<Tune>) => void;
  onPaletteReset: () => void;

  /** The chosen gradient preset after tuning (dark to bright). */
  gradient: TunedGradient;
  /** The chosen palette's base colors after tuning (before rank extension). */
  paletteColors: readonly string[];
  /** The active palette is "Match gradient" (follows the tuned gradient). */
  matchGradient: boolean;
}

export function useColorSettings(): ColorSettings {
  const [gradientId, onGradient] = usePersistedState("gradient", GRADIENT_IDS, DEFAULT_GRADIENT_ID);
  const [paletteId, onPalette] = usePersistedState("palette", PALETTE_IDS, DEFAULT_PALETTE_ID);
  // Old shared `gradientTune.*` / `paletteTune.*` keys are simply ignored.
  const gradientTunes = usePersistedTunes("gradientTunes", GRADIENT_IDS);
  const paletteTunes = usePersistedTunes("paletteTunes", PALETTE_IDS);

  const gradientTune = gradientTunes.tuneOf(gradientId);
  const paletteTune = paletteTunes.tuneOf(paletteId);
  const { setTune: setGradientTune } = gradientTunes;
  const { setTune: setPaletteTune } = paletteTunes;

  const onGradientTune = useCallback(
    (change: Partial<Tune>) => setGradientTune(gradientId, change),
    [setGradientTune, gradientId],
  );
  const onGradientReset = useCallback(() => onGradientTune(NO_TUNE), [onGradientTune]);
  const onPaletteTune = useCallback(
    (change: Partial<Tune>) => setPaletteTune(paletteId, change),
    [setPaletteTune, paletteId],
  );
  const onPaletteReset = useCallback(() => onPaletteTune(NO_TUNE), [onPaletteTune]);

  const gradient = useMemo<TunedGradient>(() => {
    const preset = gradientPresetById(gradientId);
    return { stops: tuneGradient(preset.stops, gradientTune) };
  }, [gradientId, gradientTune]);

  // "Match gradient" follows the tuned gradient; other palettes ignore gradient changes entirely.
  const palette = paletteById(paletteId);
  const followedStops = palette.fromGradient ? gradient.stops : null;
  const paletteColors = useMemo(() => {
    const base = followedStops ? gradientPalette(followedStops) : palette.colors;
    return base.map((c) => tuneColor(c, paletteTune));
  }, [palette, followedStops, paletteTune]);

  return {
    gradientId,
    onGradient,
    gradientTune,
    onGradientTune,
    onGradientReset,
    paletteId,
    onPalette,
    paletteTune,
    onPaletteTune,
    onPaletteReset,
    gradient,
    paletteColors,
    matchGradient: !!palette.fromGradient,
  };
}
