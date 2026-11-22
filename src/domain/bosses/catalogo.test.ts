// O catálogo dos bosses (22/11/2026), gerado por scripts/bosses/gerarCatalogo.mjs
// a partir das pesquisas em data/bosses-fontes/. Estes testes confirmam que o
// que a página vai ler está inteiro: cada boss num bloco que existe.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Boss, Catalogo } from './types.ts';

const catalogo = JSON.parse(
  readFileSync(new URL('../../data/bosses/catalogo.json', import.meta.url), 'utf8')
) as Catalogo;
const porNome = (nome: string): Boss => {
  const boss = catalogo.bosses.find((b) => b.nome === nome);
  assert.ok(boss, `falta ${nome}`);
  return boss;
};

test('ids únicos e cada boss tem solo, team ou é raro', () => {
  const ids = catalogo.bosses.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const b of catalogo.bosses) assert.ok(b.solo || b.team || b.raro, b.nome);
});

// 22/11/2026: os bosses raros que o GuildStats segue no Celesta, com a classe
// do Bosstiary da TibiaWiki (data/bosses-fontes/raros.json).
test('os raros do Bosstiary entram no catálogo, com o nome do GuildStats', () => {
  const raros = catalogo.bosses.filter((b) => b.raro);
  assert.ok(raros.length >= 60, `só ${raros.length} raros`);
  const dharalion = porNome('Dharalion');
  assert.equal(dharalion.raro?.nomeGuildstats, 'Dharalion');
  assert.equal(dharalion.categoria, 'Nemesis');
  assert.match(dharalion.area, /Shadowthorn/);
  assert.equal(dharalion.solo, undefined);
  // Nome da wiki com o do GuildStats ao lado.
  assert.equal(porNome('Arachir the Ancient One').raro?.nomeGuildstats, 'Arachir The Ancient One');
  // Um raro que já vinha da pesquisa de team fica o mesmo boss, marcado raro.
  assert.ok(porNome('Ferumbras').team);
  assert.equal(porNome('Ferumbras').raro?.nomeGuildstats, 'Ferumbras');
  // Os que não contam para o Bosstiary ficam de fora.
  for (const nome of ['Munster', 'Teleskor', 'Draptor', 'yetis']) assert.ok(!catalogo.bosses.some((b) => b.nome === nome), nome);
});

test('cada bloco usado existe e as categorias são as três', () => {
  const blocos = new Set(catalogo.blocos.map((b) => b.id));
  for (const b of catalogo.bosses) {
    if (b.solo) assert.ok(blocos.has(b.solo.bloco), `${b.nome}: ${b.solo.bloco}`);
    if (b.team) assert.ok(blocos.has(b.team.bloco), `${b.nome}: ${b.team.bloco}`);
    assert.ok(['Bane', 'Archfoe', 'Nemesis'].includes(b.categoria), b.nome);
  }
});

test('os blocos da rota estão onde a pesquisa os pôs', () => {
  assert.equal(porNome('Grand Master Oberon').solo?.bloco, 'd4');
  assert.equal(porNome('Grand Master Oberon').solo?.valor, 'equipamento');
  assert.equal(porNome('Murcion').team?.bloco, 't1');
  assert.equal(porNome('Plagirath').solo?.bloco, 'f44');
  // Os nomes da team juntam-se aos da solo.
  assert.ok(porNome('Sir Baeloc').team);
  assert.ok(porNome('Dragon Pack').team);
});

test('o catálogo tem os bosses das duas pesquisas', () => {
  assert.ok(catalogo.bosses.filter((b) => b.solo).length >= 150);
  assert.ok(catalogo.bosses.filter((b) => b.team).length >= 100);
});

test('a rota de todos os dias só tem bosses de equipamento; o lucro vai para o varrimento da cidade', () => {
  const diarios = new Set(catalogo.blocos.filter((b) => b.tipo === 'diario').map((b) => b.id));
  for (const b of catalogo.bosses) {
    if (b.solo && diarios.has(b.solo.bloco)) assert.equal(b.solo.valor, 'equipamento', `${b.nome} está na rota diária`);
  }
  assert.equal(porNome('Count Vlarkorth').solo?.bloco, 'dom');
  assert.equal(porNome('Grand Canon Dominus').solo?.bloco, 'ter');
});
