// Quando é que os dois bonecos passam a poder partilhar XP (Shared Experience),
// ao ritmo a que cada um está a fazer XP. Funções puras, sem React.
// Os `.ts` nos imports: o `shareProjection.test.ts` corre no `node --test`.
import { experienceForLevel, levelForExperience } from './experienceTable.ts';
import { getShareExpRange } from './shareExperience.ts';

/** Os períodos de onde se tira o ritmo de cada um (atalhos da página). */
export const SHARE_WINDOWS = [7, 14, 30, 90] as const;

/**
 * 30 e não 7: a resposta é a meses de distância, e uma semana boa ou parada
 * de um dos dois mudava-a de «nunca» para «daqui a um ano».
 */
export const DEFAULT_SHARE_WINDOW = 30;

/** Os prazos da tabela «quanto precisa de fazer por dia para sharear em…». */
export const SHARE_TARGETS = [30, 90, 180] as const;

/**
 * Até onde a simulação procura. Dez anos: para lá disto a resposta honesta é
 * «a este ritmo, não chega», e não um número de quatro dígitos.
 */
export const MAX_SHARE_DAYS = 3650;

export interface ShareCharacter {
  experience: number;
  /** XP por dia que se assume daqui para a frente. Pode ser 0 ou negativa. */
  dailyXp: number;
}

/**
 * Os dois níveis partilham? A regra oficial é a do `getShareExpRange`: o mais
 * baixo tem de ter pelo menos 2/3 dos níveis do mais alto. Em inteiros
 * (3·baixo ≥ 2·alto) para não depender de arredondamentos.
 */
export function canShare(levelA: number, levelB: number): boolean {
  return 3 * Math.min(levelA, levelB) >= 2 * Math.max(levelA, levelB);
}

/** A XP daqui a `days` dias, com chão em 0 (um ritmo negativo não passa do nível 1). */
function experienceAfter(character: ShareCharacter, days: number): number {
  return Math.max(0, character.experience + character.dailyXp * days);
}

function levelAfter(character: ShareCharacter, days: number): number {
  return levelForExperience(experienceAfter(character, days));
}

/**
 * Quantos dias faltam até os dois partilharem, ao ritmo de cada um. 0 = já
 * partilham; `null` = não chegam lá dentro de `maxDays`.
 *
 * Dia a dia e não por fórmula: a XP por nível cresce com o quadrado do nível,
 * por isso o mais alto sobe cada vez menos níveis com a mesma XP e o mais
 * baixo cada vez menos também — não há uma linha reta para resolver.
 */
export function daysUntilShare(
  a: ShareCharacter,
  b: ShareCharacter,
  maxDays: number = MAX_SHARE_DAYS
): number | null {
  for (let day = 0; day <= maxDays; day++) {
    if (canShare(levelAfter(a, day), levelAfter(b, day))) return day;
  }
  return null;
}

export interface ShareGap {
  /** O nível mínimo que o mais baixo precisa para partilhar com o mais alto, hoje. */
  levelNeeded: number;
  /** XP que lhe falta para esse nível. 0 se já lá está. */
  experienceMissing: number;
}

/** O que falta HOJE ao mais baixo (`low`) para partilhar com o mais alto (`high`). */
export function shareGap(highExperience: number, lowExperience: number): ShareGap {
  const levelNeeded = getShareExpRange(levelForExperience(highExperience)).min;
  return {
    levelNeeded,
    experienceMissing: Math.max(0, experienceForLevel(levelNeeded) - lowExperience),
  };
}

/**
 * A XP por dia escrita à mão na página: `18100000`, `18 100 000`,
 * `18.100.000`, `18,1M`, `18.1 m` ou `18kk` (como se diz no jogo). Vazio ou
 * ilegível = `null`, e a página volta ao ritmo medido.
 */
export function parseDailyXp(raw: string): number | null {
  const text = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (text === '') return null;
  const millions = /^(-?\d+(?:[.,]\d+)?)(?:m|kk)$/.exec(text);
  if (millions) return Math.round(Number(millions[1].replace(',', '.')) * 1_000_000);
  if (!/^-?\d{1,3}(?:[.,]?\d{3})*$/.test(text)) return null;
  return Number(text.replace(/[.,]/g, ''));
}

/**
 * A XP por dia que o mais baixo precisa de fazer para partilhar daqui a `days`
 * dias, com o mais alto a continuar ao ritmo dele. 0 se já partilham sem fazer
 * nada.
 *
 * O alvo é o nível que o mais alto TERÁ nesse dia, não o de hoje: é isso que
 * faz a resposta ser maior do que «o que falta a dividir pelos dias».
 */
export function dailyXpToShareIn(high: ShareCharacter, lowExperience: number, days: number): number {
  const target = shareGap(experienceAfter(high, days), lowExperience);
  return Math.ceil(target.experienceMissing / days);
}
