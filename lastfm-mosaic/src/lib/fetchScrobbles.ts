import type { Scrobble, ScrobblePage } from "./types";

/** Max requests in flight at once. */
const MAX_CONCURRENT = 4;
/** Minimum gap between request launches: a hard cap of 4 requests/s, whatever the latency. */
const LAUNCH_INTERVAL_MS = 250;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

export type ProgressCallback = (pagesFetched: number, totalPages: number) => void;

class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPage(
  user: string,
  page: number,
  from: number | undefined,
  signal: AbortSignal,
): Promise<ScrobblePage> {
  const params = new URLSearchParams({ user, page: String(page) });
  if (from) params.set("from", String(from));
  const res = await fetch(`/api/scrobbles?${params}`, { signal });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new HttpError(body?.error ?? `Request failed (${res.status}).`, res.status);
  return body as ScrobblePage;
}

/** Retries rate limits and transient Last.fm failures with exponential backoff. */
async function fetchPageWithRetry(
  user: string,
  page: number,
  from: number | undefined,
  signal: AbortSignal,
): Promise<ScrobblePage> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchPage(user, page, from, signal);
    } catch (e) {
      const retryable = e instanceof HttpError && (e.status === 429 || e.status >= 500);
      if (!retryable || attempt >= MAX_RETRIES || signal.aborted) throw e;
      await sleep(RETRY_BASE_MS * 2 ** attempt);
    }
  }
}

export async function fetchAllScrobbles(
  user: string,
  from: number | undefined,
  onProgress: ProgressCallback,
  signal?: AbortSignal,
): Promise<Scrobble[]> {
  const controller = new AbortController();
  signal?.addEventListener("abort", () => controller.abort());

  const first = await fetchPageWithRetry(user, 1, from, controller.signal);
  const total = first.totalPages;
  const pages: Scrobble[][] = [first.scrobbles];
  let completed = Math.min(1, total);
  onProgress(completed, total);

  const inflight = new Set<Promise<void>>();
  let failure: unknown;

  for (let page = 2; page <= total && !failure; page++) {
    while (inflight.size >= MAX_CONCURRENT) await Promise.race(inflight);
    if (failure) break;
    await sleep(LAUNCH_INTERVAL_MS);

    const request: Promise<void> = fetchPageWithRetry(user, page, from, controller.signal)
      .then((result) => {
        pages[page - 1] = result.scrobbles;
        onProgress(++completed, total);
      })
      .catch((e) => {
        failure ??= e;
        controller.abort();
      })
      .finally(() => inflight.delete(request));
    inflight.add(request);
  }
  await Promise.all(inflight);

  if (failure) throw failure;
  return pages.flat();
}
