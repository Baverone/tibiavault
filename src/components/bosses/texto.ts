// Textos partilhados pelas linhas de bosses (fora dos componentes, para o fast
// refresh do Vite).
import { LIMIARES, proximo } from '../../domain/bosses/bosstiary';
import type { Categoria, Patamar } from '../../domain/bosses/types';

export const NOME_PATAMAR: Record<Patamar, string> = {
  nenhum: '—',
  prowess: 'Prowess',
  expertise: 'Expertise',
  mastery: 'Mastery',
};

/** «12/20 → Expertise», ou «60 ✔ Mastery» no fim. */
export function textoProgresso(kills: number, categoria: Categoria): string {
  const prox = proximo(kills, categoria);
  if (!prox) return `${kills} ✔ ${NOME_PATAMAR.mastery}`;
  const limiar = LIMIARES[categoria][['prowess', 'expertise', 'mastery'].indexOf(prox.patamar)];
  return `${kills}/${limiar} → ${NOME_PATAMAR[prox.patamar]}`;
}
