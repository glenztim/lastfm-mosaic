import type { PageBackgroundSettings } from "@/hooks/usePageBackground";
import type { ColorSettings } from "@/hooks/useColorSettings";
import { gradientSamples } from "@/lib/color";
import {
  ARTIST_PALETTES,
  GRADIENT_PRESETS,
  gradientPalette,
  gradientPresetById,
  paletteById,
} from "@/lib/colorPresets";
import { PAGE_BACKGROUNDS, type PageBackground } from "@/lib/settings";

/** Colors in a palette's mini strip. */
const STRIP_COLORS = 6;
/** Zero-color block at the start of a gradient swatch, in %. */
const ZERO_SHARE = 12;

export const PAGE_BACKGROUND_LABELS: Record<PageBackground, string> = {
  black: "Black",
  paper: "Paper",
  "scheme-dark": "Scheme dark",
  "scheme-light": "Scheme light",
  custom: "Custom",
};

/** Squares with 2px borders; the selected one gets a thicker outline. */
const swatchClass = (active: boolean) =>
  `rule-thin h-5 shrink-0 outline-offset-2 ${
    active
      ? "outline-(length:--rule-thick) outline-ink"
      : "hover:outline-(length:--rule-thin) hover:outline-ink-dim"
  }`;

/** Name of the selected gradient preset, for the label next to the picker. */
export const selectedGradientName = (s: ColorSettings) => gradientPresetById(s.gradientId).name;
export const selectedPaletteName = (s: ColorSettings) => paletteById(s.paletteId).name;

/** Gradient presets as 56x20 gradient swatches. The name is the tooltip. */
export function GradientPicker({ settings: s }: { settings: ColorSettings }) {
  return (
    <div role="radiogroup" aria-label="Volume gradient" className="flex flex-wrap gap-2.5">
      {GRADIENT_PRESETS.map((g) => {
        const [first, ...rest] = gradientSamples(g.stops);
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
              background: `linear-gradient(to right, ${g.zero} 0 ${ZERO_SHARE}%, ${first} ${ZERO_SHARE}%, ${rest.join(", ")})`,
            }}
          />
        );
      })}
    </div>
  );
}

/** Artist palettes as 56x20 strips of their first 6 colors. The name is the tooltip. */
export function PalettePicker({ settings: s }: { settings: ColorSettings }) {
  return (
    <div role="radiogroup" aria-label="Artist colors" className="flex flex-wrap gap-2.5">
      {ARTIST_PALETTES.map((p) => {
        const strip = p.fromGradient
          ? gradientPalette(s.gradient.stops, STRIP_COLORS)
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

/** Page background choices as swatches in their actual colors (scheme ones follow the tuning). */
export function PageBackgroundPicker({ page }: { page: PageBackgroundSettings }) {
  return (
    <div role="radiogroup" aria-label="Page background" className="flex flex-wrap gap-2.5">
      {PAGE_BACKGROUNDS.map((id) => {
        const active = id === page.choice;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={PAGE_BACKGROUND_LABELS[id]}
            title={PAGE_BACKGROUND_LABELS[id]}
            onClick={() => page.onChoice(id)}
            className={`${swatchClass(active)} w-9`}
            style={{ background: page.backgrounds[id] }}
          />
        );
      })}
    </div>
  );
}
