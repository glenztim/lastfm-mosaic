import { useCallback, useState } from "react";

const PREFIX = "lastfm-mosaic:";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * A number remembered in localStorage. Stored values outside [min, max] (or not numbers) fall
 * back to `fallback`. All storage access is best-effort.
 */
export function usePersistedNumber(key: string, min: number, max: number, fallback: number) {
  const [value, setValue] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw !== null && raw.trim() !== "") {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= min && n <= max) return n;
      }
    } catch {
      // No localStorage (server render, private mode): use the default.
    }
    return fallback;
  });

  const update = useCallback(
    (next: number) => {
      const n = clamp(next, min, max);
      setValue(n);
      try {
        localStorage.setItem(PREFIX + key, String(n));
      } catch {
        // Remembering the choice is best-effort.
      }
    },
    [key, min, max],
  );

  return [value, update] as const;
}
