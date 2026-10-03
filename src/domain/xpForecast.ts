import { experienceForLevel, levelForExperience } from './experienceTable.ts';
import type { HistoryEntry } from './types.ts';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Horizontes oferecidos por omissão. Qualquer número serve — estes são só os atalhos. */
export const FORECAST_HORIZONS = [7, 30, 60, 90] as const;

export const DEFAULT_HORIZON_DAYS = 7;

export interface XpRate {
  /** XP média por dia na janela. Pode ser negativa (mortes a comer mais do que se ganha). */
  averageDailyXp: number;
  /** XP líquida ganha na janela (última leitura − primeira leitura da janela). */
  totalXpGained: number;
  /** Janela pedida, em dias. */
  windowDays: number;
  /** Dias realmente cobertos entre a primeira e a última leitura usadas. */
  daysCovered: number;
  /** Quantas leituras caíram dentro da janela. */
  readingsUsed: number;
  firstEntry: HistoryEntry;
  lastEntry: HistoryEntry;
}

/**
 * XP média por dia nos últimos `windowDays` dias de histórico.
 *
 * A janela é ancorada à leitura mais recente e não a "agora", para que um ou
 * dois dias sem recolha não encolham a estimativa — o denominador é o tempo
 * entre leituras reais, não o calendário.
 *
 * Devolve null quando não há pelo menos duas leituras a cobrir tempo positivo
 * dentro da janela: aí não há nada de que extrapolar, e inventar um número era
 * pior do que dizer que não se sabe.
 */
export function computeRateOverWindow(history: HistoryEntry[], windowDays: number): XpRate | null {
  if (history.length < 2 || !Number.isFinite(windowDays) || windowDays <= 0) return null;

  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
  const last = sorted[sorted.length - 1];
  const windowStart = last.timestamp - windowDays * MS_PER_DAY;
  const inWindow = sorted.filter((entry) => entry.timestamp >= windowStart);

  if (inWindow.length < 2) return null;

  const first = inWindow[0];
  const spanMs = last.timestamp - first.timestamp;
  if (spanMs <= 0) return null;

  const daysCovered = spanMs / MS_PER_DAY;
  const totalXpGained = last.experience - first.experience;

  return {
    averageDailyXp: totalXpGained / daysCovered,
    totalXpGained,
    windowDays,
    daysCovered,
    readingsUsed: inWindow.length,
    firstEntry: first,
    lastEntry: last,
  };
}

export interface HorizonProjection {
  /** Dias projetados para a frente — igual à janela usada para trás. */
  days: number;
  date: Date;
  experience: number;
  level: number;
  /** Níveis ganhos entre agora e essa data. Pode ser 0. */
  levelsGained: number;
}

/**
 * Onde estarás daqui a `days` dias, ao ritmo médio dos MESMOS `days` dias
 * para trás — a janela é simétrica de propósito.
 *
 * Uma previsão a 60 dias feita com a média dos últimos 7 herda o que quer que
 * tenha acontecido nessa semana (férias, um boost, uma semana parado) e
 * multiplica-o por oito. Olhar para trás exatamente o mesmo tanto que se olha
 * para a frente é o que faz uma previsão longa ser lenta a mudar de ideias,
 * como deve ser, e uma previsão curta reagir depressa.
 *
 * A XP tem chão em 0 para que um ritmo negativo não a faça mergulhar abaixo do
 * nível 1.
 */
export function projectAtHorizon(
  currentExperience: number,
  rate: XpRate,
  from: Date = new Date()
): HorizonProjection {
  const days = rate.windowDays;
  const experience = Math.max(0, currentExperience + rate.averageDailyXp * days);
  const level = levelForExperience(experience);

  return {
    days,
    date: new Date(from.getTime() + days * MS_PER_DAY),
    experience,
    level,
    levelsGained: level - levelForExperience(currentExperience),
  };
}

export interface LevelForecast {
  level: number;
  /** XP que ainda falta para lá chegar, a partir da XP atual. */
  experienceNeeded: number;
  daysToReach: number;
  estimatedDate: Date;
}

/**
 * Data estimada para cada um dos próximos `count` níveis, ao ritmo dado.
 * Lista vazia para um ritmo nulo ou negativo — não há projeção para cima a
 * partir de uma tendência plana.
 */
export function forecastNextLevels(
  currentExperience: number,
  averageDailyXp: number,
  count: number = 5,
  from: Date = new Date()
): LevelForecast[] {
  if (!Number.isFinite(averageDailyXp) || averageDailyXp <= 0) return [];

  const currentLevel = levelForExperience(currentExperience);
  const forecasts: LevelForecast[] = [];

  for (let i = 1; i <= count; i++) {
    const level = currentLevel + i;
    const experienceNeeded = experienceForLevel(level) - currentExperience;
    const daysToReach = experienceNeeded / averageDailyXp;

    forecasts.push({
      level,
      experienceNeeded,
      daysToReach,
      estimatedDate: new Date(from.getTime() + daysToReach * MS_PER_DAY),
    });
  }

  return forecasts;
}
