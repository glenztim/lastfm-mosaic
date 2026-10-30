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
import { usePageBackground } from "@/hooks/usePageBackground";
import { usePersistedNumber } from "@/hooks/usePersistedNumber";
import { usePersistedState } from "@/hooks/usePersistedState";
import { makeColoring, makeRanking } from "@/lib/artistColors";
import { extendPalette } from "@/lib/color";
import { fetchAllScrobbles } from "@/lib/fetchScrobbles";
import { clearSession, loadSession, saveSession } from "@/lib/session";
import {
  ADVANCED_STATES,
  DEFAULT_ADVANCED,
  DEFAULT_GRANULARITY,
  DEFAULT_NESTING,
  DEFAULT_OUTSIDE_POOL,
  DEFAULT_POOL,
  DEFAULT_TOP_N,
  DEFAULT_VIEW,
  GRANULARITIES,
  LEGEND_ARTISTS,
  NESTINGS,
  OUTSIDE_POOL_OPTIONS,
  POOL_OPTIONS,
  SIZE_VARIATION,
  TOP_N_OPTIONS,
  VIEWS,
  poolLimit,
} from "@/lib/settings";
import { scrobbleStore, type CacheMeta, type CachedScrobbles } from "@/lib/storage";
import {
  DEFAULT_TIME_FRAME,
  coversTimeFrame,
  filterFrom,
  fromTimestamp,
} from "@/lib/timeframe";
import { rankedArtists } from "@/lib/topArtists";
import type { Scrobble } from "@/lib/types";
import { artistColorsVisible } from "@/lib/visibility";
import { DEFAULT_ZOOM, ZOOM_ORDER } from "@/lib/zoom";

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

  const [advanced, setAdvanced] = usePersistedState("advanced", ADVANCED_STATES, DEFAULT_ADVANCED);
  const [pool, setPool] = usePersistedState("pool", POOL_OPTIONS, DEFAULT_POOL);
  const [outside, setOutside] = usePersistedState(
    "outside",
    OUTSIDE_POOL_OPTIONS,
    DEFAULT_OUTSIDE_POOL,
  );

  // Gradient and artist colors are two independent choices (see `useColorSettings`). Artists are
  // ranked once per loaded range; the coloring is rebuilt only when the palette, pool or
  // skip/grey change. While a slider is dragged the swatches and legends follow immediately, but
  // the mosaic (thousands of nested squares) gets the deferred colors, so dragging stays smooth.
  const colorSettings = useColorSettings();
  const { gradient, paletteColors } = colorSettings;
  // The page background's "scheme" options take their hue and chroma from the color that is most
  // visible: the top artist's color when artist colors show, otherwise the gradient's top stop.
  const accent = artistColorsVisible({ view, nesting, zoom })
    ? (paletteColors[0] ?? gradient.stops[gradient.stops.length - 1])
    : gradient.stops[gradient.stops.length - 1];
  const page = usePageBackground(accent);
  const deferredGradient = useDeferredValue(gradient);
  const deferredPaletteColors = useDeferredValue(paletteColors);
  const scrobbles = result?.scrobbles;
  const ranking = useMemo(() => makeRanking(scrobbles ? rankedArtists(scrobbles) : []), [scrobbles]);
  const coloring = useMemo(
    () => makeColoring(ranking, deferredPaletteColors, poolLimit(pool), outside),
    [ranking, deferredPaletteColors, pool, outside],
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
    }),
    [deferredGradient, coloring, gradient, legendColors],
  );

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
              page={page}
              advancedOpen={advanced === "open"}
              onAdvanced={() => setAdvanced(advanced === "open" ? "closed" : "open")}
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
                    page={page}
                  />
                </div>
              )}
              {/* The frame uses the page ink; inside, the panel is always dark. */}
              <section aria-label="Mosaic" className="rule-thick shadow-hard min-w-0 flex-1">
                <div className="panel-scope">
                  <p className="rule-b px-3 py-2 text-sm tabular-nums">
                    <span className="font-bold">{result.user}</span>:{" "}
                    {result.scrobbles.length.toLocaleString()} scrobbles,{" "}
                    {result.source === "cache" ? "from cache, " : ""}fetched{" "}
                    {dateFmt.format(result.fetchedAt)}
                  </p>
                  <div className="p-3">
                    {view === "timeline" ? (
                      <Timeline
                        scrobbles={result.scrobbles}
                        granularity={granularity}
                        zoom={zoom}
                        nesting={nesting}
                        variation={variation}
                        from={result.from}
                        now={result.now}
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
