import type { ReactNode } from "react";
import { selectedGradientName, selectedPaletteName, swatchClass } from "@/components/Pickers";
import { SegmentedControl } from "@/components/SegmentedControl";
import { TuneSliders } from "@/components/TuneSliders";
import type { ColorSettings } from "@/hooks/useColorSettings";
import type { ThemeSettings } from "@/hooks/useTheme";
import {
  OUTSIDE_POOL_OPTIONS,
  POOL_OPTIONS,
  SIZE_VARIATION,
  type Nesting,
  type OutsidePool,
  type PoolSize,
  type View,
} from "@/lib/settings";
import { insideQuickColors, outsideQuickColors, type QuickColor } from "@/lib/theme";
import {
  artistColorsVisible,
  artistSectionVisible,
  gradientSectionVisible,
} from "@/lib/visibility";
import type { ZoomLevel } from "@/lib/zoom";

const POOL_CHOICES = POOL_OPTIONS.map((p) => ({ value: p, label: p === "all" ? "All" : String(p) }));
const OUTSIDE_LABELS: Record<OutsidePool, string> = { skip: "Skip", grey: "Grey" };
const OUTSIDE_CHOICES = OUTSIDE_POOL_OPTIONS.map((o) => ({ value: o, label: OUTSIDE_LABELS[o] }));

interface Props {
  view: View;
  nesting: Nesting;
  zoom: ZoomLevel;
  pool: PoolSize;
  onPool: (pool: PoolSize) => void;
  outside: OutsidePool;
  onOutside: (outside: OutsidePool) => void;
  /** Ring size variation in % (Timeline, Artists only nesting). */
  variation: number;
  onVariation: (variation: number) => void;
  colors: ColorSettings;
  theme: ThemeSettings;
}

function Section({
  title,
  selected,
  children,
}: {
  title: string;
  selected?: string;
  children: ReactNode;
}) {
  return (
    <section className="rule-b flex flex-col gap-2.5 p-3 last:border-b-0">
      <h3 className="ui-label-sm text-ink-dim">
        {title}
        {selected && (
          <>
            {" · "}
            <span className="text-ink">{selected}</span>
          </>
        )}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs">{label}</span>
      {children}
    </div>
  );
}

/**
 * One color of the Custom theme: quick swatches plus an "Other" swatch that wraps a native color
 * input. The selected swatch has the thick outline; if the current color is not a quick swatch,
 * "Other" shows it as selected. Colors are plain hex, so scheme tints don't change afterwards.
 */
function ColorRow({
  label,
  quick,
  value,
  onChange,
}: {
  label: string;
  quick: QuickColor[];
  value: string;
  onChange: (hex: string) => void;
}) {
  const isQuick = quick.some((q) => q.hex === value);
  return (
    <Field label={label}>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2.5">
        {quick.map((q) => (
          <button
            key={q.name}
            type="button"
            role="radio"
            aria-checked={q.hex === value}
            aria-label={q.name}
            title={q.name}
            onClick={() => onChange(q.hex)}
            className={`${swatchClass(q.hex === value)} w-7`}
            style={{ background: q.hex }}
          />
        ))}
        <label
          title="Other"
          className={`${swatchClass(!isQuick)} relative w-7 cursor-pointer has-focus-visible:outline-(length:--rule-thin) has-focus-visible:outline-ink`}
          style={{ background: isQuick ? "transparent" : value }}
        >
          {isQuick && (
            <span
              className="absolute inset-0 flex items-center justify-center text-xs leading-none"
              aria-hidden
            >
              +
            </span>
          )}
          <input
            type="color"
            aria-label={`${label}: other color`}
            value={value}
            onChange={(e) => onChange(e.target.value.toLowerCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </div>
    </Field>
  );
}

/**
 * Settings that are not needed all the time: the artist pool, ring size variation, the color
 * tuning sliders (per preset) and, for the Custom theme, its two colors. Each part is shown only
 * when it applies (`src/lib/visibility.ts`). The page docks it beside the mosaic; this is its content.
 *
 * Framed like the other cards (page ink); the inside is `.card-scope`.
 */
export function AdvancedPanel(p: Props) {
  const timeline = p.view === "timeline";
  const state = { view: p.view, nesting: p.nesting, zoom: p.zoom };
  const showPool = timeline && artistColorsVisible(state);
  const showVariation = timeline && p.nesting === "artists";
  const showGradient = gradientSectionVisible(state, p.colors.matchGradient);
  const showArtists = artistSectionVisible(state);

  return (
    <aside id="advanced-panel" aria-label="Advanced" className="rule-thick shadow-hard">
      <div className="card-scope min-[1100px]:max-h-[calc(100vh-2rem)] min-[1100px]:overflow-y-auto">
        <h2 className="ui-label rule-b px-3 py-2 font-bold">Advanced</h2>

        {p.theme.id === "custom" && (
          <Section title="Custom theme">
            <ColorRow
              label="Outside"
              quick={outsideQuickColors(p.theme.accent)}
              value={p.theme.customOutside}
              onChange={p.theme.onCustomOutside}
            />
            <ColorRow
              label="Inside"
              quick={insideQuickColors(p.theme.accent)}
              value={p.theme.customInside}
              onChange={p.theme.onCustomInside}
            />
          </Section>
        )}

        {showPool && (
          <Section title="Artists">
            <Field label="Pool">
              <SegmentedControl label="Pool" options={POOL_CHOICES} value={p.pool} onChange={p.onPool} />
            </Field>
            <Field label="Outside the pool">
              <SegmentedControl
                label="Outside the pool"
                options={OUTSIDE_CHOICES}
                value={p.outside}
                onChange={p.onOutside}
              />
            </Field>
          </Section>
        )}

        {showVariation && (
          <Section title="Size variation">
            <label className="flex items-center gap-3">
              <input
                type="range"
                aria-label="Size variation"
                min={SIZE_VARIATION.min}
                max={SIZE_VARIATION.max}
                step={SIZE_VARIATION.step}
                value={p.variation}
                onChange={(e) => p.onVariation(Number(e.target.value))}
                className="min-w-0 flex-1"
              />
              <span className="w-10 text-right text-xs tabular-nums">{p.variation} %</span>
            </label>
          </Section>
        )}

        {showGradient && (
          <Section title="Volume gradient tuning" selected={selectedGradientName(p.colors)}>
            <TuneSliders
              tune={p.colors.gradientTune}
              onChange={p.colors.onGradientTune}
              onReset={p.colors.onGradientReset}
            />
          </Section>
        )}

        {showArtists && (
          <Section title="Artist colors tuning" selected={selectedPaletteName(p.colors)}>
            <TuneSliders
              tune={p.colors.paletteTune}
              onChange={p.colors.onPaletteTune}
              onReset={p.colors.onPaletteReset}
            />
          </Section>
        )}
      </div>
    </aside>
  );
}
