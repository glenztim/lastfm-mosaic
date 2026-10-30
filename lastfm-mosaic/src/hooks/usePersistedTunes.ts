import { useCallback, useState } from "react";
import { NO_TUNE, TUNE_RANGES, isNoTune, type Tune } from "@/lib/color";

const PREFIX = "lastfm-mosaic:";

const inRange = (v: unknown, { min, max }: { min: number; max: number }): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

/** Tunes stored under `key`: only known preset ids with valid, non-neutral values are kept. */
function readTunes(key: string, ids: readonly string[]): Record<string, Tune> {
  const tunes: Record<string, Tune> = {};
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PREFIX + key) ?? "null");
    if (parsed && typeof parsed === "object") {
      for (const id of ids) {
        const t = (parsed as Record<string, Partial<Tune> | null>)[id];
        if (
          t &&
          inRange(t.hue, TUNE_RANGES.hue) &&
          inRange(t.sat, TUNE_RANGES.sat) &&
          inRange(t.bright, TUNE_RANGES.bright)
        ) {
          const tune = { hue: t.hue, sat: t.sat, bright: t.bright };
          if (!isNoTune(tune)) tunes[id] = tune;
        }
      }
    }
  } catch {
    // No localStorage or unreadable JSON: every preset starts neutral.
  }
  return tunes;
}

/**
 * Tune slider values (hue / saturation / brightness) stored PER PRESET: one record keyed by preset
 * id, persisted as JSON under `key`. A preset the user never tuned is neutral, and switching
 * presets never carries values over. Neutral entries are not stored. The identity of `tuneOf(id)`
 * only changes when that preset's values change, so it is safe as a memo dependency.
 */
export function usePersistedTunes(key: string, ids: readonly string[]) {
  const [tunes, setTunes] = useState<Record<string, Tune>>(() => readTunes(key, ids));

  const tuneOf = useCallback((id: string): Tune => tunes[id] ?? NO_TUNE, [tunes]);

  const setTune = useCallback(
    (id: string, change: Partial<Tune>) => {
      const merged = { ...(tunes[id] ?? NO_TUNE), ...change };
      const next = { ...tunes };
      if (isNoTune(merged)) delete next[id];
      else next[id] = merged;
      setTunes(next);
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(next));
      } catch {
        // Remembering the choice is best-effort.
      }
    },
    [key, tunes],
  );

  return { tuneOf, setTune };
}
