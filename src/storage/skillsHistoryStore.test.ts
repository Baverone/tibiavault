// A escrita no GitHub do histórico dos skills (20/11/2026), com um fetch
// falso: nenhum pedido sai daqui.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendReading,
  changeEvents,
  decodeUtf8Base64,
  encodeUtf8Base64,
  loadReadings,
} from './skillsHistoryStore.ts';
import type { SkillReading } from '../domain/skillsHistory.ts';

interface Call {
  method: string;
  url: string;
  body?: { message: string; content: string; sha?: string; branch: string };
  auth?: string;
}

function fakeGithub(responses: (Response | ((call: Call) => Response))[]) {
  const calls: Call[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    const call: Call = {
      method: init?.method ?? 'GET',
      url,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      auth: (init?.headers as Record<string, string> | undefined)?.Authorization,
    };
    calls.push(call);
    const next = responses.shift();
    if (!next) throw new Error('pedido a mais');
    return typeof next === 'function' ? next(call) : next;
  }) as typeof fetch;
  return { calls, fetchFn };
}

const ficheiro = (data: unknown, sha = 'sha1') =>
  new Response(JSON.stringify({ sha, content: encodeUtf8Base64(JSON.stringify(data)) }), { status: 200 });
const leitura = (timestamp: number, level: number): SkillReading => ({
  timestamp,
  loyaltyBonusPercent: 0,
  skills: { magic: { level, percentMissing: 50 } },
});

test('base64 com acentos vai e volta', () => {
  const texto = 'Evento «Double Skill» — São Martinho';
  assert.equal(decodeUtf8Base64(encodeUtf8Base64(texto)), texto);
});

test('sem ficheiro ainda (404) o histórico está vazio', async () => {
  const { fetchFn, calls } = fakeGithub([new Response('', { status: 404 })]);
  assert.deepEqual(await loadReadings('exalted-monk', null, fetchFn), []);
  assert.match(calls[0].url, /api\.github\.com\/repos\/Baverone\/tibiavault\/contents\/data\/skills-history\/exalted-monk\.json\?ref=main/);
  assert.equal(calls[0].auth, undefined);
});

test('gravar junta a leitura ao que lá está, com o sha e a chave', async () => {
  const { fetchFn, calls } = fakeGithub([ficheiro([leitura(1, 80)]), new Response('{}', { status: 200 })]);
  const tudo = await appendReading('exalted-monk', leitura(2, 81), 'chave', fetchFn);
  assert.deepEqual(tudo.map((r) => r.timestamp), [1, 2]);
  const put = calls[1];
  assert.equal(put.method, 'PUT');
  assert.equal(put.auth, 'Bearer chave');
  assert.equal(put.body!.sha, 'sha1');
  assert.equal(put.body!.branch, 'main');
  assert.deepEqual(JSON.parse(decodeUtf8Base64(put.body!.content)).map((r: SkillReading) => r.timestamp), [1, 2]);
});

test('primeira leitura: grava sem sha', async () => {
  const { fetchFn, calls } = fakeGithub([new Response('', { status: 404 }), new Response('{}', { status: 201 })]);
  await appendReading('royal-paladin', leitura(5, 90), 'chave', fetchFn);
  assert.equal(calls[1].body!.sha, undefined);
});

test('outro aparelho gravou ao mesmo tempo (409): lê outra vez e não perde a dele', async () => {
  const { fetchFn, calls } = fakeGithub([
    ficheiro([leitura(1, 80)], 'sha1'),
    new Response('{}', { status: 409 }),
    ficheiro([leitura(1, 80), leitura(2, 81)], 'sha2'),
    new Response('{}', { status: 200 }),
  ]);
  const tudo = await appendReading('exalted-monk', leitura(3, 82), 'chave', fetchFn);
  assert.deepEqual(tudo.map((r) => r.timestamp), [1, 2, 3]);
  assert.equal(calls[3].body!.sha, 'sha2');
});

test('chave recusada: diz que é a chave', async () => {
  const { fetchFn } = fakeGithub([ficheiro([]), new Response('{}', { status: 403 })]);
  await assert.rejects(appendReading('exalted-monk', leitura(1, 80), 'má', fetchFn), /chave do GitHub/);
});

test('sem rede: diz que não gravou', async () => {
  const fetchFn = (async () => {
    throw new TypeError('Failed to fetch');
  }) as typeof fetch;
  await assert.rejects(appendReading('exalted-monk', leitura(1, 80), 'chave', fetchFn), /sem ligação/);
});

test('eventos: juntar e tirar mexe só no que se pediu', async () => {
  const a = { id: 'a', name: 'Double Skill', start: '2026-11-21', end: '2026-11-24' };
  const b = { id: 'b', name: 'Outro', start: '2026-12-01', end: '2026-12-02' };
  const { fetchFn } = fakeGithub([ficheiro([a]), new Response('{}', { status: 200 })]);
  assert.deepEqual(await changeEvents({ add: b }, 'chave', fetchFn), [a, b]);
  const tirar = fakeGithub([ficheiro([a, b]), new Response('{}', { status: 200 })]);
  assert.deepEqual(await changeEvents({ remove: 'a' }, 'chave', tirar.fetchFn), [b]);
});
