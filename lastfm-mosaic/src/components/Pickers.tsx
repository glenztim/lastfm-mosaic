import { useColors } from "@/components/ColorsContext";
import type { ColorSettings } from "@/hooks/useColorSettings";
import type { ThemeSettings } from "@/hooks/useTheme";
import { gradientSamples } from "@/lib/color";
import {
  ARTIST_PALETTES,
  GRADIENT_PRESETS,
  gradientPalette,
  gradientPresetById,
  paletteById,
} from "@/lib/colorPresets";
import { inkFor, orientStops } from "@/lib/theme";

/** Colors in a palette's mini strip. */
const STRIP_COLORS = 6;
/** Zero-color block at the start of a gradient swatch, in %. */
const ZERO_SHARE = 12;

/** Squares with 2px borders; the selected one gets a thicker outline. */
export const swatchClass = (active: boolean) =>
  `rule-thin h-5 shrink-0 outline-offset-2 ${
    active
      ? "outline-(length:--rule-thick) outline-ink"
      : "hover:outline-(length:--rule-thin) hover:outline-ink-dim"
  }`;

/** Name of the selected preset, for the label next to the picker. */
export const selectedGradientName = (s: ColorSettings) => gradientPresetById(s.gradientId).name;
export const selectedPaletteName = (s: ColorSettings) => paletteById(s.paletteId).name;

/**
 * Gradient presets as 56x20 gradient swatches, oriented like the mosaic's gradient (reversed on a
 * light inside) with the derived zero color in front. The name is the tooltip.
 */
export function GradientPicker({ settings: s }: { settings: ColorSettings }) {
  const { look } = useColors();
  return (
    <div role="radiogroup" aria-label="Volume gradient" className="flex flex-wrap gap-2.5">
      {GRADIENT_PRESETS.map((g) => {
        const [first, ...rest] = gradientSamples(orientStops(g.stops, look.tone));
        const active = g.id === s.gradientId;
        return (
          <button
            key={g.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={g.name}
            title={g.name}
            onClick={() => s.onGradient(g.id)}
            className={`${swatchClass(active)} w-14`}
            style={{
              background: `linear-gradient(to right, ${look.zero} 0 ${ZERO_SHARE}%, ${first} ${ZERO_SHARE}%, ${rest.join(", ")})`,
            }}
          />
        );
      })}
    </div>
  );
}

/** Artist palettes as 56x20 strips of their first 6 colors. The name is the tooltip. */
export function PalettePicker({ settings: s }: { settings: ColorSettings }) {
  const { look } = useColors();
  return (
    <div role="radiogroup" aria-label="Artist colors" className="flex flex-wrap gap-2.5">
      {ARTIST_PALETTES.map((p) => {
        const strip = p.fromGradient
          ? gradientPalette(orientStops(s.gradient.stops, look.tone), STRIP_COLORS)
          : p.colors.slice(0, STRIP_COLORS);
        const active = p.id === s.paletteId;
        const title = p.note ? `${p.name} (${p.note})` : p.name;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={title}
            title={title}
            onClick={() => s.onPalette(p.id)}
            className={`${swatchClass(active)} flex w-14`}
          >
            {strip.map((c, i) => (
              <span key={i} className="h-full flex-1" style={{ background: c }} />
            ))}
          </button>
        );
      })}
    </div>
  );
}

/**
 * One swatch per theme, a miniature of the layout: the outside color as the swatch background and
 * a centered inner square (55 % of the height) in the inside color, framed in the ink of the
 * outside. The scheme themes follow the accent live; Custom shows the current custom colors.
 */
export function ThemePicker({ theme }: { theme: ThemeSettings }) {
  return (
    <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-2.5">
      {theme.themes.map((t) => {
        const active = t.id === theme.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t.name}
            title={t.name}
            onClick={() => theme.onId(t.id)}
            className={`${swatchClass(active)} relative h-6! w-9`}
            style={{ background: t.outside }}
          >
            <span
              className="absolute left-1/2 top-1/2 aspect-square h-[55%] -translate-x-1/2 -translate-y-1/2"
              style={{ background: t.inside, border: `2px solid ${inkFor(t.outside)}` }}
            />
          </button>
        );
      })}
    </div>
  );
}
