import { useEffect, useState } from 'react';
import { PLAYERS } from '../constants/players';
import type { CharacterId, HistoryEntry } from '../domain/types';
import { fetchSharedHistory } from '../storage/sharedHistory';

export type HistoriesByCharacter = Partial<Record<CharacterId, HistoryEntry[]>>;

/**
 * O histórico de TODOS os bonecos, para o painel do Início.
 *
 * Um `useCharacterState` por personagem dentro de um `map` seria um hook dentro
 * de um ciclo — proibido, e com razão: bastava um boneco entrar ou sair da lista
 * para a ordem dos hooks mudar a meio de um render. Aqui é um efeito só, que
 * busca os dois em paralelo e devolve um objeto indexado pelo id.
 *
 * Cada personagem é independente: se um ficheiro faltar, o outro aparece na
 * mesma (o `fetchSharedHistory` já devolve lista vazia em vez de rebentar).
 */
export function useAllCharacters() {
  const [histories, setHistories] = useState<HistoriesByCharacter>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all(
      PLAYERS.map((player) =>
        fetchSharedHistory(player.id).then(
          (entries) => [player.id, [...entries].sort((a, b) => a.timestamp - b.timestamp)] as const
        )
      )
    ).then((pairs) => {
      if (cancelled) return;
      setHistories(Object.fromEntries(pairs) as HistoriesByCharacter);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { histories, loading };
}
