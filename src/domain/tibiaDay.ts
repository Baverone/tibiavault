const LISBON_TIMEZONE = 'Europe/Lisbon';

/**
 * The server save is at 10:00 Berlin time (CET/CEST) — which is 09:00 in
 * Lisbon all year, because both switch DST at the same instant (EU rule).
 *
 * 20/10/2026: the instants used to be built from Lisbon's offset *now*. On the
 * eve of a DST change the next save is already on the other side, and it came
 * out an hour wrong (the Tibiadrome showed «acaba a 28/10/2026, 08:00»). Every
 * save instant is now built from the Berlin wall clock of its own day.
 */
const SERVER_SAVE_TIMEZONE = 'Europe/Berlin';
const SERVER_SAVE_HOUR_BERLIN = 10;

/** The Tibia server save happens at 09:00 Lisbon time — the "Tibia day" only advances after this, not at midnight. */
export const SERVER_SAVE_HOUR = 9;

const formatters = new Map<string, Intl.DateTimeFormat>();

function wallClockParts(timeZone: string, ms: number): Record<string, number> {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(new Date(ms))) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return parts;
}

/** How far ahead of UTC the wall clock of `timeZone` reads at this instant. */
function offsetMs(timeZone: string, ms: number): number {
  const p = wallClockParts(timeZone, ms);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

/**
 * The instant at which the wall clock of `timeZone` reads this date and time.
 * Two passes: the offset is looked up at a first guess and then again at the
 * corrected instant, which is what gets the days of a DST change right.
 */
export function zonedTimeToInstant(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0
): number {
  const asUTC = Date.UTC(year, month - 1, day, hour, minute);
  const first = asUTC - offsetMs(timeZone, asUTC);
  return asUTC - offsetMs(timeZone, first);
}

/** Calendar arithmetic on "YYYY-MM-DD" keys (no time zone involved). */
export function addDaysToKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/** The instant of the server save on this calendar day ("YYYY-MM-DD"). */
export function serverSaveAt(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return zonedTimeToInstant(SERVER_SAVE_TIMEZONE, y, m, d, SERVER_SAVE_HOUR_BERLIN);
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export interface TibiaDayBoundary {
  /** Lisbon calendar date the current "Tibia day" corresponds to, as YYYY-MM-DD. */
  dateKey: string;
  /** 0 = Sunday ... 6 = Saturday, matching JS Date.getDay() convention. */
  weekdayIndex: number;
  /** Epoch ms of the next 09:00 Lisbon server save, when the Tibia day advances. */
  nextChangeAt: number;
}

/**
 * Before 09:00 Lisbon time, the "Tibia day" is still yesterday's — used by
 * both the Rashid Tracker (weekly schedule lookup) and the Mini World
 * Changes Tracker (daily history key), so both agree on what "today" means
 * without duplicating the DST-aware time math.
 */
export function computeTibiaDayBoundary(now: number): TibiaDayBoundary {
  const p = wallClockParts(LISBON_TIMEZONE, now);
  const lisbonDate = `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
  const dateKey = p.hour >= SERVER_SAVE_HOUR ? lisbonDate : addDaysToKey(lisbonDate, -1);
  const [y, m, d] = dateKey.split('-').map(Number);
  const weekdayIndex = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

  // The Tibia day `dateKey` began at that day's save and ends at the next one.
  const nextChangeAt = serverSaveAt(addDaysToKey(dateKey, 1));

  return { dateKey, weekdayIndex, nextChangeAt };
}
