// Stamina math, from TibiaWiki (https://www.tibiawiki.com.br/wiki/Stamina),
// cross-checked against the official Tibia rules and TibiaPal:
//  - Full stamina is 42:00 (42 hours).
//  - Offline regeneration: 3 minutes offline give 1 minute of stamina up to
//    39:00; from 39:00 to 42:00 it takes 6 minutes offline per 1 minute of
//    stamina. Regeneration only starts after 10 continuous minutes offline
//    (so 39:00 -> 42:00 takes 18h10m, matching the wiki).
//  - Hunting drains stamina 1:1 (1 minute of stamina per minute spent gaining
//    XP from kills).
//  - XP by range: 39:00-42:00 = +50% (green bonus, Premium only); 14:00-39:00
//    = 100%; below 14:00 = 50%; 0:00 = 0%.

export const MAX_STAMINA_MIN = 42 * 60; // 2520
export const GREEN_START_MIN = 39 * 60; // 2340 — slower regen AND XP bonus above here
export const PENALTY_MIN = 14 * 60; // 840 — below here XP is halved
export const OFFLINE_DELAY_MIN = 10; // no regen for the first 10 min offline

const OFFLINE_PER_STAMINA_FAST = 3; // below 39h: 3 min offline per 1 stamina min
const OFFLINE_PER_STAMINA_SLOW = 6; // 39h–42h: 6 min offline per 1 stamina min

/** Stamina (minutes) after being logged off for `offlineMin`, starting from `currentMin`. Capped at 42h. */
export function regenerateStamina(currentMin: number, offlineMin: number): number {
  let stamina = Math.min(currentMin, MAX_STAMINA_MIN);
  let effective = offlineMin - OFFLINE_DELAY_MIN;
  if (effective <= 0) return stamina;

  // Fast zone: up to 39h.
  if (stamina < GREEN_START_MIN) {
    const offlineForFast = (GREEN_START_MIN - stamina) * OFFLINE_PER_STAMINA_FAST;
    if (effective <= offlineForFast) return stamina + effective / OFFLINE_PER_STAMINA_FAST;
    stamina = GREEN_START_MIN;
    effective -= offlineForFast;
  }

  // Slow zone: 39h–42h.
  if (stamina < MAX_STAMINA_MIN) {
    const offlineForSlow = (MAX_STAMINA_MIN - stamina) * OFFLINE_PER_STAMINA_SLOW;
    if (effective <= offlineForSlow) return stamina + effective / OFFLINE_PER_STAMINA_SLOW;
  }

  return MAX_STAMINA_MIN;
}

/** Offline minutes needed to go from `currentMin` up to `targetMin` (includes the 10-min delay). null when already reached or above max. */
export function offlineMinutesToReach(currentMin: number, targetMin: number): number | null {
  const target = Math.min(targetMin, MAX_STAMINA_MIN);
  if (target <= currentMin) return null;

  let offline = OFFLINE_DELAY_MIN;
  if (currentMin < GREEN_START_MIN) {
    offline += (Math.min(target, GREEN_START_MIN) - currentMin) * OFFLINE_PER_STAMINA_FAST;
  }
  if (target > GREEN_START_MIN) {
    offline += (target - Math.max(currentMin, GREEN_START_MIN)) * OFFLINE_PER_STAMINA_SLOW;
  }
  return offline;
}

/** Stamina (minutes) left after hunting for `huntMin` minutes (drains 1:1), floored at 0. */
export function depleteStamina(currentMin: number, huntMin: number): number {
  return Math.max(0, Math.min(currentMin, MAX_STAMINA_MIN) - huntMin);
}

export interface StaminaZone {
  label: string;
  xp: string;
}

/** Which XP zone a stamina level falls in. */
export function staminaZone(minutes: number): StaminaZone {
  if (minutes >= GREEN_START_MIN) return { label: 'verde (bónus)', xp: '150%' };
  if (minutes >= PENALTY_MIN) return { label: 'normal', xp: '100%' };
  if (minutes > 0) return { label: 'baixa', xp: '50%' };
  return { label: 'esgotada', xp: '0%' };
}

/**
 * "39:30", "39", "39.5" ou "39,5" em minutos; null se não for nenhum destes.
 *
 * 11/11/2026 (auditoria com o Codex): o `split(':')` aceitava "39:30:99" (como
 * 39:30), ":" (como 0) e "39:" (como 39:00), e "1e308" dava minutos infinitos.
 * Agora o formato inteiro tem de bater certo e o resultado tem de ser finito.
 */
function parseHoursToMinutes(trimmed: string): number | null {
  const colon = /^(\d+):(\d{1,2})$/.exec(trimmed);
  if (colon) {
    const mins = Number(colon[2]);
    if (mins >= 60) return null;
    const total = Number(colon[1]) * 60 + mins;
    return Number.isFinite(total) ? total : null;
  }
  if (!/^\d+(?:[.,]\d+)?$/.test(trimmed)) return null;
  const minutes = Number(trimmed.replace(',', '.')) * 60;
  return Number.isFinite(minutes) ? minutes : null;
}

/** Parses "39:30", "39", "39.5" or "39,5" (hours[:minutes] or decimal hours) into minutes. null if invalid or outside 0–42h. */
export function parseStaminaToMinutes(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const minutes = parseHoursToMinutes(trimmed);
  if (minutes === null) return null;

  if (minutes < 0 || minutes > MAX_STAMINA_MIN) return null;
  return minutes;
}

/** Parses a hunt duration: "3", "3.5", "3,5" or "3:30" into minutes. null if invalid or ≤ 0. */
export function parseDurationToMinutes(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const minutes = parseHoursToMinutes(trimmed);
  return minutes !== null && minutes > 0 ? minutes : null;
}

/** Formats minutes as "HH:MM" (in-game stamina style), clamped to 0–42h. */
export function formatStamina(minutes: number): string {
  const clamped = Math.max(0, Math.min(MAX_STAMINA_MIN, minutes));
  let h = Math.floor(clamped / 60);
  let m = Math.round(clamped - h * 60);
  if (m === 60) {
    h += 1;
    m = 0;
  }
  return `${h}:${String(m).padStart(2, '0')}`;
}

/** Formats a duration in minutes as "Xh Ymin" / "Xh" / "Ymin". */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, '0')}min`;
}
