import { NextRequest, NextResponse } from "next/server";
import type { Scrobble, ScrobblePage } from "@/lib/types";

const LASTFM_URL = "https://ws.audioscrobbler.com/2.0/";
const PAGE_SIZE = 1000;

interface LastfmTrack {
  name: string;
  artist: { "#text": string };
  album: { "#text": string };
  date?: { uts: string };
  "@attr"?: { nowplaying?: string };
}

interface LastfmResponse {
  error?: number;
  message?: string;
  recenttracks?: {
    track: LastfmTrack[] | LastfmTrack;
    "@attr": { totalPages: string; page: string };
  };
}

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

function errorFor(code: number, message: string) {
  switch (code) {
    case 6:
      return fail(404, "User not found.");
    case 17:
      return fail(403, "This profile's listening history is private.");
    case 29:
      return fail(429, "Last.fm rate limit exceeded. Try again in a moment.");
    default:
      return fail(502, `Last.fm error: ${message}`);
  }
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) return fail(500, "Server is missing LASTFM_API_KEY.");

  const params = request.nextUrl.searchParams;
  const user = params.get("user")?.trim();
  if (!user) return fail(400, "Missing username.");
  const page = Math.max(1, Number(params.get("page")) || 1);
  const from = Number(params.get("from")) || 0;

  const url = new URL(LASTFM_URL);
  url.search = new URLSearchParams({
    method: "user.getRecentTracks",
    user,
    api_key: apiKey,
    format: "json",
    limit: String(PAGE_SIZE),
    page: String(page),
    ...(from > 0 ? { from: String(from) } : {}),
  }).toString();

  let data: LastfmResponse;
  try {
    const res = await fetch(url, { cache: "no-store" });
    data = (await res.json()) as LastfmResponse;
  } catch {
    return fail(502, "Could not reach Last.fm.");
  }

  if (data.error) return errorFor(data.error, data.message ?? "unknown error");
  if (!data.recenttracks) return fail(502, "Unexpected response from Last.fm.");

  const raw = data.recenttracks.track;
  const tracks = Array.isArray(raw) ? raw : [raw];
  const scrobbles: Scrobble[] = tracks
    .filter((t) => t.date && t["@attr"]?.nowplaying !== "true")
    .map((t) => ({
      ts: Number(t.date!.uts),
      artist: t.artist["#text"],
      track: t.name,
      album: t.album["#text"],
    }));

  const body: ScrobblePage = {
    scrobbles,
    page: Number(data.recenttracks["@attr"].page),
    totalPages: Number(data.recenttracks["@attr"].totalPages),
  };
  return NextResponse.json(body);
}
