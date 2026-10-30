import { TIME_FRAMES } from "./timeframe";
import type { TimeFrame } from "./types";

/** The fetch-time inputs last used successfully; restored on reload. */
export interface Session {
  user: string;
  timeFrame: TimeFrame;
}

const KEY = "lastfm-mosaic:session";

/** The stored session, or null when there is none or it is unusable. Never throws. */
export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return null;
    const { user, timeFrame } = data as Record<string, unknown>;
    if (typeof user !== "string" || !user.trim()) return null;
    const match = TIME_FRAMES.find((t) => t === timeFrame);
    return match ? { user: user.trim(), timeFrame: match } : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Remembering the session is best-effort.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear without localStorage.
  }
}
