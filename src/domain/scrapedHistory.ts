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
  /** De onde veio o valor; só nas linhas a partir de 21/10/2026. */
  source?: 'highscores' | 'guildstats';
}

/**
 * As linhas do ficheiro em leituras, pela ordem do ficheiro.
 *
 * 20/10/2026: uma linha sem `date` ou sem `experience` dava `NaN`, que
 * baralhava a ordenação e rebentava a data da «última leitura». Fica de fora;
 * um ficheiro que não é uma lista dá lista vazia.
 */
/** "YYYY-MM-DD" que existe mesmo no calendário ("2026-02-30" não existe). */
function isRealDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function scrapedRecordsToHistory(records: unknown): HistoryEntry[] {
  if (!Array.isArray(records)) return [];
  // 11/11/2026 (auditoria com o Codex): passava XP -1 (e o resumo rebentava)
  // e "2026-02-30" virava 2 de março. Só entram datas reais e XP inteira >= 0.
  return (records as Array<Partial<ScrapedRecord> | null>)
    .filter(
      (record) =>
        isRealDate(record?.date) && Number.isInteger(record?.experience) && (record?.experience as number) >= 0
    )
    .map((record) => ({
      // O guildstats só dá precisão ao dia; meio-dia UTC mantém a ordenação
      // estável sem depender do horário de verão de Lisboa.
      timestamp: new Date(`${record?.date}T12:00:00Z`).getTime(),
      experience: record?.experience as number,
      source: 'guildstats' as const,
    }))
    .filter((entry) => Number.isFinite(entry.timestamp) && Number.isFinite(entry.experience));
}
