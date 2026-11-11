import { useEffect, useRef } from 'react';

/** Quanto tempo a página tem de estar escondida para valer a pena ler outra vez. */
export const REFRESH_AFTER_HIDDEN_MS = 30 * 60 * 1000;

/**
 * Chama `refresh` quando a página volta a ficar visível depois de pelo menos
 * `REFRESH_AFTER_HIDDEN_MS` escondida.
 *
 * 11/11/2026 (auditoria com o Codex): o histórico era lido uma vez, ao abrir a
 * app. Um separador deixado aberto de um dia para o outro continuava com os
 * números de ontem no Início e na Partilha, mesmo depois da recolha nova.
 */
export function useRefreshWhenVisible(refresh: () => void): void {
  const hiddenSince = useRef<number | null>(null);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        hiddenSince.current = Date.now();
        return;
      }
      const since = hiddenSince.current;
      hiddenSince.current = null;
      if (since !== null && Date.now() - since >= REFRESH_AFTER_HIDDEN_MS) refreshRef.current();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
}
