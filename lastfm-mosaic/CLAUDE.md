# Last.fm Mosaic

A web app that visualizes a person's Last.fm listening history as a mosaic of colored squares. It should have a certain beauty to it — this is as much an art object as a data tool.

## The idea

**Long-term vision:** Albers-style nested squares ("Homage to the Square") per day, week or month. Nesting encodes the top artists of that period; ring thickness encodes each artist's share of listening.

**Further ideas** (see Roadmap): click a day for a "time capsule" view, obsession detector, taste diversity over time, abandoned artists, time-of-day view, poster export.

## Scope

Only what is listed here is in scope. **Everything else (see Roadmap) is out of scope for now.**

### Basics (MVP)

- Raw scrobbles (timestamp, artist, track, album) cached in IndexedDB keyed by username, behind a small storage interface; a "clear cached data" button.
- Aggregation into counts per day, ISO week (weeks start Monday) or month in the user's local time zone, including zero-count buckets.
- The **mosaic panel is dark-only**: all color presets are designed for the near-black panel background (#0a0a0a). The page around it follows the page background choice (dark or light, see "Page background and token scopes"); the `dark` class on `<html>` and the `dark:` variant in `globals.css` stay, but the UI reads the CSS-variable tokens, not `dark:` utilities.

### Controls: fetch-time vs display-time

- **Fetch-time** (the form, `UsernameForm`): username and time frame (last 6 months / last year / entire history), plus "Show mosaic" and "Clear cached data". Only "Show mosaic" (`handleSubmit` in `page.tsx`) ever calls the API; it and the session restore on mount (see "Session restore") are the only places that read the cache. The form has **no granularity**.
- **Display-time** (the compact controls card, `ControlsCard`, plus the docked Advanced panel, `AdvancedPanel`, shown once data is loaded; see "Page structure and controls"). In the card: View (Timeline | Top artists), Granularity (Days | Weeks | Months; Timeline only), Zoom (S | M | L | XL | XXL; Timeline only), Nesting (Volume + artists | Artists only; Timeline only), Top N (5 | 8 | 12; Top artists only), and the pickers for artist colors, volume gradient and page background. In Advanced: Pool and Outside the pool, Size variation, the color tuning sliders and the custom page color. These **never fetch and never touch IndexedDB**; everything is recomputed with `useMemo` from the scrobbles held in page state (aggregation is keyed on granularity). Values and options live in `src/lib/settings.ts` / `src/lib/zoom.ts`; each is persisted in localStorage (`lastfm-mosaic:<key>`, try/catch) by `usePersistedState` (only accepts stored values that are valid options) or, for numbers, `usePersistedNumber` (`src/hooks/usePersistedNumber.ts`, only accepts values inside the slider range) or, for the per-preset tune sliders, `usePersistedTunes`.

### Cache-first loading

- IndexedDB (`indexedDbStore.ts`, DB v2) has two stores keyed by lowercased username: `scrobbles` (the array) and `meta` (`CacheMeta`: `coversFrom` = earliest timestamp the cache covers, `null` = entire history; `fetchedAt`). Both are written in one transaction. v1 entries have no metadata and count as "no cache".
- "Show mosaic": if `coversTimeFrame(meta.coversFrom, from)` (`src/lib/timeframe.ts`) the data comes from IndexedDB with no API call; otherwise it is fetched as before (progress bar **only while fetching**) and replaces the cache. Either way the displayed scrobbles are filtered client-side to the requested time frame (`filterFrom`). The status line says when data came from cache and when it was fetched. The cache is never refreshed incrementally: use "Clear cached data" to refetch.

### Session restore

- After a successful "Show mosaic", the username and time frame are saved in localStorage under `lastfm-mosaic:session` (JSON, try/catch; `src/lib/session.ts`, which validates what it reads).
- On reload, a `useEffect` in `page.tsx` (not during render, so the first render is neutral and matches the server) reads the session and prefills the form (`UsernameForm` is controlled by the page). If IndexedDB has that user's scrobbles and `cacheCovering` (the same `coversTimeFrame` check "Show mosaic" uses) accepts them for the saved time frame, they are filtered with `filterFrom` and shown immediately: **no network request, no progress bar**, only a brief "Loading cached data..." line. Without a usable cache only the form is prefilled.
- "Clear cached data" clears IndexedDB **and** the saved session and hides the mosaic (the form keeps what is typed).
- The display settings are separate `usePersistedState` entries and are applied to the restored mosaic like to any other.
- The info line shows when the data was fetched (`CacheMeta.fetchedAt`), for cache and network alike.

### Two views

**Timeline** — one square per bucket.
- Layout: fills the mosaic panel (see "Page structure and controls") and grows downward; only the normal page scroll (no `overflow-*` wrappers). **Fit-to-width** (`fitGrid` in `src/lib/gridLayout.ts`, pure): the grid is as wide as the panel's inner width minus a fixed-width year gutter (48 px + 8 px gap), measured by `useContainerWidth` (a ResizeObserver hook on the `Mosaic` root div, which sits directly in the panel's padded content area; the Advanced panel opening or closing resizes the panel and so refits the grid). There is no leftover space: the squares stretch or shrink slightly around the zoom's nominal size. The grid is a CSS grid with `repeat(cols, minmax(0, 1fr))`, an exact pixel width and `gridAutoRows` equal to the fitted side (fractional, so no pixel seams); the year-gutter labels use the same fitted pitch. A very narrow panel never goes below a 4 px side and then overflows to the right (no inner scroll).
  - *Days*: columns are a multiple of 7 (every column is one weekday; padded with empty leading cells so the first row starts on a Monday). Of cols = 7k, k >= 1, the k whose resulting side `(gridWidth - (cols - 1) * gap) / cols` is closest to the nominal size wins (smallest |ln(side / nominal)|).
  - *Weeks*: `cols = max(1, floor((gridWidth + gap) / (nominal + gap)))`, then stretched to fill.
  - *Months*: always 12 columns, side = min(fit, 1.5 x nominal); if capped, the whole row (gutter included) is centered.
  - Cells do not depend on the pixel size: they fill their grid cell and nested squares are an SVG with a fixed `viewBox` (100) scaled by CSS, so resizing never re-renders the cells. Which zoom levels draw nested squares depends on the zoom setting, not on the stretched size.
- **Month layout**: one row per year, always 12 columns (Jan to Dec), year label in the left gutter, short month labels (single letters when the squares are narrower than 24 px) above the first row. Leading/trailing months outside the range are empty cells. Unlike days/weeks (time frame start to now), the month range runs from the first to the last scrobble (zero months in between included). Month keys are `YYYY-MM`.
- Left gutter (days/weeks): year label at the first row containing Jan 1 (plus the data's first year on row 0). Several years on one row are combined ("2021–23"). No month ticks.
- Zoom (S / M / L / XL / XXL = nominal square sides 14 / 24 / 44 / 72 / 120 px, gaps 2 / 3 / 4 / 6 / 8; the fitted side is close to these), default M. All constants in `src/lib/zoom.ts`, including `ARTIST_LAYER_SCALES` and `ARTISTS_ONLY_LAYER_COUNT`. Full histories at XXL are many tall rows of SVG cells; if that gets sluggish, the next step is row windowing (render only visible rows), not done yet.
- **Nesting** (Timeline only, `Nesting` in `src/lib/settings.ts`, persisted; the per-bucket logic is the pure `bucketLayers` in `src/lib/bucketLayers.ts`):
  - *Volume + artists* (default): the count-colored square, with artist squares inside it: S/M none (plain square), L 1 artist (scale 0.5), XL 3 (0.7 / 0.45 / 0.22), XXL 5 (0.82 / 0.64 / 0.47 / 0.31 / 0.16). Fewer artists means fewer layers.
  - *Artists only*: no volume layer. The outermost square is the bucket's #1 artist, then #2, #3, ...; sizes come from `ringScales(counts, variation, n)` and `computeNestedRects`. One more artist than above: S/M 1 (a flat square in the #1 artist's color), L 2, XL 4, XXL 6. Zero-scrobble buckets are a flat square in the gradient's zero color.
  - *Size variation* (controls card slider, 0 to 100 %, default 25, persisted; only shown in Artists only mode): `raw(i) = lerp(equal(i), proportional(i), variation / 100)` with `equal(i) = 1 - i * (1 - 0.28) / (n - 1)` (equally thick rings, innermost 0.28) and `proportional(i) = sqrt(count_i / count_0)`. Rings are then clamped from the outside in, `scale(0) = 1` and each next ring into `[0.18 + (n - 1 - i) * 0.05, scale(i - 1) - 0.05]`: strictly decreasing, at least 0.05 between rings, smallest ring at least 0.18. "Volume + artists" scales are not affected.
  - Which artists get rings depends on the artist pool (see "Artist pool"): in Skip mode artists outside the pool are removed from a bucket's list BEFORE the ring count is taken and before ring sizes are computed, so sizes come from the filtered counts. A bucket with scrobbles but no pool artist is a hollow square in Artists only (page-colored fill, 2px inset border in `HOLLOW_BORDER`, a mid-dark neutral) and just the count square in Volume + artists; zero-scrobble buckets keep the solid zero color.
  - Adjacent artist rings never share a color (`ringColors`), in both modes. The tooltip always lists the bucket's real top artists with counts: drawn artists show their swatch (same colors as the rings), artists not drawn (Skip, outside the pool) show an empty outlined swatch.
- Color of the count square (Volume mode): active gradient by count (sqrt + clamp at the 95th percentile, **computed from the counts of the current granularity**), giving `t` for `gradientColor`. High counts are bright, low counts dark; zero is the gradient preset's very dark neutral.
- One shared tooltip (day: date; week: "Week of …"; month: "March 2024"; plus count and top artists when computed). Cells are `React.memo`'d and carry no state or handlers; hover uses event delegation (`data-i`) on the grid.
- Legends sit at the TOP of the mosaic panel (above the grid, separated by a rule):
  - Artist legend (`ArtistLegend`, only when artist colors are visible): heading "Top 15 artists" and wrapping chips (swatch + name) for the top 15 artists by overall rank. Fixed: no "show all", no expansion, no inner scroll, whatever the pool is. A grey "Other artists" chip appears only in Grey mode (and only if some artist is actually grey).
  - Gradient legend (`Legend`, Volume mode only): the multi-stop active gradient and "N+ per day/week/month". In Artists-only mode it is replaced by the caption "Outer square = top artist of the day/week/month".
- Top artists per bucket (`topArtistsByBucket`) are computed with `useMemo` only when needed (when artist colors are visible: Artists-only at every zoom, Volume mode at L and up). The pool filter (`filterBucketsToPool`) is a second memo keyed on that result, the ranking, the pool size and skip/grey, so it runs once per aggregation, never per cell.

**Top artists** — one big centered nested square of the overall top N artists (fully proportional, `proportionalRingScales`; no size variation), size `min(80vw, 720px)`, plus a list (rank, swatch, name, scrobbles, share of all scrobbles) beside it (below on narrow screens). Hovering a ring or a list row dims the other rings and shows the tooltip. The pool does NOT apply here: it keeps its own Top N (5 / 8 / 12, always inside the smallest pool). No gradient legend.

## NestedSquares geometry

`computeNestedRects(scales, size)` in `src/lib/nestedSquares.ts` is Albers' "Homage to the Square": `scales` are side fractions of the outer box (outermost = 1, strictly decreasing). Each square is horizontally centered and shifted down: with `free = size - side`, `x = free / 2` and `y = free * 2/3`, so the band above is twice as thick as the band below (the bottom band gets the other 1/3). `<NestedSquares layers={[{ color, scale }]} size={px} />` renders it as an SVG of stacked rects (outermost first). `size` is the SVG's coordinate size: timeline cells use a constant 100 and let CSS scale the SVG to the (fitted) cell, the Top artists view uses 720; the Albers offset math is the same either way.

Ring sizes: the Top artists view uses `proportionalRingScales(counts)` = `sqrt(count_i / count_1)` (square area ∝ plays), with a minimum step between consecutive sides (0.05) and a minimum innermost size (0.06) so small rings stay visible. The timeline's Artists only nesting uses `ringScales(counts, variation, n)`, which blends in equally thick rings (see "Size variation").

## Color gradients and artist colors

**Color primer.** Colors do two jobs here.
- *Sequential*: the count gradient. Values are ordered, so perceived lightness must increase monotonically along the gradient (on the dark page: dark = few, bright = many); hue is decoration.
- *Categorical*: artist colors. They only need to be distinguishable, so vary hue and keep lightness and chroma similar; then no artist dominates and the Albers feel is preserved.
- Mixing far-apart colors in sRGB gives muddy, grey midpoints, so all interpolation happens in **OKLab**.

**Two independent choices.** The gradient (sequential job) and the artist palette (categorical job) are chosen separately, because the two jobs have different requirements and no reason to be tied together: any gradient can go with any palette. Both are picked with compact swatch pickers in row 2 of the controls card (`Pickers`: `GradientPicker` 56x20 gradient swatches, `PalettePicker` 56x20 strips of the first 6 colors; the name is the `title` tooltip and the selected name is shown next to the picker label; selected = thick outline), persisted (`gradient`, `palette`), resolved by `useColorSettings` and passed down through `ColorsContext` (`useColors()` gives `{ gradient, coloring, legend }`; `gradient` and `coloring` feed the mosaic and may lag a tick, `legend` carries the same choices without lag). Defaults: gradient "Violet & Cream", palette "Albers".

- `src/lib/colorPresets.ts`: `GradientPreset { id, name, stops (2 to 4 hex, low counts first), zero }` for Violet & Cream, Albers, Deep Sea, Ember, Mono, Sunset, Spectrum, Bauhaus, Pastel; and `ArtistPalette { id, name, colors }` for Violet, Albers, Bauhaus (hand-picked, 24 colors each; Violet is the purple family for the Violet & Cream gradient: aubergine, plum, violet, iris, lavender, lilac, mauve, dusty rose, orchid, parchment and cream plus accents of muted gold, teal, sage, slate blue and terracotta, lightness spread over L 0.32 to 0.93, consecutive entries at least 0.15 apart, no hex shared with Albers), Distinct, Distinct muted (generated, 50 colors) and "Match gradient" ("pretty, less distinct": 24 colors sampled along the *active, tuned* gradient with t from 0.2 to 1 so the dark end doesn't vanish on the page; `gradientPalette`).
- `src/lib/color.ts` (dependency-free): hex to/from OKLab/OKLCH, `mixColors`, `oklchToHex(l, c, h)` (reduces chroma until the color fits in sRGB, lightness and hue kept; verified against the CSS Color 4 reference matrices, so low-chroma requests really are low chroma), `gradientColor(stops, t)`, `gradientSamples(stops, n)` (legend and swatches use 12), `tuneColor`, `tuneGradient`, `hueBalancedPalette`, `extendPalette`; also `parseHex`, `rgbToHex` and `COLOR_PAGE` (the mosaic panel's background, must match `--panel-bg`; used to dim colors).
- **Generated palettes (`hueBalancedPalette(n, chromas)`)**. Plain farthest-point (maximin) selection in OKLab was tried first: it is not buggy but uneven (in the first 24 colors some 30-degree hue sectors held 4 or 5 colors and others none, e.g. no blue at all in "Distinct muted"), because the sRGB gamut's chroma range differs per hue and selection chases the extremes. The generator is therefore hue balanced and deterministic:
  - Candidates: hue 0..350 step 10 x lightness {0.45, 0.55, 0.65, 0.75, 0.85} x three chroma values, gamut-reduced and then deduplicated, split into 12 hue sectors of 30 degrees. "Distinct" uses chroma {0.05, 0.09, 0.13}, "Distinct muted" {0.03, 0.05, 0.07}. Separate near-neutral candidates (C <= 0.03): greys from L 0.40 to 0.95 plus a warm and a cool tint.
  - Distance `d = sqrt(dL^2 + (0.7 da)^2 + (0.7 db)^2)`: lightness differences count more than chroma differences.
  - Selection runs in rounds, one color from every sector per round, visiting the sectors in the order [0,6,3,9,1,7,4,10,2,8,5,11] rotated by one position each round, so consecutive ranks are far apart in hue. Within a sector the pick is the candidate with the largest minimum `d` to everything already selected. After every 6 chromatic colors one near-neutral color is inserted (lightness chosen by the same maximin rule). The first color is a fixed candidate (L 0.65, middle chroma, hue 20). 50 colors.
  - Result: among the first 24 colors no sector holds more than 3 and exactly 3 are near-neutral (Distinct: 2 2 1 3 1 1 2 2 3 1 2 1 per sector; muted: 1 2 2 2 2 1 3 1 3 1 2 1).
- `extendPalette(colors, n)`: for palettes shorter than n, appends variants: round 2 lightness +0.10, round 3 -0.10 (then repeating), hue nudged 6 degrees more each round (L clamped to [0.2, 0.95]).
- **Tune sliders** (`tuneColor(hex, { hue, sat, bright })` in OKLCH, gamut-reduced; applied on top of the chosen preset, never stored in it): Hue shift -180..180 degrees, Saturation 0..200 % (100 = unchanged), Brightness -0.15..+0.15 on L. Values are stored PER PRESET: `usePersistedTunes(key, ids)` keeps one record keyed by gradient id (`gradientTunes`) or palette id (`paletteTunes`) as JSON in localStorage, validated on read (unknown ids, out-of-range or neutral values are dropped), so switching presets never carries odd values over and a preset nobody tuned is neutral. The old shared `gradientTune.*` / `paletteTune.*` keys are ignored. The sliders live in the Advanced panel (one block per visible section, each with Reset, which resets the current preset's sliders only). `tuneGradient` additionally clamps L to [0.05, 0.98] and keeps it non-decreasing along the stops, so a tuned gradient stays sequential. The zero color is not tuned. Tuned colors are memoized in `useColorSettings` (the palette ignores gradient changes unless it is "Match gradient").
- **Smooth dragging**: swatches, strips and legends use the tuned colors immediately; the mosaic gets `useDeferredValue` copies of the tuned gradient and palette (in `page.tsx`), so React renders the sliders first and the thousands of nested squares in an interruptible follow-up render.

**Rank-based artist colors** (`src/lib/artistColors.ts`). Artists are ranked by total plays in the loaded range (`rankedArtists`, memoized in `page.tsx`; ties by name). Rank r gets palette color r (palette extended with `extendPalette` where shorter, so "All" with hundreds of artists still gets distinct variants). The same coloring is used by the Timeline and the Top artists view. `ringColors(artists, coloring)` is the neighbor nudge: a ring whose color equals its outer neighbor's takes the color of the next rank (for greys, the other grey).

## Artist pool

The **pool** is the top N artists by total plays in the loaded range (the ranking above), N = 15 / 30 / 50 / All (control "Pool", default 30, persisted as `pool`). The control "Outside the pool" (persisted as `outside`, default Skip) decides what happens to the other artists. Both live in the Advanced panel, shown only in the Timeline when artist colors are visible. `makeColoring(ranking, palette, pool, outside)` gives `poolCount`, `skipOutside`, `colorOfRank` and `isDrawn(artist)`.

- **Skip**: for each bucket, first remove every artist outside the pool (`filterBucketsToPool`), then sort by count (already the order) and take the ring count the zoom/nesting mode needs. Ring scales (sqrt, size variation, clamps) use the FILTERED counts. No grey anywhere. A bucket with scrobbles but no pool artist: hollow square in Artists only, the plain count square in Volume + artists (see "Nesting").
- **Grey**: every artist keeps its ring; ranks beyond the pool alternate between two neutral greys (OKLCH L 0.42 and 0.52, C 0) so neighboring grey rings stay distinguishable. The legend gets an "Other artists" chip.
- **All** means no filtering and no grey in either mode (`skipOutside` is false when the pool covers everyone).
- Tooltips always list the real top artists (see "Nesting"); the Top artists view ignores the pool.

**Adding a gradient.** Append a `GradientPreset` to `GRADIENT_PRESETS`: 2 to 4 stops with strictly increasing OKLab lightness (sample `gradientColor` to check), hue free; `zero` a very dark neutral above the page background (#0a0a0a) and below the first stop.

**Adding an artist palette.** Append an `ArtistPalette` to `ARTIST_PALETTES`: any number of unique colors readable on the dark page (hand-picked, or `hueBalancedPalette(50, [c1, c2, c3])`); longer ranks are covered by `extendPalette`.

## Page structure and controls

**Goal: the mosaic dominates the screen.** On a ~1500x950 viewport the header and the controls take about 200 px, so the legends and the first mosaic rows are visible without scrolling. One centered column (`main`: `mx-auto w-full max-w-[1680px]`, small padding). Order: header, status lines, controls card, then the mosaic area.

- **Header**: one row with a thick rule underneath. Title on the left (28 px, heavy, tight tracking, tagline under it), the user form on the right (`UsernameForm`: username, time frame, Show mosaic, Clear cached data; all controls 36 px high, tiny 10 px labels above). Wraps on narrow screens.
- **Controls card** (`ControlsCard`): two rows of cells, no label column; each control has a tiny uppercase 10 px label (`ui-label-sm`) above it; buttons are ~28 px high with 13 px text. Row 1: View | Granularity | Zoom | Nesting (Timeline only) | Top N (Top artists only). Row 2: Artist colors picker | Volume gradient picker | Page background picker | the "Advanced" toggle at the far right. Cells carry right and bottom rules and the grid is pulled under the card border with `bleed-rb`; a filler cell makes each row's bottom rule reach the edge. Hidden controls are not rendered (never disabled).
- **Visibility rules**, small pure helpers in `src/lib/visibility.ts` (given `{ view, nesting, zoom }`); they control the pickers AND the Advanced content:
  - `volumeVisible` = Timeline AND nesting is "Volume + artists"
  - `artistColorsVisible` = Top artists view, OR nesting is "Artists only", OR zoom is L, XL or XXL (the zooms with artist layers)
  - `gradientSectionVisible` = volumeVisible OR (artistColorsVisible AND the active artist palette is "Match gradient"): the Volume gradient picker and its tuning block
  - `artistSectionVisible` = artistColorsVisible: the Artist colors picker and its tuning block
  - The Page background picker is always there.
- **Advanced panel** (`AdvancedPanel`, `id="advanced-panel"`): the "Advanced" button toggles it; open/closed is persisted (`advanced`, default closed). Contents, each under the visibility rules: Pool and Outside the pool (Timeline AND artistColorsVisible), Size variation (Timeline, Artists only nesting), color tuning (Hue / Saturation / Brightness + Reset for each visible section, values stored per preset), and the custom page color (`<input type="color">`; picking a color also selects "Custom"). It is not a separate route.
- **Docking** (in `page.tsx`): from 1100 px the area below the card is two columns, the mosaic panel (`flex-1 min-w-0`) and the Advanced panel (320 px, `sticky top-4`, the same thick-border card style; it scrolls inside if taller than the viewport) on the right, so the mosaic stays visible while sliders are dragged. Below 1100 px the panel stacks above the mosaic. Opening or closing it changes the mosaic panel's width, which the grid's ResizeObserver picks up.
- **Mosaic panel**: a header strip with the info line ("user: N scrobbles, from cache, fetched ..."), then the legends, then the grid; less padding than before so the grid uses the space.

## Page background and token scopes

The page background is a persisted choice (`pageBackground`, default Black) in the card's picker, with a custom color (`pageCustom`) set in Advanced; `usePageBackground` resolves it:

- **Black** (#0a0a0a), **Paper** (#f2f0e8), **Scheme dark**, **Scheme light**, **Custom**.
- Scheme accent = the tuned artist palette's rank-0 color when `artistColorsVisible`, otherwise the tuned gradient's top stop; take its OKLCH hue h and chroma c. Scheme dark = `oklchToHex(0.20, min(c * 0.5, 0.06), h)`, Scheme light = `oklchToHex(0.93, min(c * 0.35, 0.04), h)` (`src/lib/pageTheme.ts`). They follow the tuning sliders live.
- Tone: if the background's OKLab lightness is above 0.6 the page is "light" (ink #0a0a0a), otherwise "dark" (ink #f2f0e8). `data-tone` is set on `<html>` (it also switches `color-scheme`, so native selects and color inputs match). Secondary ink is the ink pulled toward the background as far as 4.5:1 contrast allows. Verified: Black and Paper have ink contrast 17.4:1; all 28 scheme combinations (every palette rank 0 and gradient top stop, dark and light) have ink >= 15.7:1 and dim ink >= 6.5:1; disabled controls (50 % opacity) stay >= 4.1:1. Custom mid-tones are the weak spot: right around the 0.6 threshold the chosen ink falls to about 3.2 to 3.5:1 (still fine for UI parts at 3:1, but below 4.5:1 for small text); moving the threshold to about 0.555 would equalize both inks at 4.2:1.

**Two token scopes** (CSS variables in `globals.css`):

- **Page scope** (header, form, controls card, Advanced panel): `--page-bg`, `--page-ink`, `--page-ink-dim` are written to `<html>` at runtime from the chosen background. `html` and `body` use `--page-bg` too, so overscroll never flashes another color.
- **Panel scope** (`.panel-scope`, the mosaic panel: info line, legends, grid, tooltip): ALWAYS dark with fixed tokens `--panel-bg` (#0a0a0a), `--panel-ink` (#f2f0e8), `--panel-ink-dim`, independent of the page. Components read `--paper` / `--ink` / `--ink-dim`, which `.panel-scope` re-points. The panel's thick border and offset shadow sit on an outer element outside the scope, so they use the PAGE ink and the panel stays framed on any background.

## Design language

Swiss / brutalist, and **the UI is monochrome: ALL color comes from the mosaic** (so never add a colored accent, error red, link blue, ... to the chrome; the page background choices are the one place where the user picks a tint, and only its hue is derived from the mosaic).

- **Tokens** live in `src/app/globals.css` as CSS variables and are mapped into Tailwind there (see the scopes above): `--paper`, `--ink`, `--ink-dim`, `--rule-thick` (3px: card, panel, tooltip), `--rule-thin` (2px: buttons, inputs, swatches, cell dividers), `--shadow-hard` (6px 6px 0 page ink, no blur; set to `none` to remove it everywhere), `--thumb-size`, `--focus-offset`. Utilities: `text-ink`, `bg-paper`, `text-ink-dim`, `rule-thick`, `rule-thin`, `rule-t/r/b/l`, `rule-thick-b`, `shadow-hard`, `ui-label` (11 px), `ui-label-sm` (10 px), `bleed-rb`, `panel-scope`. Components read these, never hard-coded colors or widths.
- No rounded corners anywhere (a global `border-radius: 0` in the base layer, and no `rounded-*` classes), including the card, buttons, inputs, tooltip and slider thumbs.
- Segmented controls (`SegmentedControl`): squares sharing borders (24 px buttons in a 2 px frame); selected = inverted (ink background, page-colored text); hover = underline. Visible focus rings (2px ink outline with offset, global `:focus-visible`).
- Sliders: custom CSS for `input[type=range]` in `globals.css` (WebKit and Firefox): 2px ink track, square 14px ink thumb.
- Swatches and chips: squares with 2px borders; the selected swatch gets a thicker (3px) ink outline.
- Buttons: "Show mosaic" filled ink; secondary buttons outlined; both invert on hover.
- Title: heavy weight, tight tracking. Labels uppercase with wide tracking. Numbers use `tabular-nums`. Same font as before (Geist), no font packages.

## Stack and conventions

- Next.js App Router, TypeScript (`strict`), Tailwind CSS.
- No unnecessary dependencies.
- Small, focused components in `src/components`.
- Data aggregation and other logic are **pure functions in `src/lib`** so they can be tested.
- Color presets are constants in `src/lib/colorPresets.ts`; color math lives in `src/lib/color.ts`. Which controls and colors are visible is decided by `src/lib/visibility.ts`; the look comes from the tokens in `globals.css`.

## Architecture notes

- The Last.fm API key lives **only** in `.env.local` as `LASTFM_API_KEY` (`.env*` is git-ignored). It is used **only server-side**, through the route handler `src/app/api/scrobbles/route.ts`, which proxies Last.fm `user.getRecentTracks`. **Never expose the key to the client** (no `NEXT_PUBLIC_` prefix, no imports of server code in client components).
- The client fetches page by page (first response gives `totalPages`) with light throttling, then stores the result and its metadata via the `ScrobbleStore` interface (`src/lib/storage`), currently implemented with IndexedDB. See "Cache-first loading".
- The "now playing" entry has no date and is skipped.

## Roadmap (post-MVP)

- Canvas rendering for the timeline if XL gets slow on very long histories (currently SVG per cell).
- Time capsule view: click a day to see what you listened to.
- Obsession detector.
- Taste diversity over time.
- Abandoned artists.
- Time-of-day view.
- Poster export.
