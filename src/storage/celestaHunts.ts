import { GITHUB_REPO } from '../config';
import type { CelestaHuntsData } from '../domain/celestaHunts';

/**
 * A tarefa agendada escreve o mesmo ficheiro em dois sítios:
 *
 *  - public/celesta-hunts.json — servido em /celesta-hunts.json. É o que o
 *    `npm run dev` lê sem precisar de nada do GitHub, por isso funciona logo
 *    a seguir à tarefa correr. No site publicado esta cópia fica congelada no
 *    build, e é normal ficar para trás.
 *  - data/celesta-hunts.json — commitado e enviado para o repo público. É esta
 *    que mantém o site publicado (GitHub Pages desde 24/09/2026) atualizado sem precisar de novo deploy.
 *
 * Ganha o que for mais recente, para nunca mostrarmos dados velhos só porque
 * um dos dois lados ficou para trás.
 *
 * O `?t=` em cada pedido não é decoração: sem ele o CDN do raw.githubusercontent
 * serve a cópia em cache durante minutos, e carregar em "Atualizar" logo a
 * seguir a um push devolvia teimosamente o ficheiro antigo. O `cache: no-store`
 * só trata da cache do browser — a do CDN precisa de um URL diferente.
 */
const LOCAL_URL = '/celesta-hunts.json';
const REMOTE_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/data/celesta-hunts.json`;

function isValid(value: unknown): value is CelestaHuntsData {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Partial<CelestaHuntsData>;
  return typeof data.generatedAt === 'string' && Array.isArray(data.spots);
}

async function fetchOne(url: string, bust: number): Promise<CelestaHuntsData | null> {
  try {
    const separator = url.includes('?') ? '&' : '?';
    const response = await fetch(`${url}${separator}t=${bust}`, { cache: 'no-store' });
    if (!response.ok) return null;

    const data: unknown = await response.json();
    return isValid(data) ? data : null;
  } catch {
    return null;
  }
}

function generatedTime(data: CelestaHuntsData): number {
  const parsed = Date.parse(data.generatedAt);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Vai buscar as janelas livres mais recentes. Nunca rebenta: se as duas
 * origens falharem (offline, ficheiro ainda não escrito, JSON estragado)
 * devolve null e quem chama decide o que mostrar.
 */
export async function fetchCelestaHunts(): Promise<CelestaHuntsData | null> {
  const bust = Date.now();
  const [local, remote] = await Promise.all([fetchOne(LOCAL_URL, bust), fetchOne(REMOTE_URL, bust)]);

  if (local && remote) return generatedTime(local) >= generatedTime(remote) ? local : remote;
  return local ?? remote;
}
