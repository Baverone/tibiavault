import { addDaysToKey, zonedTimeToInstant } from '../tibiaDay.ts';

/** Nominal length (14 days). The real one is an hour shorter or longer when a DST change falls inside. */
export const ROTATION_DURATION_MS = 14 * 24 * 60 * 60 * 1000;
const ROTATION_DAYS = 14;

/** Display timezone for all rotation dates — handles WEST/WET DST transitions automatically. */
export const TIBIADROME_TIMEZONE = 'Europe/Lisbon';

export interface RotationAnchor {
  /** The rotation number active at `startAt`. */
  number: number;
  /** ISO datetime with explicit UTC offset, e.g. "2026-07-03T10:00:00+01:00". */
  startAt: string;
}

export interface RotationState {
  number: number;
  startAt: number;
  endAt: number;
}

/**
 * Rotations change at a server save, which follows the Berlin wall clock
 * (10:00 CET/CEST = 09:00 Lisbon). So each rotation starts 14 CALENDAR days
 * after the previous one at the same Berlin time — not 14 × 24h later.
 *
 * 20/10/2026: it used to be anchor + N × 14 × 24h. The anchor is a summer
 * save, and the rotation ending on 28/10 (three days after the clocks go back)
 * showed «acaba a 28/10/2026, 08:00» instead of 09:00.
 */
const BERLIN = 'Europe/Berlin';

const berlinParts = new Intl.DateTimeFormat('en-US', {
  timeZone: BERLIN,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function anchorWallClock(anchorStart: number) {
  const p: Record<string, number> = {};
  for (const part of berlinParts.formatToParts(new Date(anchorStart))) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  const dateKey = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  return { dateKey, hour: p.hour, minute: p.minute };
}

/**
 * Derives the currently active rotation purely from the one-time anchor and
 * the current time — no mutable state to keep in sync. Each rotation chains
 * immediately from the one before it.
 */
export function computeRotationState(anchor: RotationAnchor, now: number): RotationState {
  const anchorStart = new Date(anchor.startAt).getTime();
  const wall = anchorWallClock(anchorStart);
  const startOf = (period: number) => {
    const [y, m, d] = addDaysToKey(wall.dateKey, period * ROTATION_DAYS).split('-').map(Number);
    return zonedTimeToInstant(BERLIN, y, m, d, wall.hour, wall.minute);
  };

  // The nominal guess is off by at most an hour; correct it at the edges.
  let period = Math.floor((now - anchorStart) / ROTATION_DURATION_MS);
  while (startOf(period) > now) period--;
  while (startOf(period + 1) <= now) period++;

  return { number: anchor.number + period, startAt: startOf(period), endAt: startOf(period + 1) };
}

/** Formats a non-negative duration as "Xd HH:MM:SS" (omits the day segment when zero). */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = [hours, minutes, seconds].map((n) => n.toString().padStart(2, '0')).join(':');
  return days > 0 ? `${days}d ${clock}` : clock;
}

const dateFormatter = new Intl.DateTimeFormat('pt-PT', {
  timeZone: TIBIADROME_TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatRotationDate(epochMs: number): string {
  return dateFormatter.format(new Date(epochMs));
}
