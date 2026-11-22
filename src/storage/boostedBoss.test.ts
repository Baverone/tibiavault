// O boss boosted do dia, da TibiaData (22/11/2026). Se a TibiaData falhar, a
// página funciona sem ele: a função devolve null e nunca rebenta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lerBoosted } from './boostedBoss.ts';

const resposta = (body: string, status = 200) => (async () => new Response(body, { status })) as unknown as typeof fetch;

test('lê o nome do boosted', async () => {
  const body = JSON.stringify({ boostable_bosses: { boosted: { name: 'Unaz The Mean', featured: true }, boostable_boss_list: [] } });
  assert.equal(await lerBoosted(resposta(body)), 'Unaz The Mean');
});

test('erro, JSON inválido ou sem boosted → null', async () => {
  assert.equal(await lerBoosted(resposta('{}', 500)), null);
  assert.equal(await lerBoosted(resposta('<html>')), null);
  assert.equal(await lerBoosted(resposta(JSON.stringify({ boostable_bosses: {} }))), null);
  const semRede = (async () => {
    throw new Error('offline');
  }) as unknown as typeof fetch;
  assert.equal(await lerBoosted(semRede), null);
});
