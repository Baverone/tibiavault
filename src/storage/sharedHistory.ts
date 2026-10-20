import { GITHUB_REPO } from '../config';
import { scrapedRecordsToHistory } from '../domain/scrapedHistory';
import type { CharacterId, HistoryEntry } from '../domain/types';

/**
 * O histórico diário de um boneco, lido do repositório público no GitHub
 * (escrito por scripts/scrape-experience.mjs, a correr no PC).
 *
 * Nunca rebenta: qualquer falha — offline, repo por configurar, ficheiro
 * ainda sem dados — devolve uma lista vazia e a app mostra o estado vazio em
 * vez de partir. A conversão das linhas está em `domain/scrapedHistory.ts`.
 */
export async function fetchSharedHistory(characterId: CharacterId): Promise<HistoryEntry[]> {
  const url = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/data/scraped-history/${characterId}.json`;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return [];
    return scrapedRecordsToHistory(await response.json());
  } catch {
    return [];
  }
}
