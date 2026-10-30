import { useCallback, useState } from "react";

const PREFIX = "lastfm-mosaic:";
const HEX = /^#[0-9a-f]{6}$/;

/** A `#rrggbb` color remembered in localStorage; anything else stored falls back to `fallback`. */
export function usePersistedColor(key: string, fallback: string) {
  const [value, setValue] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key)?.toLowerCase() ?? "";
      if (HEX.test(raw)) return raw;
    } catch {
      // No localStorage (server render, private mode): use the default.
    }
    return fallback;
  });

  const update = useCallback(
    (next: string) => {
      const color = next.toLowerCase();
      if (!HEX.test(color)) return;
      setValue(color);
      try {
        localStorage.setItem(PREFIX + key, color);
      } catch {
        // Remembering the choice is best-effort.
      }
    },
    [key],
  );

  return [value, update] as const;
}
