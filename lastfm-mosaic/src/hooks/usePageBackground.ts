import { useEffect, useMemo } from "react";
import { usePersistedColor } from "@/hooks/usePersistedColor";
import { usePersistedState } from "@/hooks/usePersistedState";
import { pageBackgrounds, pageTheme, type PageTheme } from "@/lib/pageTheme";
import {
  DEFAULT_CUSTOM_BACKGROUND,
  DEFAULT_PAGE_BACKGROUND,
  PAGE_BACKGROUNDS,
  type PageBackground,
} from "@/lib/settings";

export interface PageBackgroundSettings {
  choice: PageBackground;
  onChoice: (choice: PageBackground) => void;
  custom: string;
  onCustom: (color: string) => void;
  /** Background color of every choice (the scheme ones follow `accent`). */
  backgrounds: Record<PageBackground, string>;
  theme: PageTheme;
}

/**
 * The page background choice and its custom color (both persisted). The resulting theme (page
 * background, ink, tone) is written to the document root as CSS variables and `data-tone`, so the
 * page scope of `globals.css` follows it; html and body use it too, so overscroll shows no other
 * color. `accent` drives the two scheme backgrounds and updates live.
 */
export function usePageBackground(accent: string): PageBackgroundSettings {
  const [choice, onChoice] = usePersistedState(
    "pageBackground",
    PAGE_BACKGROUNDS,
    DEFAULT_PAGE_BACKGROUND,
  );
  const [custom, onCustom] = usePersistedColor("pageCustom", DEFAULT_CUSTOM_BACKGROUND);

  const backgrounds = useMemo(() => pageBackgrounds(accent, custom), [accent, custom]);
  const bg = backgrounds[choice];
  const theme = useMemo(() => pageTheme(bg), [bg]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--page-bg", theme.bg);
    root.style.setProperty("--page-ink", theme.ink);
    root.style.setProperty("--page-ink-dim", theme.inkDim);
    root.dataset.tone = theme.tone;
  }, [theme]);

  return { choice, onChoice, custom, onCustom, backgrounds, theme };
}
