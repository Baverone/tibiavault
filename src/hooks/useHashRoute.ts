import { useCallback, useEffect, useRef, useState } from 'react';
import { parseRoute, type PageId, type Route } from '../navigation/pages';
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
 *
 * Desde 20/10/2026 o hash também pode trazer uma secção da página de uma
 * personagem (`#bluey/treino`, ou o antigo `#treino`) — ver `parseRoute`. A
 * secção é devolvida para a página descer até ela ao abrir.
 */
function readRoute(current?: string | null): Route | null {
  if (typeof window === 'undefined') return null;
  return parseRoute(window.location.hash.replace(/^#/, ''), current);
}

export function useHashRoute(): [PageId, (id: PageId) => void, string | null] {
  const [route, setRoute] = useState<Route>(() => {
    const saved = loadTab('main');
    return readRoute(saved) ?? { page: saved ?? 'inicio', section: null };
  });
  const page = route.page;
  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    function onHashChange() {
      const next = readRoute(pageRef.current);
      if (next) setRoute(next);
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // O URL segue sempre a página, mesmo quando é o `localStorage` a decidir
  // qual é: senão ficava um `tibia.baverone.com` sem hash a mostrar a Stamina,
  // e copiar esse endereço não levava lá ninguém.
  useEffect(() => {
    saveTab('main', page);
    if (readRoute(page)?.page !== page) {
      window.history.replaceState(null, '', `#${page}`);
    }
  }, [page]);

  const navigate = useCallback((id: PageId) => {
    // `location.hash` e não `setPage`: assim o passo fica no histórico do
    // browser e o «voltar» do telemóvel volta à página anterior.
    if (window.location.hash === `#${id}`) setRoute({ page: id, section: null });
    else window.location.hash = `#${id}`;
  }, []);

  return [page, navigate, route.section];
}
