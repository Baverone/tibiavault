// O comando que junta uma leitura dos raros (22/11/2026): recebe a página do
// GuildStats já guardada (lida no Chrome do André — o GuildStats nunca se pede
// por fetch, regra de 21/10 do ai-pc) e grava data/bosses-raros/celesta.json só
// quando as previsões mudam.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { executar } from './lerRaros.mjs';
import { CRUAS } from './fixtures/cruas.mjs';

const HTML = readFileSync(new URL('./fixtures/guildstats-raros.html', import.meta.url), 'utf8');

function raiz() {
  const d = mkdtempSync(join(tmpdir(), 'raros-'));
  mkdirSync(join(d, 'data', 'bosses-fontes'), { recursive: true });
  writeFileSync(join(d, 'data', 'bosses-fontes', 'raros.json'), JSON.stringify([{ nomeGuildstats: 'Dharalion' }, { nomeGuildstats: 'Morshabaal' }]));
  return { dir: d, url: pathToFileURL(`${d}/`) };
}
const ficheiro = (d) => join(d, 'data', 'bosses-raros', 'celesta.json');

test('a primeira leitura grava; a mesma outra vez não mexe no ficheiro', () => {
  const { dir, url } = raiz();
  const r1 = executar({ html: HTML, raiz: url, agora: new Date('2026-11-22T10:10:00Z'), minimo: 3 });
  assert.equal(r1.estado, 'atualizado');
  assert.equal(r1.n, 3);
  assert.equal(r1.lidoEm, '2026-11-22T10:10:00.000Z');
  assert.deepEqual(r1.semFicha, ["Gaz'haragoth"]);
  const gravado = readFileSync(ficheiro(dir), 'utf8');
  assert.equal(JSON.parse(gravado).bosses.length, 3);

  const r2 = executar({ html: HTML, raiz: url, agora: new Date('2026-11-22T13:10:00Z'), minimo: 3 });
  assert.equal(r2.estado, 'igual');
  assert.equal(r2.lidoEm, '2026-11-22T10:10:00.000Z');
  assert.equal(readFileSync(ficheiro(dir), 'utf8'), gravado);
});

test('as linhas do Chrome (--linhas) gravam o mesmo que a página inteira', () => {
  const a = raiz();
  const b = raiz();
  const agora = new Date('2026-11-22T11:10:00Z');
  executar({ html: HTML, raiz: a.url, agora, minimo: 3 });
  const r = executar({ linhas: CRUAS, raiz: b.url, agora, minimo: 3 });
  assert.equal(r.estado, 'atualizado');
  assert.equal(readFileSync(ficheiro(b.dir), 'utf8'), readFileSync(ficheiro(a.dir), 'utf8'));
  // linhas que não são uma lista rebentam
  assert.throws(() => executar({ linhas: { x: 1 }, raiz: b.url, agora, minimo: 3 }), /lista/);
});

test('poucas linhas (página cortada ou mudada) rebentam sem tocar no ficheiro', () => {
  const { dir, url } = raiz();
  assert.throws(() => executar({ html: HTML, raiz: url, agora: new Date(), minimo: 30 }), /só 3 bosses/);
  assert.equal(existsSync(ficheiro(dir)), false);
});

test('a página do desafio do Cloudflare rebenta a dizer que o layout não está lá', () => {
  const { url } = raiz();
  assert.throws(() => executar({ html: '<title>Just a moment...</title>', raiz: url, agora: new Date(), minimo: 3 }), /layout/);
});
