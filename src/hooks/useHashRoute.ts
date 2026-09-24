import { useCallback, useEffect, useState } from 'react';
import { isPageId, type PageId } from '../navigation/pages';
import { loadTab, saveTab } from '../storage/activeTab';

/**
 * Em que página a app está, com o URL como fonte de verdade.
 *
 * A app era três separadores sem URL nenhum: não havia como mandar um link de
 * uma página a ninguém, o botão «voltar» do telemóvel saía da app em vez de
 * voltar atrás, e recarregar perdia onde se estava. Agora cada página é um
 * `#id` — a «sub-vista com URL» que a identidade comum pede.
 *
 * Sem hash nenhum (alguém abre `tibia.baverone.com` a seco) abre-se onde ficou
 * da última vez, que é o que o `activeTab.ts` já fazia e é para continuar a
 * fazer: quem abre isto no telemóvel antes de ir caçar abre-o para ver a mesma
 * coisa que viu ontem. Sem `localStorage` (janela privada) abre no Início.
 */
function readHash(): PageId | null {
  if (typeof window === 'undefined') return null;
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  return isPageId(raw) ? raw : null;
}

export function useHashRoute(): [PageId, (id: PageId) => void] {
  const [page, setPage] = useState<PageId>(() => readHash() ?? loadTab('main') ?? 'inicio');

  useEffect(() => {
    function onHashChange() {
      const next = readHash();
      if (next) setPage(next);
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // O URL segue sempre a página, mesmo quando é o `localStorage` a decidir
  // qual é: senão ficava um `tibia.baverone.com` sem hash a mostrar a Stamina,
  // e copiar esse endereço não levava lá ninguém.
  useEffect(() => {
    saveTab('main', page);
    if (readHash() !== page) {
      window.history.replaceState(null, '', `#${page}`);
    }
  }, [page]);

  const navigate = useCallback((id: PageId) => {
    // `location.hash` e não `setPage`: assim o passo fica no histórico do
    // browser e o «voltar» do telemóvel volta à página anterior.
    if (readHash() === id) setPage(id);
    else window.location.hash = `#${id}`;
  }, []);

  return [page, navigate];
}
