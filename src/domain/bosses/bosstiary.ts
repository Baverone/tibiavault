// As regras do Bosstiary (22/11/2026). Fontes: TibiaWiki (Cyclopedia#Bosstiary)
// e TibiaQA 30616/30617/30817, lidas nas pesquisas de 22/11.
import type { Categoria, Patamar } from './types.ts';

/** Kills para Prowess, Expertise e Mastery. */
export const LIMIARES: Record<Categoria, [number, number, number]> = {
  Bane: [25, 100, 300],
  Archfoe: [5, 20, 60],
  Nemesis: [1, 3, 5],
};

/** Pontos ACUMULADOS em cada patamar (Bane 5/15/30, os outros 10/30/60). */
const PONTOS: Record<Categoria, [number, number, number]> = {
  Bane: [5, 20, 50],
  Archfoe: [10, 40, 100],
  Nemesis: [10, 40, 100],
};

const PATAMARES: Patamar[] = ['prowess', 'expertise', 'mastery'];

/** Quantos patamares já se passaram (0 a 3). */
function nivel(kills: number, cat: Categoria): number {
  return LIMIARES[cat].filter((limiar) => kills >= limiar).length;
}

export function patamar(kills: number, cat: Categoria): Patamar {
  const n = nivel(kills, cat);
  return n === 0 ? 'nenhum' : PATAMARES[n - 1];
}

export function pontos(kills: number, cat: Categoria): number {
  const n = nivel(kills, cat);
  return n === 0 ? 0 : PONTOS[cat][n - 1];
}

export function proximo(kills: number, cat: Categoria): { patamar: Patamar; faltam: number } | null {
  const n = nivel(kills, cat);
  if (n >= 3) return null;
  return { patamar: PATAMARES[n], faltam: LIMIARES[cat][n] - kills };
}

/**
 * O objetivo de um boss marcado «Bosstiary», quando ele não escolheu outro:
 * Mastery nos Archfoe e Nemesis (100 pontos e +25 % de loot no slot), Prowess
 * nos Bane (300 kills por 50 pontos raramente compensam).
 */
export function objetivoOmissao(cat: Categoria): Patamar {
  return cat === 'Bane' ? 'prowess' : 'mastery';
}

export function chegouAoObjetivo(kills: number, cat: Categoria, objetivo: Patamar): boolean {
  if (objetivo === 'nenhum') return true;
  return nivel(kills, cat) >= PATAMARES.indexOf(objetivo) + 1;
}

/**
 * O bónus de loot de equipamento do boss no slot, em %, pelos pontos totais
 * (TibiaQA 30817, de 2022, por isso «estimado»): começa em 25 %, +1 % por cada
 * 10 pontos até 50 % (250 pontos), +1 % por cada 20 até 100 % (1 250), e daí
 * o 1 % número x custa 20 + 5x pontos (101 % aos 1 275, 102 % aos 1 305 …).
 */
export function bonusLoot(pontosTotais: number): number {
  const p = Math.max(0, Math.floor(pontosTotais));
  if (p < 250) return 25 + Math.floor(p / 10);
  if (p < 1250) return 50 + Math.floor((p - 250) / 20);
  let bonus = 100;
  let resto = p - 1250;
  for (let x = 1; resto >= 20 + 5 * x; x++) {
    resto -= 20 + 5 * x;
    bonus++;
  }
  return bonus;
}
