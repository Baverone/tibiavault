// A fila das alterações do Bosstiary por gravar (22/11/2026).
//
// Os +1 são somas: ficam todos. Uma marca, um acesso, um objetivo, um
// «passou» ou os pontos do jogo são valores: o último substitui o anterior do
// mesmo boss (e do mesmo modo, na marca). Escrever as kills à mão é um valor
// absoluto: substitui tanto a escrita anterior como os +1 que vinham antes dela.
import type { Alteracao } from './estado.ts';

function substitui(nova: Alteracao, antiga: Alteracao): boolean {
  if (nova.tipo === 'pontosJogo') return antiga.tipo === 'pontosJogo';
  if (antiga.tipo === 'pontosJogo' || antiga.id !== nova.id) return false;
  switch (nova.tipo) {
    case 'kill':
      return false;
    case 'kills':
      return antiga.tipo === 'kills' || antiga.tipo === 'kill';
    case 'marca':
      return antiga.tipo === 'marca' && antiga.modo === nova.modo;
    default:
      return antiga.tipo === nova.tipo;
  }
}

export function juntar(pendentes: Alteracao[], nova: Alteracao): Alteracao[] {
  return [...pendentes.filter((antiga) => !substitui(nova, antiga)), nova];
}

/**
 * Tira da fila as alterações que acabaram de ser gravadas, pelo `uid` — nunca
 * pela contagem: o `juntar` reordena a fila, e cortar as primeiras N levava
 * as erradas (22/11/2026, revisão final).
 */
export function tirar(fila: Alteracao[], gravadas: Alteracao[]): Alteracao[] {
  const uids = new Set(gravadas.map((a) => a.uid));
  return fila.filter((a) => a.uid === undefined || !uids.has(a.uid));
}

/** A gravação falhou: o lote volta à frente da fila, e o que chegou depois ganha. */
export function devolver(lote: Alteracao[], fila: Alteracao[]): Alteracao[] {
  return [...lote, ...fila].reduce<Alteracao[]>((acc, a) => juntar(acc, a), []);
}
