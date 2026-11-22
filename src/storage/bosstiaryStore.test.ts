// A gravação do Bosstiary no GitHub (22/11/2026), com um fetch falso.
import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarBosstiary, gravarAlteracoes } from './bosstiaryStore.ts';
import { decodeUtf8Base64 } from './githubContents.ts';
import { fakeGithub, ficheiro } from './fakeGithub.testutil.ts';

const QUANDO = '2026-11-22T20:00:00.000Z';

test('sem ficheiro ainda (404) o Bosstiary está vazio', async () => {
  const { fetchFn, calls } = fakeGithub([new Response('', { status: 404 })]);
  assert.deepEqual(await carregarBosstiary('royal-paladin', null, fetchFn), { bosses: {}, pontosJogo: null });
  assert.match(calls[0].url, /data\/bosstiary\/royal-paladin\.json/);
});

test('gravar leva o ficheiro com as alterações aplicadas', async () => {
  const { fetchFn, calls } = fakeGithub([new Response('', { status: 404 }), new Response('{}', { status: 201 })]);
  const out = await gravarAlteracoes('exalted-monk', [{ tipo: 'kill', id: 'drume', quantas: 1, quando: QUANDO }], 'tok', fetchFn);
  assert.equal(out.bosses.drume.kills, 1);
  const put = calls[1];
  assert.equal(put.method, 'PUT');
  assert.equal(put.body!.message, 'chore: bosstiary exalted-monk (1 alterações)');
  assert.equal(JSON.parse(decodeUtf8Base64(put.body!.content)).bosses.drume.kills, 1);
});

test('dois aparelhos ao mesmo tempo: em 409 relê e as duas kills ficam', async () => {
  const { fetchFn, calls } = fakeGithub([
    ficheiro({ bosses: {}, pontosJogo: null }, 'a'),
    new Response('{}', { status: 409 }),
    // Entretanto o outro aparelho gravou 5 kills no Oberon.
    ficheiro({ bosses: { 'grand-master-oberon': { kills: 5, ultimaKill: QUANDO, acesso: true } }, pontosJogo: null }, 'b'),
    new Response('{}', { status: 200 }),
  ]);
  const out = await gravarAlteracoes('royal-paladin', [{ tipo: 'kill', id: 'drume', quantas: 1, quando: QUANDO }], 'tok', fetchFn);
  assert.equal(out.bosses['grand-master-oberon'].kills, 5);
  assert.equal(out.bosses.drume.kills, 1);
  const gravado = JSON.parse(decodeUtf8Base64(calls[3].body!.content));
  assert.equal(gravado.bosses['grand-master-oberon'].kills, 5);
  assert.equal(gravado.bosses.drume.kills, 1);
  assert.equal(calls[3].body!.sha, 'b');
});
