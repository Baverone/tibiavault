// Extensão explícita: o `homeSummary.test.ts` chega aqui pelo `node --test`,
// que corre com o `tsconfig.node.json` (`moduleResolution: nodenext`).
import type { HistoryEntry } from './types.ts';

export interface ExperienceGain {
  from: HistoryEntry;
  to: HistoryEntry;
  experienceGained: number;
  hoursElapsed: number;
  experiencePerHour: number;
}

/**
 * Turns a chronological list of XP readings into gain-per-interval stats.
 * Useful for "XP gained since last check" today, and feeds directly into a
 * future hunt-rate estimator (avg exp/h over the last N readings).
 */
export function computeExperienceGains(history: HistoryEntry[]): ExperienceGain[] {
  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
  const gains: ExperienceGain[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const from = sorted[i - 1];
    const to = sorted[i];
    const experienceGained = to.experience - from.experience;
    const hoursElapsed = (to.timestamp - from.timestamp) / (1000 * 60 * 60);
    const experiencePerHour = hoursElapsed > 0 ? experienceGained / hoursElapsed : 0;

    gains.push({ from, to, experienceGained, hoursElapsed, experiencePerHour });
  }

  return gains;
}

export interface DailyExperienceGain {
  /** Local midnight (ms) of the calendar day this gain is attributed to. */
  dayTimestamp: number;
  /** Cumulative XP at the end of this day (its last reading). */
  experience: number;
  /** XP gained versus the day before, which must have a reading too. */
  experienceGained: number;
}

/**
 * Meia-noite local `days` dias de calendário depois (ou antes) de outra.
 *
 * 22/10/2026: somar `n * 24h` a uma meia-noite local perde-se na mudança de
 * hora — a 25/10 o dia tem 25 h e a semana do Início ficava com seis dias. O
 * `Date` com o dia do mês deslocado conta dias de calendário.
 */
export function addLocalDays(dayTimestamp: number, days: number): number {
  const d = new Date(dayTimestamp);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime();
}

function localDayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function localMidnight(timestamp: number): number {
  const d = new Date(timestamp);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

interface DayReading {
  /** Local midnight (ms) of the calendar day. */
  dayTimestamp: number;
  /** Cumulative XP at the end of that day (its last reading). */
  experience: number;
}

/**
 * Collapses history to one cumulative-XP reading per calendar day — the last
 * reading of each day, so a day where a manual entry and the guildstats scrape
 * coexist counts once. Ascending by day.
 */
function collapseToDays(history: HistoryEntry[]): DayReading[] {
  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
  const byDay = new Map<string, DayReading>();
  for (const entry of sorted) {
    byDay.set(localDayKey(entry.timestamp), {
      dayTimestamp: localMidnight(entry.timestamp),
      experience: entry.experience,
    });
  }
  return [...byDay.values()].sort((a, b) => a.dayTimestamp - b.dayTimestamp);
}

/**
 * Day-over-day XP gained (the "XP feita por dia" series). The first day has no
 * previous day to compare against, so it is omitted (same convention as
 * computeExperienceGains). Gains can be negative (XP lost to deaths).
 *
 * 22/10/2026: o dia a seguir a um buraco também fica de fora. Comparava com o
 * último dia com leitura, fosse ele qual fosse, e a XP de dois dias saía como
 * a de um só — no gráfico («XP nesse dia») e na média da semana do Início.
 */
export function computeDailyGains(history: HistoryEntry[]): DailyExperienceGain[] {
  const days = collapseToDays(history);
  const gains: DailyExperienceGain[] = [];
  for (let i = 1; i < days.length; i++) {
    if (days[i].dayTimestamp !== addLocalDays(days[i - 1].dayTimestamp, 1)) continue;
    gains.push({
      dayTimestamp: days[i].dayTimestamp,
      experience: days[i].experience,
      experienceGained: days[i].experience - days[i - 1].experience,
    });
  }
  return gains;
}
