"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { AdvancedPanel } from "@/components/AdvancedPanel";
import { ColorsProvider } from "@/components/ColorsContext";
import { ControlsCard } from "@/components/ControlsCard";
import { ProgressBar } from "@/components/ProgressBar";
import { Timeline } from "@/components/Timeline";
import { TopArtists } from "@/components/TopArtists";
import { UsernameForm, type FormValues } from "@/components/UsernameForm";
import { useColorSettings } from "@/hooks/useColorSettings";
import { useContainerWidth } from "@/hooks/useContainerWidth";
import { useTheme } from "@/hooks/useTheme";
import { usePersistedNumber } from "@/hooks/usePersistedNumber";
import { usePersistedState } from "@/hooks/usePersistedState";
import { makeColoring, makeRanking } from "@/lib/artistColors";
import { extendPalette } from "@/lib/color";
import { displayGradient, displayPalette } from "@/lib/displayColors";
import { fetchAllScrobbles } from "@/lib/fetchScrobbles";
import { isNarrow, layoutFor } from "@/lib/gridLayout";
import { clearSession, loadSession, saveSession } from "@/lib/session";
import {
  ADVANCED_STATES,
  DEFAULT_ADVANCED,
  DEFAULT_GRANULARITY,
  DEFAULT_NESTING,
  DEFAULT_OUTSIDE_POOL,
  DEFAULT_PER_ROW,
  DEFAULT_POOL,
  DEFAULT_TOP_N,
  DEFAULT_VIEW,
  GRANULARITIES,
  LEGEND_ARTISTS,
  NESTINGS,
  OUTSIDE_POOL_OPTIONS,
  PER_ROW_INDEXES,
  POOL_OPTIONS,
  SIZE_VARIATION,
  TOP_N_OPTIONS,
  VIEWS,
  poolLimit,
  type ThemeId,
} from "@/lib/settings";
import { scrobbleStore, type CacheMeta, type CachedScrobbles } from "@/lib/storage";
import {
  DEFAULT_TIME_FRAME,
  coversTimeFrame,
  filterFrom,
  fromTimestamp,
} from "@/lib/timeframe";
import { cardLook, accentOf } from "@/lib/theme";
import { rankedArtists } from "@/lib/topArtists";
import type { Scrobble } from "@/lib/types";
import { artistColorsVisible } from "@/lib/visibility";
import { DEFAULT_ZOOM, ZOOM_LEVELS, ZOOM_ORDER } from "@/lib/zoom";

interface Result {
  user: string;
  /** Filtered to the requested time frame. */
  scrobbles: Scrobble[];
  /** Start of the requested time frame (Unix seconds), undefined = entire history. */
  from: number | undefined;
  now: Date;
  /** Where the data came from, and when it was fetched from Last.fm. */
  source: "cache" | "network";
  fetchedAt: number;
}

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/** The cache entry if it covers the time frame starting at `from`; shared by "Show mosaic" and restore. */
function cacheCovering(cached: CachedScrobbles | undefined, from: number | undefined) {
  return cached && coversTimeFrame(cached.meta.coversFrom, from) ? cached : undefined;
}

export default function Home() {
  // The first render must be neutral (same as the server's); the session is restored in an effect.
  const [form, setForm] = useState<FormValues>({ user: "", timeFrame: DEFAULT_TIME_FRAME });
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  // Display-time settings: remembered, and changing them never fetches or reads the cache.
  const [view, setView] = usePersistedState("view", VIEWS, DEFAULT_VIEW);
  const [granularity, setGranularity] = usePersistedState(
    "granularity",
    GRANULARITIES,
    DEFAULT_GRANULARITY,
  );
  const [zoom, setZoom] = usePersistedState("zoom", ZOOM_ORDER, DEFAULT_ZOOM);
  const [nesting, setNesting] = usePersistedState("nesting", NESTINGS, DEFAULT_NESTING);
  const [topN, setTopN] = usePersistedState("topN", TOP_N_OPTIONS, DEFAULT_TOP_N);
  const [variation, setVariation] = usePersistedNumber(
    "sizeVariation",
    SIZE_VARIATION.min,
    SIZE_VARIATION.max,
    SIZE_VARIATION.fallback,
  );

  const [perRow, setPerRow] = usePersistedState("perRow", PER_ROW_INDEXES, DEFAULT_PER_ROW);
  const [advanced, setAdvanced] = usePersistedState("advanced", ADVANCED_STATES, DEFAULT_ADVANCED);
  const [pool, setPool] = usePersistedState("pool", POOL_OPTIONS, DEFAULT_POOL);
  const [outside, setOutside] = usePersistedState(
    "outside",
    OUTSIDE_POOL_OPTIONS,
    DEFAULT_OUTSIDE_POOL,
  );

  // Gradient and artist colors are two independent choices (see `useColorSettings`). Artists are
  // ranked once per loaded range; the coloring is rebuilt only when the palette, pool, skip/grey
  // or theme change. While a slider is dragged the swatches and legends follow immediately, but
  // the mosaic (thousands of nested squares) gets the deferred colors, so dragging stays smooth.
  const colorSettings = useColorSettings();
  const { gradient: tunedGradient, paletteColors: tunedPalette } = colorSettings;

  // The scheme themes take their hue and chroma from the most chromatic of the colors that are
  // most visible: the first 4 palette colors when artist colors show, otherwise the gradient stops.
  // Deferred, so dragging a color slider doesn't recompute the whole UI's theme on every tick.
  const accent = accentOf(
    artistColorsVisible({ view, nesting, zoom }) ? tunedPalette.slice(0, 4) : tunedGradient.stops,
  );
  const deferredAccent = useDeferredValue(accent);
  const themeSettings = useTheme(deferredAccent);
  // Opening the Advanced panel when Custom is chosen: that is where its two colors are set.
  const { onId: onThemeId } = themeSettings;
  const theme = useMemo(
    () => ({
      ...themeSettings,
      onId: (id: ThemeId) => {
        onThemeId(id);
        if (id === "custom") setAdvanced("open");
      },
    }),
    [themeSettings, onThemeId, setAdvanced],
  );

  // What the card inside implies for the mosaic, and the colors adapted to it (reversed gradient on
  // a light inside, zero color, contrast guard).
  const insideColor = themeSettings.card.bg;
  const look = useMemo(() => cardLook(insideColor), [insideColor]);
  const gradient = useMemo(() => displayGradient(tunedGradient.stops, look), [tunedGradient, look]);
  const { matchGradient, paletteTune } = colorSettings;
  const paletteColors = useMemo(
    () =>
      displayPalette({
        colors: tunedPalette,
        matchGradient,
        tunedStops: tunedGradient.stops,
        tune: paletteTune,
        look,
      }),
    [tunedPalette, matchGradient, tunedGradient, paletteTune, look],
  );

  const deferredGradient = useDeferredValue(gradient);
  const deferredPaletteColors = useDeferredValue(paletteColors);
  const scrobbles = result?.scrobbles;
  const ranking = useMemo(() => makeRanking(scrobbles ? rankedArtists(scrobbles) : []), [scrobbles]);
  const coloring = useMemo(
    () => makeColoring(ranking, deferredPaletteColors, poolLimit(pool), outside, look),
    [ranking, deferredPaletteColors, pool, outside, look],
  );
  const legendColors = useMemo(
    () => extendPalette(paletteColors, LEGEND_ARTISTS),
    [paletteColors],
  );
  const colors = useMemo(
    () => ({
      gradient: deferredGradient,
      coloring,
      legend: { gradient, artistColors: legendColors },
      look,
    }),
    [deferredGradient, coloring, gradient, legendColors, look],
  );

  // The mosaic panel's inner width decides "narrow" (below 640 px): a measured width, not a media
  // query. It is measured here, one level above the controls and the grid that both need it.
  const [panelRef, panelWidth] = useContainerWidth<HTMLDivElement>();
  const narrow = isNarrow(panelWidth);
  const { size: nominalSize, gap: nominalGap } = ZOOM_LEVELS[zoom];
  const autoColumns = layoutFor(panelWidth, nominalSize, nominalGap, granularity, 0).columns;

  // Restore the last session: prefill the form and, if IndexedDB has that user's scrobbles for
  // the time frame, show the mosaic straight away. Never touches the network.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = loadSession();
      if (!session) return;
      setForm(session);
      setBusy(true);
      setRestoring(true);
      try {
        const now = new Date();
        const from = fromTimestamp(session.timeFrame, now);
        const hit = cacheCovering(await scrobbleStore.load(session.user), from);
        if (cancelled || !hit) return;
        const scrobbles = filterFrom(hit.scrobbles, from);
        if (scrobbles.length > 0) {
          setResult({
            user: session.user,
            scrobbles,
            from,
            now,
            source: "cache",
            fetchedAt: hit.meta.fetchedAt,
          });
        }
      } catch {
        // An unreadable cache just means the form is prefilled.
      } finally {
        if (!cancelled) {
          setBusy(false);
          setRestoring(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Fetch-time work: the only place that reads the cache or calls the API. */
  async function handleSubmit({ user, timeFrame }: FormValues) {
    setBusy(true);
    setFetching(false);
    setError(null);
    setNotice(null);
    setResult(null);
    setProgress({ done: 0, total: 0 });
    try {
      const now = new Date();
      const from = fromTimestamp(timeFrame, now);

      let cached: CachedScrobbles | undefined;
      try {
        cached = await scrobbleStore.load(user);
      } catch {
        // An unreadable cache just means fetching.
      }

      let all: Scrobble[];
      let meta: CacheMeta;
      let source: Result["source"];
      const hit = cacheCovering(cached, from);
      if (hit) {
        all = hit.scrobbles;
        meta = hit.meta;
        source = "cache";
      } else {
        setFetching(true);
        all = await fetchAllScrobbles(user, from, (done, total) => setProgress({ done, total }));
        meta = { coversFrom: from ?? null, fetchedAt: Date.now() };
        source = "network";
        if (all.length > 0) {
          try {
            await scrobbleStore.save(user, all, meta);
          } catch {
            // Caching is best-effort; the mosaic can still be shown.
          }
        }
      }

      const scrobbles = filterFrom(all, from);
      if (scrobbles.length === 0) {
        setError("No scrobbles found in that time frame.");
        return;
      }
      setResult({ user, scrobbles, from, now, source, fetchedAt: meta.fetchedAt });
      saveSession({ user, timeFrame });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
      setFetching(false);
    }
  }

  async function handleClear() {
    setError(null);
    try {
      await scrobbleStore.clear();
      clearSession();
      setResult(null);
      setNotice("Cached data cleared.");
    } catch {
      setError("Could not clear cached data.");
    }
  }

  return (
    <ColorsProvider value={colors}>
      {/* One centered column. The header and the controls are compact so the mosaic dominates. */}
      <main className="mx-auto flex w-full max-w-[1680px] flex-col gap-3 px-3 py-3 sm:px-4">
        <header className="rule-thick-b flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] font-black leading-none tracking-tighter">Last.fm Mosaic</h1>
            <p className="ui-label-sm text-ink-dim">Your listening history, one square at a time.</p>
          </div>
          <UsernameForm
            values={form}
            onChange={setForm}
            disabled={busy}
            onSubmit={handleSubmit}
            onClearCache={handleClear}
          />
        </header>

        {restoring && <p className="text-sm text-ink-dim">Loading cached data...</p>}
        {fetching && <ProgressBar done={progress.done} total={progress.total} />}
        {error && (
          <p role="alert" className="rule-thin w-fit px-3 py-2 text-sm font-medium">
            {error}
          </p>
        )}
        {notice && <p className="text-sm text-ink-dim">{notice}</p>}

        {result && (
          <>
            <ControlsCard
              view={view}
              onView={setView}
              granularity={granularity}
              onGranularity={setGranularity}
              zoom={zoom}
              onZoom={setZoom}
              nesting={nesting}
              onNesting={setNesting}
              topN={topN}
              onTopN={setTopN}
              colors={colorSettings}
              theme={theme}
              advancedOpen={advanced === "open"}
              onAdvanced={() => setAdvanced(advanced === "open" ? "closed" : "open")}
              narrow={narrow}
              perRow={perRow}
              onPerRow={setPerRow}
              autoColumns={autoColumns}
            />
            {/*
              From 1100px the Advanced panel is docked beside the mosaic (sticky, so the mosaic
              stays visible while sliders are dragged); below that it stacks above it. The mosaic
              panel is flex-1 / min-w-0: opening or closing the panel resizes it and the
              ResizeObserver in the grid refits.
            */}
            <div className="flex flex-col gap-3 min-[1100px]:flex-row min-[1100px]:items-start">
              {advanced === "open" && (
                <div className="order-first min-[1100px]:order-last min-[1100px]:sticky min-[1100px]:top-4 min-[1100px]:w-80 min-[1100px]:shrink-0">
                  <AdvancedPanel
                    view={view}
                    nesting={nesting}
                    zoom={zoom}
                    pool={pool}
                    onPool={setPool}
                    outside={outside}
                    onOutside={setOutside}
                    variation={variation}
                    onVariation={setVariation}
                    colors={colorSettings}
                    theme={theme}
                  />
                </div>
              )}
              {/* The frame (border, shadow) uses the page ink; the inside is the card scope. */}
              <section aria-label="Mosaic" className="rule-thick shadow-hard min-w-0 flex-1">
                <div className="card-scope">
                  <p className="rule-b px-3 py-2 text-sm tabular-nums">
                    <span className="font-bold">{result.user}</span>:{" "}
                    {result.scrobbles.length.toLocaleString()} scrobbles,{" "}
                    {result.source === "cache" ? "from cache, " : ""}fetched{" "}
                    {dateFmt.format(result.fetchedAt)}
                  </p>
                  <div ref={panelRef} className="p-3">
                    {view === "timeline" ? (
                      <Timeline
                        scrobbles={result.scrobbles}
                        granularity={granularity}
                        zoom={zoom}
                        nesting={nesting}
                        variation={variation}
                        from={result.from}
                        now={result.now}
                        width={panelWidth}
                        perRow={perRow}
                      />
                    ) : (
                      <TopArtists scrobbles={result.scrobbles} topN={topN} />
                    )}
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </ColorsProvider>
  );
}
