import { useCallback, useEffect, useState } from 'react';
import type { CharacterId } from '../domain/types';
import type { SkillEvent, SkillReading } from '../domain/skillsHistory';
import { appendReading, changeEvents, loadEvents, loadReadings } from '../storage/skillsHistoryStore';
import { getGithubToken, setGithubToken } from '../storage/githubToken';
import { historyErrorText } from '../storage/sharedHistory';

export type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: number }
  | { kind: 'error'; message: string };

export interface SkillsHistoryState {
  readings: SkillReading[];
  events: SkillEvent[];
  loading: boolean;
  /** Falha a LER (a página mostra-a com «Tentar outra vez»). */
  error: string | null;
  reload: () => void;
  hasToken: boolean;
  setToken: (token: string | null) => void;
  saveStatus: SaveStatus;
  saveReading: (reading: SkillReading) => Promise<void>;
  /** Devolve a mensagem de erro, ou null se gravou. */
  addEvent: (event: SkillEvent) => Promise<string | null>;
  removeEvent: (id: string) => Promise<string | null>;
}

/**
 * O histórico dos skills de uma personagem e os eventos (20/11/2026). É um só
 * estado para a página toda: o botão «Gravar leitura» fica no Treino e o
 * gráfico na secção seguinte, e os dois têm de ver a mesma lista.
 */
export function useSkillsHistory(characterId: CharacterId): SkillsHistoryState {
  const [readings, setReadings] = useState<SkillReading[]>([]);
  const [events, setEvents] = useState<SkillEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [token, setTokenState] = useState<string | null>(() => getGithubToken());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: 'idle' });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([loadReadings(characterId, token), loadEvents(token)])
      .then(([r, e]) => {
        if (cancelled) return;
        setReadings(r);
        setEvents(e);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(historyErrorText(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [characterId, token, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const setToken = useCallback((value: string | null) => {
    setGithubToken(value);
    setTokenState(getGithubToken());
    setSaveStatus({ kind: 'idle' });
  }, []);

  const saveReading = useCallback(
    async (reading: SkillReading) => {
      if (!token) {
        setSaveStatus({ kind: 'error', message: 'falta a chave do GitHub neste aparelho' });
        return;
      }
      setSaveStatus({ kind: 'saving' });
      try {
        setReadings(await appendReading(characterId, reading, token));
        setSaveStatus({ kind: 'saved', at: reading.timestamp });
      } catch (err) {
        setSaveStatus({ kind: 'error', message: historyErrorText(err) });
      }
    },
    [characterId, token]
  );

  const change = useCallback(
    async (what: { add: SkillEvent } | { remove: string }) => {
      if (!token) return 'falta a chave do GitHub neste aparelho';
      try {
        setEvents(await changeEvents(what, token));
        return null;
      } catch (err) {
        return historyErrorText(err);
      }
    },
    [token]
  );

  return {
    readings,
    events,
    loading,
    error,
    reload,
    hasToken: token !== null,
    setToken,
    saveStatus,
    saveReading,
    addEvent: (event) => change({ add: event }),
    removeEvent: (id) => change({ remove: id }),
  };
}
