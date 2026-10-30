import type { ReactNode } from "react";
import {
  GradientPicker,
  PageBackgroundPicker,
  PAGE_BACKGROUND_LABELS,
  PalettePicker,
  selectedGradientName,
  selectedPaletteName,
} from "@/components/Pickers";
import { SegmentedControl } from "@/components/SegmentedControl";
import type { ColorSettings } from "@/hooks/useColorSettings";
import type { PageBackgroundSettings } from "@/hooks/usePageBackground";
import {
  GRANULARITIES,
  NESTINGS,
  TOP_N_OPTIONS,
  VIEWS,
  type Nesting,
  type View,
} from "@/lib/settings";
import type { Granularity } from "@/lib/types";
import { artistSectionVisible, gradientSectionVisible } from "@/lib/visibility";
import { ZOOM_ORDER, type ZoomLevel } from "@/lib/zoom";

const VIEW_LABELS: Record<View, string> = { timeline: "Timeline", artists: "Top artists" };
const GRANULARITY_LABELS: Record<Granularity, string> = {
  days: "Days",
  weeks: "Weeks",
  months: "Months",
};
const NESTING_LABELS: Record<Nesting, string> = {
  volume: "Volume + artists",
  artists: "Artists only",
};

const VIEW_OPTIONS = VIEWS.map((v) => ({ value: v, label: VIEW_LABELS[v] }));
const GRANULARITY_OPTIONS = GRANULARITIES.map((g) => ({ value: g, label: GRANULARITY_LABELS[g] }));
const NESTING_OPTIONS = NESTINGS.map((n) => ({ value: n, label: NESTING_LABELS[n] }));
const ZOOM_OPTIONS = ZOOM_ORDER.map((z) => ({ value: z, label: z }));
const TOP_N_CHOICES = TOP_N_OPTIONS.map((n) => ({ value: n, label: String(n) }));

interface Props {
  view: View;
  onView: (view: View) => void;
  granularity: Granularity;
  onGranularity: (granularity: Granularity) => void;
  zoom: ZoomLevel;
  onZoom: (zoom: ZoomLevel) => void;
  nesting: Nesting;
  onNesting: (nesting: Nesting) => void;
  topN: number;
  onTopN: (topN: number) => void;
  colors: ColorSettings;
  page: PageBackgroundSettings;
  advancedOpen: boolean;
  onAdvanced: () => void;
}

/** A cell: tiny uppercase label (plus the selected preset's name) above its control. */
function Cell({
  label,
  selected,
  children,
}: {
  label: string;
  selected?: string;
  children: ReactNode;
}) {
  return (
    <div className="rule-r rule-b flex min-w-0 flex-col gap-1 px-2.5 py-2">
      <span className="ui-label-sm whitespace-nowrap text-ink-dim">
        {label}
        {selected && (
          <>
            {" · "}
            <span className="text-ink">{selected}</span>
          </>
        )}
      </span>
      {children}
    </div>
  );
}

/** Fills the rest of a row, so every row's bottom rule runs to the card's edge. */
const Filler = () => <div className="rule-b min-w-0 grow" aria-hidden />;

/**
 * The compact controls card: two rows of cells with tiny labels. Row 1 is the display settings,
 * row 2 the pickers (artist colors, volume gradient, page background) and the Advanced toggle.
 * Only what applies to the current display is rendered (see `src/lib/visibility.ts`). Nothing
 * here fetches or reads the cache: it all works on loaded data.
 */
export function ControlsCard(p: Props) {
  const timeline = p.view === "timeline";
  const state = { view: p.view, nesting: p.nesting, zoom: p.zoom };
  const showGradient = gradientSectionVisible(state, p.colors.matchGradient);
  const showArtists = artistSectionVisible(state);

  return (
    <section aria-label="Controls" className="rule-thick shadow-hard overflow-hidden bg-paper">
      {/* The cells' right and bottom rules run under the card's own border. */}
      <div className="bleed-rb">
        <div className="flex flex-wrap">
          <Cell label="View">
            <SegmentedControl label="View" options={VIEW_OPTIONS} value={p.view} onChange={p.onView} />
          </Cell>
          {timeline && (
            <>
              <Cell label="Granularity">
                <SegmentedControl
                  label="Granularity"
                  options={GRANULARITY_OPTIONS}
                  value={p.granularity}
                  onChange={p.onGranularity}
                />
              </Cell>
              <Cell label="Zoom">
                <SegmentedControl
                  label="Zoom"
                  options={ZOOM_OPTIONS}
                  value={p.zoom}
                  onChange={p.onZoom}
                />
              </Cell>
              <Cell label="Nesting">
                <SegmentedControl
                  label="Nesting"
                  options={NESTING_OPTIONS}
                  value={p.nesting}
                  onChange={p.onNesting}
                />
              </Cell>
            </>
          )}
          {!timeline && (
            <Cell label="Top artists">
              <SegmentedControl
                label="Number of artists"
                options={TOP_N_CHOICES}
                value={p.topN}
                onChange={p.onTopN}
              />
            </Cell>
          )}
          <Filler />
        </div>

        <div className="flex flex-wrap">
          {showArtists && (
            <Cell label="Artist colors" selected={selectedPaletteName(p.colors)}>
              <PalettePicker settings={p.colors} />
            </Cell>
          )}
          {showGradient && (
            <Cell label="Volume gradient" selected={selectedGradientName(p.colors)}>
              <GradientPicker settings={p.colors} />
            </Cell>
          )}
          <Cell label="Page background" selected={PAGE_BACKGROUND_LABELS[p.page.choice]}>
            <PageBackgroundPicker page={p.page} />
          </Cell>
          <Filler />
          <div className="rule-l rule-b flex items-center px-2.5 py-2">
            <button
              type="button"
              aria-expanded={p.advancedOpen}
              aria-controls="advanced-panel"
              onClick={p.onAdvanced}
              className={`rule-thin h-7 px-3 text-[13px] font-medium ${
                p.advancedOpen ? "bg-ink text-paper" : "hover:bg-ink hover:text-paper"
              }`}
            >
              Advanced
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
