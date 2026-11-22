// A ficha de cada boss raro tirada da TibiaWiki (22/11/2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fichaDe, lerInfobox, titulosPossiveis } from './fontesRaros.mjs';

const DHARALION = `{{Infobox Creature|List={{{1|}}}|GetValue={{{GetValue|}}}
| name           = Dharalion
| spawntype      = Raid
| isboss         = yes
| location       = [[Shadowthorn]], the [[Time Ring Quest|Time Ring]] room.<ref>x</ref> {{Mapper Coords|1|2|7}}
| bosstiaryclass    = Nemesis
}}`;

test('lê a classe do Bosstiary e o local, sem a marcação da wiki', () => {
  assert.deepEqual(lerInfobox(DHARALION), { categoria: 'Nemesis', area: 'Shadowthorn, the Time Ring room.' });
});

test('sem bosstiaryclass a categoria é null (não conta para o Bosstiary)', () => {
  const r = lerInfobox('{{Infobox Creature\n| name = Munster\n| isboss = yes\n| location = [[Rookgaard]], Rat Caves.\n}}');
  assert.deepEqual(r, { categoria: null, area: 'Rookgaard, Rat Caves.' });
});

test('o local fica pela primeira linha e por 160 caracteres', () => {
  const r = lerInfobox(`| location = ${'a'.repeat(300)}\nGaleria\n| bosstiaryclass = Bane`);
  assert.equal(r.area.length, 160);
  assert.equal(r.categoria, 'Bane');
});

test('a ficha: classe da wiki; sem ela, o tipo do GuildStats (o Owin não tem classe na wiki)', () => {
  const owin = { nome: 'Owin', tipo: 'Archfoe' };
  const pagina = { titulo: 'Owin', wikitext: '| location = On [[Grimvale]].' };
  assert.deepEqual(fichaDe(owin, pagina), {
    nomeGuildstats: 'Owin', nome: 'Owin', categoria: 'Archfoe', area: 'On Grimvale.', wiki: 'https://tibia.fandom.com/wiki/Owin',
  });
  // raid de criaturas: sem página e sem tipo
  assert.deepEqual(fichaDe({ nome: 'yetis', tipo: null }, null), { nomeGuildstats: 'yetis', nome: 'yetis', categoria: null, area: '', wiki: null });
  // a wiki manda quando tem classe
  assert.equal(fichaDe({ nome: 'X', tipo: 'Bane' }, { titulo: 'X', wikitext: '| bosstiaryclass = Nemesis' }).categoria, 'Nemesis');
});

test('títulos a tentar: o do GuildStats e o da wiki (palavras pequenas em minúscula)', () => {
  assert.deepEqual(titulosPossiveis('Arachir The Ancient One'), ['Arachir The Ancient One', 'Arachir the Ancient One']);
  assert.deepEqual(titulosPossiveis('man in the cave'), ['man in the cave', 'Man in the Cave']);
  assert.deepEqual(titulosPossiveis('Dharalion'), ['Dharalion']);
});
