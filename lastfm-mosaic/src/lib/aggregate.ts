import type { Bucket, Granularity, Scrobble } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Calendar-safe (DST-proof) day arithmetic in local time. */
export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Monday 00:00 local of the week containing `d`. */
export function startOfIsoWeek(d: Date): Date {
  const day = startOfDay(d);
  const sinceMonday = (day.getDay() + 6) % 7;
  return addDays(day, -sinceMonday);
}

/** Start of the bucket containing `d`, in local time. */
export function bucketStart(d: Date, granularity: Granularity): Date {
  switch (granularity) {
    case "days":
      return startOfDay(d);
    case "weeks":
      return startOfIsoWeek(d);
    case "months":
      return new Date(d.getFullYear(), d.getMonth(), 1);
  }
}

/** Bucket key for a bucket start: `YYYY-MM-DD` for days and weeks (Monday), `YYYY-MM` for months. */
export function bucketKey(start: Date, granularity: Granularity): string {
  return granularity === "months"
    ? `${start.getFullYear()}-${pad(start.getMonth() + 1)}`
    : dateKey(start);
}

function nextBucketStart(start: Date, granularity: Granularity): Date {
  switch (granularity) {
    case "days":
      return addDays(start, 1);
    case "weeks":
      return addDays(start, 7);
    case "months":
      return new Date(start.getFullYear(), start.getMonth() + 1, 1);
  }
}

/**
 * Counts scrobbles per local day, ISO week or month between `rangeStart` and `rangeEnd`
 * (inclusive of the buckets containing them). Empty buckets are included with count 0.
 */
export function aggregate(
  scrobbles: Scrobble[],
  granularity: Granularity,
  rangeStart: Date,
  rangeEnd: Date,
): Bucket[] {
  const first = bucketStart(rangeStart, granularity);
  const last = bucketStart(rangeEnd, granularity);

  const buckets: Bucket[] = [];
  const byKey = new Map<string, Bucket>();
  for (let d = first; d <= last; d = nextBucketStart(d, granularity)) {
    const bucket = { key: bucketKey(d, granularity), start: d, count: 0 };
    buckets.push(bucket);
    byKey.set(bucket.key, bucket);
  }

  for (const s of scrobbles) {
    const start = bucketStart(new Date(s.ts * 1000), granularity);
    const bucket = byKey.get(bucketKey(start, granularity));
    if (bucket) bucket.count++;
  }
  return buckets;
}

/**
 * The range a timeline shows (`scrobbles` must be non-empty). Months span the first to the last
 * scrobble; days and weeks run from the time frame's start (or the first scrobble) up to `now`.
 */
export function displayRange(
  scrobbles: Scrobble[],
  granularity: Granularity,
  from: number | undefined,
  now: Date,
): [Date, Date] {
  let earliest = Infinity;
  let latest = -Infinity;
  for (const s of scrobbles) {
    if (s.ts < earliest) earliest = s.ts;
    if (s.ts > latest) latest = s.ts;
  }
  if (granularity === "months") return [new Date(earliest * 1000), new Date(latest * 1000)];
  return [new Date((from ?? earliest) * 1000), now];
}
