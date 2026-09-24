/**
 * A NAVEGAÇÃO, num sítio só.
 *
 * É o equivalente ao `SECCOES` do `site_shell.py` do mtgvault: a barra lateral,
 * as migalhas e o título de cada página saem todos daqui. Uma página nova é uma
 * linha nesta lista — e não um `<button>` novo numa barra qualquer.
 *
 * Os rótulos dizem o que é à primeira leitura, e a nota só existe quando
 * ACRESCENTA. O TÍTULO de cada página é o MESMO rótulo: carregar em «Stamina» e
 * chegar a uma página chamada outra coisa é a página a discordar do menu que lá
 * levou.
 *
 * **Os TIMERS não estão aqui de propósito.** Não são uma página: são a barra
 * que a casca desenha por cima do conteúdo, visível em qualquer página, porque
 * é isso que eles sempre foram e é para isso que servem — estar à vista
 * enquanto se caça, seja qual for o painel aberto.
 */
// `.ts` explícito: o `pages.test.ts` corre no `node --test` sem passo de
// build, e o Node exige a extensão nos imports locais. O Vite resolve-a na
// mesma. O `IconName` vem do `iconPaths.ts` e não do `icons.tsx` pela mesma
// razão — o `tsconfig.node.json` não sabe de JSX.
import type { IconName } from '../components/shell/iconPaths.ts';
import { PLAYERS } from '../constants/players.ts';

export type PageId =
  | 'inicio'
  | 'baverone'
  | 'bluey'
  | 'stamina'
  | 'flechas'
  | 'celesta'
  | 'mundo';

export interface PageMeta {
  id: PageId;
  /** A secção da barra lateral. Vazia = fora de qualquer secção (o Início). */
  section: string;
  label: string;
  /** A nota por baixo do rótulo, na barra lateral. Vazia = não há. */
  note: string;
  icon: IconName;
  /** O subtítulo do cabeçalho da página, quando é fixo. */
  subtitle?: string;
}

export const PAGES: PageMeta[] = [
  {
    id: 'inicio',
    section: '',
    label: 'Início',
    note: 'o painel de hoje',
    icon: 'inicio',
  },
  {
    id: 'baverone',
    section: 'Personagens',
    label: PLAYERS[0].name,
    note: PLAYERS[0].vocation,
    icon: PLAYERS[0].icon,
  },
  {
    id: 'bluey',
    section: 'Personagens',
    label: PLAYERS[1].name,
    note: PLAYERS[1].vocation,
    icon: PLAYERS[1].icon,
  },
  {
    id: 'stamina',
    section: 'Hunt',
    label: 'Stamina',
    note: 'quando chegas às 42h',
    icon: 'stamina',
    subtitle: 'Quanta stamina terás à hora da hunt, quando chegas às 40h/41h/42h, e com quanta ficas depois de caçar.',
  },
  {
    id: 'flechas',
    section: 'Hunt',
    label: 'Flechas',
    note: 'quantas gastas por minuto',
    icon: 'flecha',
    subtitle: 'Quantas flechas por minuto gastaste numa caçada, e a tabela de totais para as taxas mais comuns.',
  },
  {
    id: 'celesta',
    section: 'Hunt',
    label: 'Janelas do Celesta',
    note: 'recolha desligada',
    icon: 'mapa',
    subtitle: 'As janelas livres dos spots do Celesta, lidas do Discord. A recolha está desligada — ver o aviso abaixo.',
  },
  {
    id: 'mundo',
    section: 'Tibia',
    label: 'Rashid e Tibiadrome',
    note: 'onde está hoje, e a rotação',
    icon: 'mundo',
    subtitle: 'Onde está o Rashid no dia de Tibia de hoje, e quanto falta para a rotação do Tibiadrome acabar.',
  },
];

export const PAGE_IDS: readonly PageId[] = PAGES.map((page) => page.id);

const BY_ID = new Map(PAGES.map((page) => [page.id, page]));

export function pageById(id: PageId): PageMeta {
  return BY_ID.get(id) ?? PAGES[0];
}

export function isPageId(value: string): value is PageId {
  return BY_ID.has(value as PageId);
}

/** As secções pela ordem em que aparecem, cada uma com as suas páginas. */
export function sections(): { name: string; pages: PageMeta[] }[] {
  const out: { name: string; pages: PageMeta[] }[] = [];
  for (const page of PAGES) {
    const last = out[out.length - 1];
    if (last && last.name === page.section) last.pages.push(page);
    else out.push({ name: page.section, pages: [page] });
  }
  return out;
}

/** O link para a casa-mãe, no topo da barra lateral. */
export const CASA = { href: 'https://baverone.com', label: 'baverone.com' };

/**
 * Os atalhos do Início («Onde vais mais vezes»).
 *
 * Vivem aqui, e não dentro da página, para o teste poder confirmar que cada um
 * aponta para uma página que existe — um atalho para um id que ninguém
 * reconhece deixa o Início a piscar para lado nenhum.
 */
export const ATALHOS_INICIO: { page: PageId; icon: IconName; label: string; note: string }[] = [
  { page: 'stamina', icon: 'stamina', label: 'Stamina', note: 'quando chegas às 42h' },
  { page: 'flechas', icon: 'flecha', label: 'Flechas', note: 'consumo por minuto' },
  { page: 'celesta', icon: 'mapa', label: 'Janelas do Celesta', note: 'recolha desligada' },
  { page: 'mundo', icon: 'mundo', label: 'Rashid e Tibiadrome', note: 'onde está hoje' },
];

/**
 * Os blocos da página de uma personagem, por ordem.
 *
 * É a MESMA lista que desenha o índice vertical e que dá o `id` a cada
 * `<section>`. Escritas em dois sítios, era uma questão de tempo até o índice
 * apontar para uma âncora que já não existia — exatamente o «link partido» que
 * o teste procura.
 */
export const CHARACTER_SECTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: 'nivel', label: 'Nível', icon: 'nivel' },
  { id: 'progressao', label: 'Progressão', icon: 'grafico' },
  { id: 'previsao', label: 'Previsão', icon: 'previsao' },
  { id: 'hunt', label: 'Calculadora de hunt', icon: 'calculadora' },
  { id: 'treino', label: 'Varinhas de treino', icon: 'varinha' },
];
