// O histórico dos skills (20/11/2026). Pedido do André: «que eles fiquem
// gravados, com isto, podemos avaliar o progresso de evolução dos Skills ao
// longo do tempo e até quando há os eventos». As leituras vivem no
// repositório, em data/skills-history/<personagem>.json; aqui só há contas
// puras, sem rede nem React. Desenho: docs/superpowers/specs/2026-11-20-historico-skills-design.md
import type { TrainableSkill } from './skillTraining.ts';
import type { SkillTrainingConfig } from '../storage/skillTrainingStorage.ts';
import { parseNonNegativeInteger, parsePercentMissing } from './validation.ts';

export interface SkillValue {
  level: number;
  /** % que falta para o nível seguinte, como o jogo mostra. */
  percentMissing: number;
}

export interface SkillReading {
  /** Unix epoch ms. */
  timestamp: number;
  loyaltyBonusPercent: number;
  skills: Partial<Record<TrainableSkill, SkillValue>>;
}

/** Um evento marcado pelo André; datas `YYYY-MM-DD`, o fim conta inteiro. */
export interface SkillEvent {
  id: string;
  name: string;
  start: string;
  end: string;
}

export interface SeriesPoint {
  timestamp: number;
  value: number;
}

const SKILLS: readonly TrainableSkill[] = ['magic', 'axe', 'sword', 'club', 'distance', 'shielding', 'fist'];
const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Duas leituras mais perto do que isto não dão ritmo: dividia-se por quase nada. */
const MIN_SPAN_MS = 60 * 60 * 1000;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeValue(value: unknown): SkillValue | null {
  if (!isObject(value)) return null;
  const { level, percentMissing } = value;
  if (typeof level !== 'number' || !Number.isInteger(level) || level < 0 || level > 500) return null;
  if (typeof percentMissing !== 'number' || !Number.isFinite(percentMissing) || percentMissing < 0 || percentMissing > 100)
    return null;
  return { level, percentMissing };
}

function validLoyalty(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 50 && value % 5 === 0 ? value : 0;
}

/**
 * Só aproveita as leituras com a forma certa. O ficheiro é escrito pelo
 * browser, mas também se pode mexer à mão no GitHub: uma linha estragada não
 * pode deitar a página abaixo.
 */
export function sanitizeReadings(raw: unknown): SkillReading[] {
  if (!Array.isArray(raw)) return [];
  const readings: SkillReading[] = [];
  for (const item of raw) {
    if (!isObject(item) || typeof item.timestamp !== 'number' || !Number.isFinite(item.timestamp)) continue;
    const skills: SkillReading['skills'] = {};
    if (isObject(item.skills)) {
      for (const skill of SKILLS) {
        const value = sanitizeValue(item.skills[skill]);
        if (value) skills[skill] = value;
      }
    }
    if (Object.keys(skills).length === 0) continue;
    readings.push({ timestamp: item.timestamp, loyaltyBonusPercent: validLoyalty(item.loyaltyBonusPercent), skills });
  }
  return readings.sort((a, b) => a.timestamp - b.timestamp);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizeEvents(raw: unknown): SkillEvent[] {
  if (!Array.isArray(raw)) return [];
  const events: SkillEvent[] = [];
  for (const item of raw) {
    if (!isObject(item)) continue;
    const { id, name, start, end } = item;
    if (typeof id !== 'string' || typeof name !== 'string' || name.trim() === '') continue;
    if (typeof start !== 'string' || typeof end !== 'string' || !DATE_RE.test(start) || !DATE_RE.test(end)) continue;
    if (end < start) continue;
    events.push({ id, name: name.trim(), start, end });
  }
  return events.sort((a, b) => a.start.localeCompare(b.start));
}

/** A leitura que o botão «Gravar» manda: só as skills da vocação com valores válidos. */
export function readingFromConfig(config: SkillTrainingConfig, skills: TrainableSkill[], now: number): SkillReading | null {
  const values: SkillReading['skills'] = {};
  for (const skill of skills) {
    const entry = config.skills[skill];
    if (!entry) continue;
    const level = parseNonNegativeInteger(entry.level, 'o nível');
    const percent = parsePercentMissing(entry.percent);
    if (!level.ok || !percent.ok) continue;
    const value = sanitizeValue({ level: level.value, percentMissing: percent.value });
    if (value) values[skill] = value;
  }
  if (Object.keys(values).length === 0) return null;
  return { timestamp: now, loyaltyBonusPercent: config.loyaltyBonusPercent, skills: values };
}

/** O nível com a parte feita: 80 com 25 % a faltar é 80,75. */
export function fractionalLevel(level: number, percentMissing: number): number {
  return level + (100 - percentMissing) / 100;
}

export function skillSeries(readings: SkillReading[], skill: TrainableSkill): SeriesPoint[] {
  const series: SeriesPoint[] = [];
  for (const reading of readings) {
    const value = reading.skills[skill];
    if (value) series.push({ timestamp: reading.timestamp, value: fractionalLevel(value.level, value.percentMissing) });
  }
  return series;
}

/** Níveis por dia, da primeira à última leitura; null sem duas leituras afastadas. */
export function ratePerDay(series: SeriesPoint[]): number | null {
  if (series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const span = last.timestamp - first.timestamp;
  if (span < MIN_SPAN_MS) return null;
  return (last.value - first.value) / (span / MS_PER_DAY);
}

/** [início, fim) de um evento em ms, na hora local do aparelho: o fim conta o dia inteiro. */
export function eventRange(event: SkillEvent): [number, number] {
  const [ys, ms, ds] = event.start.split('-').map(Number);
  const [ye, me, de] = event.end.split('-').map(Number);
  return [new Date(ys, ms - 1, ds).getTime(), new Date(ye, me - 1, de + 1).getTime()];
}

/**
 * Ritmo por dia dentro e fora dos eventos. Cada par de leituras seguidas é um
 * intervalo: conta para «dentro» se cabe todo num evento, para «fora» se não
 * toca em nenhum, e não conta se atravessa a fronteira — aí não se sabe que
 * parte da subida foi do evento.
 */
export function rateInsideOutsideEvents(
  series: SeriesPoint[],
  events: SkillEvent[]
): { inside: number | null; outside: number | null } {
  const ranges = events.map(eventRange);
  const sums = { inside: { gain: 0, ms: 0 }, outside: { gain: 0, ms: 0 } };
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1];
    const b = series[i];
    if (b.timestamp <= a.timestamp) continue;
    const inside = ranges.some(([s, e]) => a.timestamp >= s && b.timestamp <= e);
    const touches = ranges.some(([s, e]) => a.timestamp < e && b.timestamp > s);
    const bucket = inside ? sums.inside : touches ? null : sums.outside;
    if (!bucket) continue;
    bucket.gain += b.value - a.value;
    bucket.ms += b.timestamp - a.timestamp;
  }
  const rate = ({ gain, ms }: { gain: number; ms: number }) => (ms >= MIN_SPAN_MS ? gain / (ms / MS_PER_DAY) : null);
  return { inside: rate(sums.inside), outside: rate(sums.outside) };
}
