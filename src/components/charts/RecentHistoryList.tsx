import type { HistoryEntry } from '../../domain/types';
import { recentReadings } from '../../domain/historyStats';

interface RecentHistoryListProps {
  history: HistoryEntry[];
  maxEntries?: number;
}

// Sem hora: o guildstats só publica o total do dia, e o timestamp é meio-dia
// UTC inventado para manter a ordenação estável. Mostrar "13:00" ao lado de
// cada leitura era dar por exata uma hora que ninguém mediu — e que ainda por
// cima mudava para "12:00" no inverno.
const dateFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit' });
const numberFormatter = new Intl.NumberFormat('pt-PT');

export function RecentHistoryList({ history, maxEntries = 5 }: RecentHistoryListProps) {
  if (history.length === 0) return null;

  // Um dia cujo anterior falta mostra a leitura com «—» no ganho, como o
  // gráfico, que também não lhe desenha barra (26/10/2026).
  const readings = recentReadings(history, maxEntries);

  return (
    <ul className="recent-history-list">
      {readings.map(({ entry, experienceGained }) => (
        <li key={entry.timestamp}>
          <span className="recent-history-list__date">
            {dateFormatter.format(entry.timestamp)}
            {entry.source === 'guildstats' && <span className="recent-history-list__source-tag">auto</span>}
          </span>
          <span className="recent-history-list__xp">{numberFormatter.format(entry.experience)} XP</span>
          {experienceGained === null ? (
            <span className="recent-history-list__gain" title="Sem leitura do dia anterior">
              —
            </span>
          ) : (
            <span className={experienceGained >= 0 ? 'recent-history-list__gain positive' : 'recent-history-list__gain negative'}>
              {experienceGained >= 0 ? '+' : ''}
              {numberFormatter.format(experienceGained)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
