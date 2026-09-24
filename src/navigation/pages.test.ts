// A navegação é a única coisa da reestruturação que se consegue testar sem um
// browser: os componentes React continuam sem testes (aí quem verifica é o
// `tsc` do `npm run build`), mas a LISTA de páginas é dados puros.
//
// O que estes testes defendem, por ordem de importância:
//
//   * **a navegação está presente em todas as páginas** — porque é a mesma
//     lista que a casca desenha em todas elas, e porque não há página nenhuma
//     fora dela;
//   * **não há links partidos** — todo o atalho e toda a âncora apontam para
//     alguma coisa que existe;
//   * **os separadores antigos não voltam** — um `localStorage` com
//     `"utilities"` lá dentro não pode abrir a app num sítio que já não há.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATALHOS_INICIO,
  CASA,
  CHARACTER_SECTIONS,
  PAGES,
  PAGE_IDS,
  isPageId,
  pageById,
  sections,
} from './pages.ts';
import { PLAYERS, playerBySlug } from '../constants/players.ts';

test('cada página aparece uma vez e só uma na barra lateral', () => {
  const naBarra = sections().flatMap((section) => section.pages.map((page) => page.id));
  assert.deepEqual([...naBarra].sort(), [...PAGE_IDS].sort());
  assert.equal(new Set(naBarra).size, naBarra.length, 'há uma página repetida na barra lateral');
});

test('as secções saem pela ordem da lista, sem se repetirem', () => {
  const nomes = sections().map((section) => section.name);
  assert.deepEqual(nomes, ['', 'Personagens', 'Hunt', 'Tibia']);
});

test('nenhuma página fica sem rótulo nem sem ícone', () => {
  for (const page of PAGES) {
    assert.ok(page.label.trim().length > 0, `${page.id} sem rótulo`);
    assert.ok(page.icon.trim().length > 0, `${page.id} sem ícone`);
  }
});

test('os ids são únicos', () => {
  assert.equal(new Set(PAGE_IDS).size, PAGE_IDS.length);
});

test('todo o atalho do Início aponta para uma página que existe', () => {
  for (const atalho of ATALHOS_INICIO) {
    assert.ok(isPageId(atalho.page), `atalho partido: ${atalho.page}`);
  }
});

test('cada personagem tem a sua página, com o mesmo id do slug', () => {
  for (const player of PLAYERS) {
    assert.ok(isPageId(player.slug), `${player.name} não tem página`);
    assert.equal(pageById(player.slug as never).label, player.name);
    assert.equal(playerBySlug(player.slug)?.id, player.id);
  }
});

test('as âncoras da página de personagem são únicas e têm rótulo', () => {
  const ids = CHARACTER_SECTIONS.map((section) => section.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const section of CHARACTER_SECTIONS) {
    assert.ok(section.label.trim().length > 0, `${section.id} sem rótulo`);
  }
});

test('os separadores antigos não são páginas', () => {
  // Estavam guardados no `localStorage` dele: se o `isPageId` os deixasse
  // passar, a app abria num painel que já não existe — ecrã vazio, sem dizer
  // porquê. Ver `storage/activeTab.ts`.
  for (const antigo of ['utilities', 'royal-paladin', 'exalted-monk', 'hunts', 'arrows', '']) {
    assert.equal(isPageId(antigo), false, `${antigo} ainda passa por página`);
  }
});

test('o Início é a primeira página e não tem secção', () => {
  assert.equal(PAGES[0].id, 'inicio');
  assert.equal(PAGES[0].section, '');
});

test('o link para a casa-mãe aponta para o baverone.com', () => {
  assert.match(CASA.href, /^https:\/\/baverone\.com/);
});
