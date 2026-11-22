// O comando da tarefa tibia-raros (22/11/2026): lê o GuildStats e grava
// data/bosses-raros/celesta.json só quando as previsões mudam.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { executar } from './lerRaros.mjs';

const HTML = readFileSync(new URL('./fixtures/guildstats-raros.html', import.meta.url), 'utf8');
const pagina = (html, status = 200, headers = {}) => async () => new Response(html, { status, headers });

function raiz() {
  const d = mkdtempSync(join(tmpdir(), 'raros-'));
  mkdirSync(join(d, 'data', 'bosses-fontes'), { recursive: true });
  writeFileSync(join(d, 'data', 'bosses-fontes', 'raros.json'), JSON.stringify([{ nomeGuildstats: 'Dharalion' }, { nomeGuildstats: 'Morshabaal' }]));
  return { dir: d, url: pathToFileURL(`${d}/`) };
}
const ficheiro = (d) => join(d, 'data', 'bosses-raros', 'celesta.json');

test('a primeira leitura grava; a mesma outra vez não mexe no ficheiro', async () => {
  const { dir, url } = raiz();
  const r1 = await executar({ fetchFn: pagina(HTML), raiz: url, agora: new Date('2026-11-22T10:10:00Z'), minimo: 3 });
  assert.equal(r1.estado, 'atualizado');
  assert.equal(r1.n, 3);
  assert.equal(r1.lidoEm, '2026-11-22T10:10:00.000Z');
  assert.deepEqual(r1.semFicha, ["Gaz'haragoth"]);
  const gravado = readFileSync(ficheiro(dir), 'utf8');
  assert.equal(JSON.parse(gravado).bosses.length, 3);

  const r2 = await executar({ fetchFn: pagina(HTML), raiz: url, agora: new Date('2026-11-22T13:10:00Z'), minimo: 3 });
  assert.equal(r2.estado, 'igual');
  assert.equal(r2.lidoEm, '2026-11-22T10:10:00.000Z');
  assert.equal(readFileSync(ficheiro(dir), 'utf8'), gravado);
});

test('poucas linhas (layout a meio, página cortada) rebentam sem tocar no ficheiro', async () => {
  const { dir, url } = raiz();
  await assert.rejects(executar({ fetchFn: pagina(HTML), raiz: url, agora: new Date(), minimo: 30 }), /só 3 bosses/);
  assert.equal(existsSync(ficheiro(dir)), false);
});

test('o desafio do Cloudflare rebenta com a razão certa', async () => {
  const { url } = raiz();
  await assert.rejects(
    executar({ fetchFn: pagina('x', 403, { 'cf-mitigated': 'challenge' }), raiz: url, agora: new Date(), minimo: 3 }),
    /challenge do Cloudflare/,
  );
});
