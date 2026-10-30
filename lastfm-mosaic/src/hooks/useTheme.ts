import { useEffect, useMemo, useState } from "react";
import { usePersistedColor } from "@/hooks/usePersistedColor";
import { usePersistedState } from "@/hooks/usePersistedState";
import {
  DEFAULT_CUSTOM_INSIDE,
  DEFAULT_CUSTOM_OUTSIDE,
  DEFAULT_THEME,
  THEME_IDS,
  type ThemeId,
} from "@/lib/settings";
import { presetThemes, scopeColors, type ScopeColors, type Theme } from "@/lib/theme";

const PREFIX = "lastfm-mosaic:";
const LEGACY_KEYS = ["pageBackground", "pageCustom"];

/** The old page-background setting: black -> Black, paper -> White, anything else -> the default. */
function legacyThemeId(): ThemeId {
  try {
    const old = localStorage.getItem(PREFIX + "pageBackground");
    if (old === "black") return "black";
    if (old === "paper") return "white";
  } catch {
    // No localStorage (server render, private mode).
  }
  return DEFAULT_THEME;
}

export interface ThemeSettings {
  /** The accent the scheme themes and the Custom quick swatches are tinted with. */
  accent: string;
  id: ThemeId;
  onId: (id: ThemeId) => void;
  customOutside: string;
  onCustomOutside: (color: string) => void;
  customInside: string;
  onCustomInside: (color: string) => void;
  /** All themes in picker order (the scheme ones follow the accent). */
  themes: Theme[];
  /** The chosen theme. */
  theme: Theme;
  /** The page scope (outside) and the card scope (inside). */
  page: ScopeColors;
  card: ScopeColors;
}

/**
 * The theme: its id and the two custom colors are persisted (an old page-background setting is
 * migrated once and removed). The chosen theme's scopes are written to the document root as CSS
 * variables and tone attributes, so the page scope and the card scope of `globals.css` follow it;
 * html and body use the outside color too, so overscroll never flashes another color.
 * `accent` drives the two scheme themes and the scheme tints of Custom's quick swatches.
 */
export function useTheme(accent: string): ThemeSettings {
  const [fallback] = useState(legacyThemeId);
  const [id, onId] = usePersistedState("theme", THEME_IDS, fallback);
  const [customOutside, onCustomOutside] = usePersistedColor("themeOutside", DEFAULT_CUSTOM_OUTSIDE);
  const [customInside, onCustomInside] = usePersistedColor("themeInside", DEFAULT_CUSTOM_INSIDE);

  // Persist the migrated choice, then forget the old setting.
  useEffect(() => {
    try {
      if (localStorage.getItem(PREFIX + "theme") === null) localStorage.setItem(PREFIX + "theme", id);
      for (const key of LEGACY_KEYS) localStorage.removeItem(PREFIX + key);
    } catch {
      // Best-effort.
    }
  }, [id]);

  const themes = useMemo(
    () => presetThemes(accent, { outside: customOutside, inside: customInside }),
    [accent, customOutside, customInside],
  );
  const theme = themes.find((t) => t.id === id) ?? themes[0];
  const page = useMemo(() => scopeColors(theme.outside), [theme.outside]);
  const card = useMemo(() => scopeColors(theme.inside), [theme.inside]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--page-bg", page.bg);
    root.style.setProperty("--page-ink", page.ink);
    root.style.setProperty("--page-muted", page.muted);
    root.style.setProperty("--card-bg", card.bg);
    root.style.setProperty("--card-ink", card.ink);
    root.style.setProperty("--card-muted", card.muted);
    root.dataset.pageTone = page.tone;
    root.dataset.cardTone = card.tone;
  }, [page, card]);

  return {
    accent,
    id,
    onId,
    customOutside,
    onCustomOutside,
    customInside,
    onCustomInside,
    themes,
    theme,
    page,
    card,
  };
}
