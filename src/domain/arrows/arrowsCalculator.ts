// Pure arithmetic for the Arrows utility: a reverse calculator (arrows/minute
// from a total used over a hunt) plus a fixed reference table of totals for
// a few common arrow rates.

export const ARROW_RATES = [25, 26, 27, 28] as const;
export type ArrowRate = (typeof ARROW_RATES)[number];

export const MAX_TABLE_MINUTES = 30;

export interface ArrowRateTableRow {
  minute: number;
  totals: Record<ArrowRate, number>;
}

/** Static reference table: rows for minute 1..30, one column per ARROW_RATES entry (minute * rate). */
export function buildArrowRateTable(): ArrowRateTableRow[] {
  const rows: ArrowRateTableRow[] = [];
  for (let minute = 1; minute <= MAX_TABLE_MINUTES; minute++) {
    const totals = {} as Record<ArrowRate, number>;
    for (const rate of ARROW_RATES) totals[rate] = minute * rate;
    rows.push({ minute, totals });
  }
  return rows;
}

/** Arrows used per minute, rounded to 2 decimals. null when inputs are missing/invalid or minutes <= 0 (guards NaN/Infinity). */
export function calculateArrowsPerMinute(arrows: number, minutes: number): number | null {
  if (!Number.isFinite(arrows) || !Number.isFinite(minutes) || arrows < 0 || minutes <= 0) return null;
  return Math.round((arrows / minutes) * 100) / 100;
}

const rateFormatter = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 });

/**
 * O consumo como se escreve em português: «26,56».
 *
 * 25/10/2026: a página mostrava o número do JavaScript a direito («26.56»),
 * com ponto decimal no meio de uma app que escreve tudo o resto com vírgula.
 */
export function formatArrowRate(rate: number): string {
  return rateFormatter.format(rate);
}

/** Which table row (1..30) is numerically closest to a given minutes value, for highlighting. */
export function closestTableMinute(minutes: number): number | null {
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return Math.min(MAX_TABLE_MINUTES, Math.max(1, Math.round(minutes)));
}

/** Which of ARROW_RATES is numerically closest to a computed rate, for highlighting. */
export function closestArrowRate(rate: number): ArrowRate {
  return ARROW_RATES.reduce((closest, candidate) => (Math.abs(candidate - rate) < Math.abs(closest - rate) ? candidate : closest));
}
