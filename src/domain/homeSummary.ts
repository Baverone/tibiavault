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
    daysSinceLastReading: last ? Math.floor((now - last.timestamp) / MS_PER_DAY) : null,
  };
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
