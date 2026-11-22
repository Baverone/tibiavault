// Ler e gravar o Bosstiary de cada personagem no repositório (22/11/2026):
// data/bosstiary/<id>.json, pela API de conteúdos do GitHub, com a chave que já
// está no aparelho. Desenho: docs/superpowers/specs/2026-11-22-bosses-design.md
import type { CharacterId } from '../domain/types.ts';
import { aplicar, limparEstado, type Alteracao, type EstadoPersonagem } from '../domain/bosses/estado.ts';
import { getFile, updateFile } from './githubContents.ts';

type Fetch = typeof fetch;

const caminho = (id: CharacterId) => `data/bosstiary/${id}.json`;

export async function carregarBosstiary(id: CharacterId, token: string | null, fetchFn: Fetch = fetch): Promise<EstadoPersonagem> {
  return limparEstado((await getFile(caminho(id), token, fetchFn)).data);
}

/**
 * Aplica as alterações sobre o que está gravado AGORA e grava, num commit só.
 * Devolve o estado gravado (já com o que outro aparelho tenha gravado antes).
 */
export async function gravarAlteracoes(
  id: CharacterId,
  alteracoes: Alteracao[],
  token: string,
  fetchFn: Fetch = fetch
): Promise<EstadoPersonagem> {
  return updateFile(
    caminho(id),
    (atual) => aplicar(limparEstado(atual), alteracoes),
    `chore: bosstiary ${id} (${alteracoes.length} alterações)`,
    token,
    fetchFn
  );
}
