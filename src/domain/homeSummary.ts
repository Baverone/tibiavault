// O que o Início mostra: a XP do último dia e a da semana de cada boneco, e a
// série dos dois lado a lado para o gráfico. Funções puras, sem React.
// Os `.ts` no fim dos imports não são engano: este módulo é importado por um
// `.test.ts` que corre no `node --test` com type stripping, sem passo de build
// — e o Node exige a extensão. O Vite resolve-a na mesma. Mesma razão por que
// os testes escrevem `./homeSummary.ts`.
import { levelForExperience } from './experienceTable.ts';
import { computeDailyGains } from './historyStats.ts';
import type { HistoryEntry } from './types.ts';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Quantos dias entram na conta da «semana». */
export const WEEK_DAYS = 7;

/**
 * Passados estes dias sem leitura nova, a recolha diária está a falhar.
 *
 * O guildstats publica o dia anterior e um dia perdido recupera-se sozinho na
 * corrida seguinte — daí a folga de três dias. É o mesmo limiar do
 * `scripts/check-history-freshness.mjs`; se um lado mudar, o outro também.
 */
export const STALE_AFTER_DAYS = 3;

/** «hoje» / «há 1 dia» / «há 4 dias». */
export function agoText(days: number): string {
  if (days <= 0) return 'hoje';
  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
}

export interface CharacterSummary {
  /** O nível calculado a partir da XP mais recente. `null` sem histórico. */
  level: number | null;
  experience: number | null;
  /** Meia-noite local do dia mais recente com ganho, em ms. */
  lastDay: number | null;
  /** XP feita nesse dia. `null` quando só há uma leitura (não há com que comparar). */
  lastDayGain: number | null;
  /** Soma dos ganhos dos últimos `WEEK_DAYS` dias, ancorada ao dia mais recente. */
  weekGain: number | null;
  /** Quantos dias com leitura entraram na soma da semana. */
  weekDays: number;
  /** Há quantos dias é a leitura mais recente. É o que dispara o aviso de dados velhos. */
  daysSinceLastReading: number | null;
}

/**
 * O resumo de um boneco.
 *
 * A janela da semana é ancorada ao DIA MAIS RECENTE e não a «hoje», como já
 * acontece no gráfico: se a recolha falhar dois dias, «a semana» continua a
 * somar sete dias de dados em vez de encolher para cinco. Quantos dias
 * entraram mesmo vai no `weekDays`, para a página o poder dizer.
 */
export function summarizeCharacter(history: HistoryEntry[], now: number): CharacterSummary {
  const last = history.at(-1) ?? null;
  const days = computeDailyGains(history);
  const lastDayEntry = days.at(-1) ?? null;

  const from = lastDayEntry ? lastDayEntry.dayTimestamp - (WEEK_DAYS - 1) * MS_PER_DAY : 0;
  const week = lastDayEntry ? days.filter((day) => day.dayTimestamp >= from) : [];

  return {
    level: last ? levelForExperience(last.experience) : null,
    experience: last?.experience ?? null,
    lastDay: lastDayEntry?.dayTimestamp ?? null,
    lastDayGain: lastDayEntry?.experienceGained ?? null,
    weekGain: week.length > 0 ? week.reduce((total, day) => total + day.experienceGained, 0) : null,
    weekDays: week.length,
    daysSinceLastReading: last ? calendarDaysSince(last.timestamp, now) : null,
  };
}

// Os timestamps do histórico são o meio-dia UTC da data da linha
// (storage/sharedHistory.ts): lidos em UTC dão sempre o dia certo.
const readingDay = new Intl.DateTimeFormat('pt-PT', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });
const isoDayUtc = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' });
const isoDayLisbon = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' });

/**
 * Quantos dias de calendário vão do dia da leitura a «hoje» em Lisboa.
 *
 * 20/10/2026: era `(now - timestamp) / 24h`, e o meio-dia UTC inventado do
 * timestamp entrava na conta — às 09:00 de 20/10 uma leitura de 19/10 dava
 * «hoje». Conta-se como o `scripts/check-history-freshness.mjs`: a data da
 * linha contra a data de hoje em Europe/Lisbon, sem horas.
 */
export function calendarDaysSince(timestamp: number, now: number): number {
  const reading = Date.parse(`${isoDayUtc.format(timestamp)}T00:00:00Z`);
  const today = Date.parse(`${isoDayLisbon.format(now)}T00:00:00Z`);
  return Math.round((today - reading) / MS_PER_DAY);
}

/**
 * O pedaço de um boneco no cabeçalho do Início («O que a XP diz hoje …»).
 *
 * 20/10/2026: dizia «Bluey The Cat no nível 600» com a última leitura a 13/10
 * — um dado de há uma semana apresentado como de hoje. Uma leitura velha
 * (o mesmo limiar do aviso, `STALE_AFTER_DAYS`) leva a data com ela.
 */
export function levelHeadline(name: string, history: HistoryEntry[], now: number): string {
  const summary = summarizeCharacter(history, now);
  const last = history.at(-1);
  if (summary.level === null || !last) return `${name} ainda sem dados`;
  const base = `${name} no nível ${summary.level}`;
  if ((summary.daysSinceLastReading ?? 0) < STALE_AFTER_DAYS) return base;
  return `${base} (última leitura a ${readingDay.format(last.timestamp)})`;
}

/**
 * A nota ao lado do Nível na página do boneco: «última leitura a 13/10 (há 7
 * dias)», ou «sem leituras» quando não há nenhuma que se possa datar.
 *
 * 20/10/2026: só dizia «última leitura há N dias», e só quando havia dois dias
 * para comparar — com uma leitura só, a nota ficava em branco. Vai só o dia e
 * nunca a hora: o guildstats dá precisão ao dia e o meio-dia UTC do timestamp
 * é inventado por nós (storage/sharedHistory.ts). Uma linha sem data (timestamp
 * `NaN`, um ficheiro antigo ou estragado) não conta como leitura — o
 * `Intl.DateTimeFormat` rebentava com ela.
 */
export function lastReadingNote(history: HistoryEntry[], now: number): string {
  const last = history.findLast((entry) => Number.isFinite(entry.timestamp));
  if (!last) return 'sem leituras';
  return `última leitura a ${readingDay.format(last.timestamp)} (${agoText(calendarDaysSince(last.timestamp, now))})`;
}

export interface CombinedDailyPoint {
  /** Meia-noite local do dia, em ms. */
  dayTimestamp: number;
  /** XP feita nesse dia, por id de personagem. Um dia sem leitura não tem chave. */
  gains: Record<string, number>;
}

/**
 * Os ganhos diários dos vários bonecos na mesma série, para o gráfico do Início.
 *
 * A janela é ancorada ao dia mais recente de QUALQUER um deles — se um estiver
 * dois dias atrás do outro, as barras continuam a alinhar-se pelo calendário em
 * vez de cada um trazer a sua janela.
 */
export function combineDailyGains(
  histories: Record<string, HistoryEntry[] | undefined>,
  days: number
): CombinedDailyPoint[] {
  const byDay = new Map<number, Record<string, number>>();
  let newest = 0;

  for (const [id, history] of Object.entries(histories)) {
    for (const day of computeDailyGains(history ?? [])) {
      if (day.dayTimestamp > newest) newest = day.dayTimestamp;
      const row = byDay.get(day.dayTimestamp) ?? {};
      row[id] = day.experienceGained;
      byDay.set(day.dayTimestamp, row);
    }
  }

  const from = newest - (days - 1) * MS_PER_DAY;
  return [...byDay.entries()]
    .filter(([dayTimestamp]) => dayTimestamp >= from)
    .sort((a, b) => a[0] - b[0])
    .map(([dayTimestamp, gains]) => ({ dayTimestamp, gains }));
}
