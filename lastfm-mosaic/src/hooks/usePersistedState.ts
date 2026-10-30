import { useCallback, useState } from "react";

const PREFIX = "lastfm-mosaic:";

/**
 * State remembered in localStorage. Only values in `options` are accepted from storage, so stale
 * or tampered entries fall back to `fallback`. All storage access is best-effort.
 */
export function usePersistedState<T extends string | number>(
  key: string,
  options: readonly T[],
  fallback: T,
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      const match = options.find((o) => String(o) === raw);
      if (match !== undefined) return match;
    } catch {
      // No localStorage (server render, private mode): use the default.
    }
    return fallback;
  });

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(PREFIX + key, String(next));
      } catch {
        // Remembering the choice is best-effort.
      }
    },
    [key],
  );

  return [value, update] as const;
}
