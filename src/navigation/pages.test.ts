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
  pageTitle,
  parseRoute,
  sectionHref,
  sections,
} from './pages.ts';
import { PLAYERS, playerBySlug } from '../constants/players.ts';
import { CHARACTERS } from '../../scripts/lib/trackedPlayers.mjs';

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

// 20/10/2026: com o Bluey fora do top 1000 e sem fonte, o aviso mandava «ver
// a tarefa tibia-xp no PC» — como se fosse uma avaria. Quem a recolha não
// cobre (`source: null` em trackedPlayers.mjs) diz porquê, na própria app.
test('quem a recolha não cobre diz porquê, e só esses', () => {
  for (const tracked of CHARACTERS) {
    const player = PLAYERS.find((p) => p.id === tracked.id);
    assert.ok(player, `${tracked.id} não está em players.ts`);
    if (tracked.source) assert.equal(player.noSource, undefined, `${player.name} tem fonte`);
    else assert.ok(player.noSource, `${player.name} não tem fonte e a app não o diz`);
  }
  // 21/10/2026: o Bluey voltou a ser recolhido (página de personagem do
  // guildstats), por isso a app deixa de dizer que não há fonte. Mais tarde no
  // mesmo dia a fonte é o Chrome do André (tarefa tibia-xp-chrome do ai-pc).
  assert.equal(CHARACTERS.find((c) => c.id === 'exalted-monk')?.source, 'chrome');
  assert.equal(PLAYERS.find((p) => p.slug === 'bluey')?.noSource, undefined);
});

// 20/10/2026: o <title> era «TibiaVault» nas 13 rotas — separadores,
// histórico e favoritos ficavam todos com o mesmo nome. Formato do rift e do
// mtg: «Rótulo · projecto».
test('cada página tem o seu título no separador', () => {
  assert.equal(pageTitle('inicio'), 'Início · TibiaVault');
  assert.equal(pageTitle('stamina'), 'Stamina · TibiaVault');
  assert.equal(pageTitle('bluey'), 'Bluey The Cat · TibiaVault');
  const titulos = PAGE_IDS.map(pageTitle);
  assert.equal(new Set(titulos).size, titulos.length, 'há títulos repetidos');
});

// 20/10/2026: #progressao (o href do índice «Nesta página») aberto num
// separador novo caía no Início. As âncoras das secções passam a ser rotas.
test('as âncoras das secções abrem a página da personagem na secção certa', () => {
  assert.deepEqual(parseRoute('baverone'), { page: 'baverone', section: null });
  assert.deepEqual(parseRoute('bluey/treino'), { page: 'bluey', section: 'treino' });
  assert.deepEqual(parseRoute('/baverone/hunt'), { page: 'baverone', section: 'hunt' });
  // a secção sozinha: a personagem onde se estava, senão a primeira
  for (const { id } of CHARACTER_SECTIONS) {
    assert.deepEqual(parseRoute(id), { page: 'baverone', section: id });
    assert.deepEqual(parseRoute(id, 'bluey'), { page: 'bluey', section: id });
    assert.deepEqual(parseRoute(id, 'stamina'), { page: 'baverone', section: id });
  }
});

test('o que não é página nem secção não é rota', () => {
  for (const mau of ['', 'utilities', 'stamina/treino', 'bluey/nada', 'nada/treino']) {
    assert.equal(parseRoute(mau), null, `${mau} passou por rota`);
  }
});

test('o href de cada secção leva a personagem', () => {
  assert.equal(sectionHref('bluey', 'treino'), '#bluey/treino');
  assert.deepEqual(parseRoute(sectionHref('baverone', 'nivel').slice(1)), { page: 'baverone', section: 'nivel' });
});

test('o link para a casa-mãe aponta para o baverone.com', () => {
  assert.match(CASA.href, /^https:\/\/baverone\.com/);
});
