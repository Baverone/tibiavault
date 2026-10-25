import { useEffect, useState } from 'react';
import type { CharacterId, HistoryEntry } from '../domain/types';
import { fetchSharedHistory } from '../storage/sharedHistory';

/**
 * O estado de um painel de boneco: o histórico recolhido e a XP atual.
 *
 * Já não há input manual nem localStorage. Enquanto a recolha esteve
 * silenciosamente parada, escrever a XP à mão era a única forma de a app
 * mostrar alguma coisa atual — resolvida a recolha, esse remendo passou a
 * ser só mais um sítio onde os números podiam divergir. A fonte é uma só.
 */
export function useCharacterState(characterId: CharacterId) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchSharedHistory(characterId).then((entries) => {
      if (cancelled) return;
      setHistory([...entries].sort((a, b) => a.timestamp - b.timestamp));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [characterId]);

  // 25/10/2026: devolvia também `currentExperience` e `daysSinceLastReading`,
  // que já ninguém lia — a página tira os dois do `summarizeCharacter`, e o
  // segundo contava horas e não dias de calendário (o erro corrigido a 20/10
  // no `calendarDaysSince`). Ficar cá era convidar a usá-lo outra vez.
  return { history, loading };
}
