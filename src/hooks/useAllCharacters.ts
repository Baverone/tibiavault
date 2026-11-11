import { useCallback, useEffect, useState } from 'react';
import { PLAYERS } from '../constants/players';
import type { CharacterId, HistoryEntry } from '../domain/types';
import { fetchSharedHistory, historyErrorText } from '../storage/sharedHistory';
import { useRefreshWhenVisible } from './useRefreshWhenVisible';

export type HistoriesByCharacter = Partial<Record<CharacterId, HistoryEntry[]>>;

/**
 * O histórico de TODOS os bonecos, para o painel do Início.
 *
 * Um `useCharacterState` por personagem dentro de um `map` seria um hook dentro
 * de um ciclo — proibido, e com razão: bastava um boneco entrar ou sair da lista
 * para a ordem dos hooks mudar a meio de um render. Aqui é um efeito só, que
 * busca os dois em paralelo e devolve um objeto indexado pelo id.
 *
 * Cada personagem é independente: se a leitura de um falhar, o outro aparece na
 * mesma, o que já se tinha do que falhou fica, e a falha vem em `error`
 * (11/11/2026). Volta a ler ao regressar a um separador escondido há mais de
 * meia hora (`useRefreshWhenVisible`).
 */
export function useAllCharacters() {
  const [histories, setHistories] = useState<HistoriesByCharacter>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled(PLAYERS.map((player) => fetchSharedHistory(player.id))).then((results) => {
      if (cancelled) return;
      const failures: string[] = [];
      const read: HistoriesByCharacter = {};
      results.forEach((result, i) => {
        const player = PLAYERS[i];
        if (result.status === 'fulfilled') {
          read[player.id] = [...result.value].sort((a, b) => a.timestamp - b.timestamp);
        } else {
          failures.push(`${player.name}: ${historyErrorText(result.reason)}`);
        }
      });
      setHistories((previous) => ({ ...previous, ...read }));
      setError(failures.length > 0 ? failures.join('; ') : null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useRefreshWhenVisible(retry);

  return { histories, loading, error, retry };
}
