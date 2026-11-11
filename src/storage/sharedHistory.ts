import { GITHUB_REPO } from '../config';
import { scrapedRecordsToHistory } from '../domain/scrapedHistory';
import type { CharacterId, HistoryEntry } from '../domain/types';

/**
 * O histórico diário de um boneco, lido do repositório público no GitHub
 * (escrito por scripts/scrape-experience.mjs, a correr no PC).
 *
 * 11/11/2026 (auditoria com o Codex): qualquer falha devolvia lista vazia, e a
 * app dizia «ainda não há histórico, a recolha corre no PC» quando o que tinha
 * falhado era a rede do telemóvel. Agora só um 404 (o ficheiro ainda não
 * existe) é «sem histórico»; rede em baixo, outro erro HTTP ou JSON estragado
 * rebentam com uma mensagem, e quem chama mostra-a com um «Tentar outra vez».
 * A conversão das linhas está em `domain/scrapedHistory.ts`.
 */
export async function fetchSharedHistory(characterId: CharacterId): Promise<HistoryEntry[]> {
  const url = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/data/scraped-history/${characterId}.json`;

  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new Error('sem ligação ao GitHub — rede em baixo ou demorou demasiado');
  }
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`o GitHub respondeu ${response.status}`);

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('o ficheiro do histórico veio estragado');
  }
  return scrapedRecordsToHistory(body);
}

/** O texto de uma falha do `fetchSharedHistory`, para mostrar. */
export function historyErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
