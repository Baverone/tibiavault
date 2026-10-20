// O ficheiro `data/scraped-history/<boneco>.json` convertido em leituras.
// Função pura, à parte do `storage/sharedHistory.ts` (que faz o fetch), para
// os testes a poderem correr contra cópias dos ficheiros sem rede.
import type { HistoryEntry } from './types.ts';

/** Uma linha do ficheiro, como o `scripts/scrape-experience.mjs` a escreve. */
export interface ScrapedRecord {
  date: string;
  level: number;
  experience: number;
  scrapedAt: string;
}

/**
 * As linhas do ficheiro em leituras, pela ordem do ficheiro.
 *
 * 20/10/2026: uma linha sem `date` ou sem `experience` dava `NaN`, que
 * baralhava a ordenação e rebentava a data da «última leitura». Fica de fora;
 * um ficheiro que não é uma lista dá lista vazia.
 */
export function scrapedRecordsToHistory(records: unknown): HistoryEntry[] {
  if (!Array.isArray(records)) return [];
  return (records as Array<Partial<ScrapedRecord> | null>)
    .map((record) => ({
      // O guildstats só dá precisão ao dia; meio-dia UTC mantém a ordenação
      // estável sem depender do horário de verão de Lisboa.
      timestamp: new Date(`${record?.date}T12:00:00Z`).getTime(),
      experience: record?.experience as number,
      source: 'guildstats' as const,
    }))
    .filter((entry) => Number.isFinite(entry.timestamp) && Number.isFinite(entry.experience));
}
