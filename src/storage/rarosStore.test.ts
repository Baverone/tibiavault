// A leitura dos raros do repositório (22/11/2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { lerRaros } from './rarosStore.ts';

const resposta = (status: number, corpo: string) => (async () => new Response(corpo, { status })) as typeof fetch;

test('404 = ainda não há leitura (null)', async () => {
  assert.equal(await lerRaros(resposta(404, 'Not Found')), null);
});

test('lê e limpa o ficheiro', async () => {
  const corpo = JSON.stringify({ lidoEm: '2026-11-22T10:10:00Z', fonte: 'f', bosses: [{ nome: 'Tyrn', previsao: { tipo: 'baixa' } }] });
  const r = await lerRaros(resposta(200, corpo));
  assert.deepEqual(r?.bosses.map((b) => b.nome), ['Tyrn']);
});

test('rede em baixo, outro erro HTTP ou ficheiro estragado rebentam com a razão', async () => {
  await assert.rejects(lerRaros((async () => { throw new TypeError('fetch failed'); }) as typeof fetch), /sem ligação/);
  await assert.rejects(lerRaros(resposta(500, 'x')), /500/);
  await assert.rejects(lerRaros(resposta(200, '{nao e json')), /estragado/);
  await assert.rejects(lerRaros(resposta(200, '{"bosses":3}')), /estragado/);
});
