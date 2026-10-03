import { experienceForLevel, levelForExperience } from './experienceTable.ts';

/**
 * Como os bónus de experiência do Tibia se combinam.
 *
 * Não é tudo somado nem tudo multiplicado, e é fácil enganarmo-nos: os bónus
 * somam-se todos sobre a experiência base, MENOS a stamina verde, que
 * multiplica por cima do resultado de todos os outros. É o próprio TibiaWiki
 * que o diz — "the only bonus that works on top of all other bonuses is the
 * Green Stamina 50% boost" — e o exemplo deles confirma:
 *
 *   700 base, evento de dobro + XP Boost  →  700 × (1 + 1.0 + 0.5) = 1750
 *   o mesmo, com stamina verde            →  1750 × 1.5           = 2625
 *
 * A diferença entre este modelo e "somar tudo" só aparece quando há evento de
 * dobro: somando tudo dava ×3.00, e o correto é ×3.75. Vinte e cinco por cento
 * de erro na única altura do ano em que interessa acertar.
 */

/** Stamina verde (40:01–42:00): multiplica por cima de tudo o resto. */
export const MULTIPLICADOR_STAMINA = 1.5;
/** XP Boost da loja: +50% sobre a base, 1 hora de caça cada. */
export const BONUS_BOOST = 0.5;
/** Evento de dobro: +100% sobre a base (não é literalmente o dobro do total). */
export const BONUS_DOBRO = 1;
/** A loja não vende mais do que 5 por server save. */
export const MAX_BOOSTS_POR_DIA = 5;

export interface OpcoesHunt {
  /** Stamina verde (acima das 40h) durante a caça. */
  stamina: boolean;
  /** Evento de dobro de experiência a decorrer. */
  dobro: boolean;
}

/** Multiplicador aplicado à XP bruta numa hora, com ou sem boost ativo. */
export function multiplicador(opcoes: OpcoesHunt, comBoost: boolean): number {
  const somados = 1 + (comBoost ? BONUS_BOOST : 0) + (opcoes.dobro ? BONUS_DOBRO : 0);
  return somados * (opcoes.stamina ? MULTIPLICADOR_STAMINA : 1);
}

export interface ResultadoHunt {
  /** XP que a sessão produz, com as horas de boost já contadas à parte. */
  xpDaSessao: number;
  horasComBoost: number;
  horasSemBoost: number;
  xpHoraComBoost: number;
  xpHoraSemBoost: number;
  /** XP que falta para o nível alvo, a partir da XP atual. Zero se já lá está. */
  xpEmFalta: number;
  jaAtingido: boolean;
  /** A sessão chega ao alvo? */
  chega: boolean;
  /** Nível no fim da sessão. */
  nivelNoFim: number;
  /** XP no fim da sessão. */
  xpNoFim: number;
  /**
   * Horas de caça necessárias para chegar ao alvo com esta configuração,
   * gastando primeiro os boosts. `null` quando o ritmo é nulo.
   */
  horasNecessarias: number | null;
}

/**
 * Quantas horas são precisas para juntar `xpEmFalta`, gastando primeiro as
 * horas com boost e só depois as horas sem.
 *
 * Cada XP Boost dura 1 hora de caça, por isso numa sessão de 6 horas com 2
 * boosts só 2 horas correm à taxa acelerada — tratar a sessão toda como
 * "boosted" era o erro que a calculadora antiga fazia, e dava sempre um
 * resultado optimista.
 */
function horasPara(xpEmFalta: number, xpHoraComBoost: number, xpHoraSemBoost: number, boosts: number): number | null {
  if (xpEmFalta <= 0) return 0;

  const xpDosBoosts = boosts * xpHoraComBoost;
  if (xpEmFalta <= xpDosBoosts) {
    return xpHoraComBoost > 0 ? xpEmFalta / xpHoraComBoost : null;
  }

  if (xpHoraSemBoost <= 0) return null;
  return boosts + (xpEmFalta - xpDosBoosts) / xpHoraSemBoost;
}

/**
 * @param xpAtual XP total do personagem agora
 * @param nivelAlvo nível absoluto que se quer atingir
 * @param xpHoraBruta XP por hora a 100%, sem bónus nenhum
 * @param horas horas de caça planeadas
 * @param boosts quantos XP Boosts vão ser usados (1 hora cada)
 */
export function calcularHunt(
  xpAtual: number,
  nivelAlvo: number,
  xpHoraBruta: number,
  horas: number,
  boosts: number,
  opcoes: OpcoesHunt
): ResultadoHunt {
  const boostsUsaveis = Math.max(0, Math.min(boosts, MAX_BOOSTS_POR_DIA));
  const horasComBoost = Math.max(0, Math.min(boostsUsaveis, horas));
  const horasSemBoost = Math.max(0, horas - horasComBoost);

  const xpHoraComBoost = xpHoraBruta * multiplicador(opcoes, true);
  const xpHoraSemBoost = xpHoraBruta * multiplicador(opcoes, false);

  const xpDaSessao = horasComBoost * xpHoraComBoost + horasSemBoost * xpHoraSemBoost;

  const emFaltaBruta = experienceForLevel(nivelAlvo) - xpAtual;
  const jaAtingido = emFaltaBruta <= 0;
  const xpEmFalta = Math.max(0, emFaltaBruta);

  const xpNoFim = xpAtual + xpDaSessao;

  return {
    xpDaSessao,
    horasComBoost,
    horasSemBoost,
    xpHoraComBoost,
    xpHoraSemBoost,
    xpEmFalta,
    jaAtingido,
    chega: xpDaSessao >= xpEmFalta,
    nivelNoFim: levelForExperience(xpNoFim),
    xpNoFim,
    horasNecessarias: horasPara(xpEmFalta, xpHoraComBoost, xpHoraSemBoost, boostsUsaveis),
  };
}

/** "3h 20m" — usado em todos os sítios onde aparece uma duração. */
export function formatarHoras(horas: number): string {
  if (!Number.isFinite(horas) || horas < 0) return '—';
  const total = Math.round(horas * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
