// O acesso comum à API de conteúdos do GitHub (22/11/2026: sai do
// skillsHistoryStore para o Bosstiary o usar também).
import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeUtf8Base64, getFile, updateFile } from './githubContents.ts';
import { fakeGithub, ficheiro } from './fakeGithub.testutil.ts';

test('ficheiro que não existe (404): sem sha e data null', async () => {
  const { fetchFn } = fakeGithub([new Response('', { status: 404 })]);
  assert.deepEqual(await getFile('data/x.json', null, fetchFn), { sha: null, data: null });
});

test('updateFile em 409 lê outra vez e aplica a alteração sobre o novo', async () => {
  const { fetchFn, calls } = fakeGithub([
    ficheiro({ n: 1 }, 'a'),
    new Response('{}', { status: 409 }),
    ficheiro({ n: 5 }, 'b'),
    new Response('{}', { status: 200 }),
  ]);
  const out = await updateFile('data/x.json', (cur) => ({ n: (cur as { n: number }).n + 1 }), 'msg', 'tok', fetchFn);
  assert.deepEqual(out, { n: 6 });
  const ultimo = calls[3].body!;
  assert.equal(ultimo.sha, 'b');
  assert.deepEqual(JSON.parse(decodeUtf8Base64(ultimo.content)), { n: 6 });
});
