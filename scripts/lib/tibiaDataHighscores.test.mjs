// Testes da recolha pelos highscores do TibiaData. Sem rede: o fetch é um
// duplo que serve páginas montadas aqui, com a forma que a API v4 devolvia a
// 16/10/2026.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  findInHighscores,
  historyDateFor,
  runCollection,
  syncFromHighscores,
  tibiaDayOf,
} from './tibiaDataHighscores.mjs';

// 11:00 em Lisboa (UTC+1 em outubro), depois do save de dia 16.
const API_TIME = '2026-10-16T10:00:00Z';
const now = () => new Date('2026-10-16T10:05:00Z');

function page(number, entries, { totalPages = 3, age = 5, timestamp = API_TIME } = {}) {
  return {
    highscores: {
      world: 'Celesta',
      category: 'experience',
      vocation: 'all',
      highscore_age: age,
      highscore_list: entries,
      highscore_page: { current_page: number, total_pages: totalPages, total_records: totalPages * 50 },
    },
    information: { timestamp },
  };
}

const someone = (rank, name, level, value) => ({ rank, name, vocation: 'Elite Knight', world: 'Celesta', level, value });

const BAVERONE = someone(612, 'Baverone', 1174, 26_885_267_055);

/** Duplo do fetch: `pages[n]` é o corpo da página n, ou uma função que decide. */
function fakeFetch(pages) {
  const calls = [];
  const impl = async (url) => {
    const number = Number(url.split('/').pop());
    calls.push(number);
    const spec = typeof pages[number] === 'function' ? pages[number](calls.length) : pages[number];
    if (spec instanceof Error) throw spec;
    if (typeof spec === 'number') return new Response('erro', { status: spec });
    if (typeof spec === 'string') return new Response(spec, { status: 200 });
    return new Response(JSON.stringify(spec), { status: 200 });
  };
  return { impl, calls };
}

const quiet = (fn) => async (t) => {
  const { log, warn, error } = console;
  console.log = console.warn = console.error = () => {};
  try {
    await fn(t);
  } finally {
    Object.assign(console, { log, warn, error });
    process.exitCode = 0;
  }
};

function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), 'tibiadata-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('encontra o personagem e pára de pedir páginas assim que o encontra', async () => {
  const { impl, calls } = fakeFetch({
    1: page(1, [someone(1, 'Elder Reno', 2761, 350_165_666_785)]),
    2: page(2, [someone(600, 'Outro', 1180, 27_000_000_000), BAVERONE]),
    3: page(3, [someone(1000, 'Ultimo', 670, 4_800_000_000)]),
  });

  const found = await findInHighscores('Baverone', { world: 'Celesta', fetchImpl: impl, now });

  assert.equal(found.rank, 612);
  assert.equal(found.page, 2);
  assert.equal(found.level, 1174);
  assert.equal(found.experience, 26_885_267_055);
  assert.deepEqual(calls, [1, 2]);
  // a hora da leitura é a da API menos o highscore_age, não a do pedido
  assert.equal(found.snapshotAt.toISOString(), '2026-10-16T09:55:00.000Z');
});

test('não estar em nenhuma página é um erro alto, não "sem dados"', async () => {
  const { impl, calls } = fakeFetch({
    1: page(1, [someone(1, 'Elder Reno', 2761, 1)], { totalPages: 2 }),
    2: page(2, [someone(1000, 'Ultimo', 670, 4_800_000_000)], { totalPages: 2 }),
  });

  await assert.rejects(findInHighscores('Bluey The Cat', { world: 'Celesta', fetchImpl: impl, now }), (error) => {
    assert.equal(error.notFound, true);
    assert.equal(error.transient, false);
    assert.match(error.message, /nenhuma das 2 página/);
    assert.match(error.message, /posto 1000.*nível 670/);
    return true;
  });
  assert.deepEqual(calls, [1, 2]);
});

test('API em baixo: repete e, se continuar, falha como temporário', async () => {
  const { impl, calls } = fakeFetch({ 1: 503 });

  await assert.rejects(
    findInHighscores('Baverone', { world: 'Celesta', fetchImpl: impl, retryDelayMs: 0, now }),
    (error) => {
      assert.equal(error.transient, true);
      assert.match(error.message, /3 tentativas.*HTTP 503/);
      return true;
    }
  );
  assert.deepEqual(calls, [1, 1, 1]);
});

test('uma falha de rede passageira é repetida e não chega a ser erro', async () => {
  const { impl, calls } = fakeFetch({
    1: (n) => (n === 1 ? new TypeError('fetch failed') : n === 2 ? '<html>502</html>' : page(1, [BAVERONE], { totalPages: 1 })),
  });

  const found = await findInHighscores('Baverone', { world: 'Celesta', fetchImpl: impl, retryDelayMs: 0, now });

  assert.equal(found.rank, 612);
  assert.deepEqual(calls, [1, 1, 1]);
});

test('formato mudado falha sem repetir', async () => {
  const { impl, calls } = fakeFetch({ 1: { highscores: { list: [] } } });

  await assert.rejects(findInHighscores('Baverone', { world: 'Celesta', fetchImpl: impl, retryDelayMs: 0, now }), (error) => {
    assert.equal(error.transient, false);
    assert.match(error.message, /formato inesperado/);
    return true;
  });
  assert.deepEqual(calls, [1]);
});

test('a leitura de hoje depois do save é a linha de ontem, como no guildstats', () => {
  assert.equal(tibiaDayOf(new Date('2026-10-16T07:59:00Z')), '2026-10-15'); // 08:59 Lisboa
  assert.equal(tibiaDayOf(new Date('2026-10-16T08:00:00Z')), '2026-10-16'); // 09:00 Lisboa
  assert.equal(historyDateFor(new Date('2026-10-16T09:55:00Z')), '2026-10-15');
  // inverno (UTC+0): o save é às 09:00 UTC
  assert.equal(tibiaDayOf(new Date('2026-12-01T08:59:00Z')), '2026-11-30');
});

test(
  'escreve no formato do histórico, a seguir ao que lá está, sem apagar nada',
  quiet(async (t) => {
    const dir = tempDir(t);
    const antigo = [{ date: '2026-10-13', level: 1174, experience: 26_885_267_055, scrapedAt: '2026-10-14T09:05:17.170Z' }];
    writeFileSync(join(dir, 'royal-paladin.json'), `${JSON.stringify(antigo, null, 2)}\n`);
    const { impl } = fakeFetch({ 1: page(1, [someone(612, 'Baverone', 1174, 26_900_000_000)], { totalPages: 1 }) });

    const result = await syncFromHighscores({
      id: 'royal-paladin', nick: 'Baverone', world: 'Celesta', dataDir: dir, fetchImpl: impl, now,
    });

    assert.equal(result.added, 1);
    const saved = JSON.parse(readFileSync(join(dir, 'royal-paladin.json'), 'utf-8'));
    assert.deepEqual(saved, [
      ...antigo,
      { date: '2026-10-15', level: 1174, experience: 26_900_000_000, scrapedAt: '2026-10-16T10:05:00.000Z' },
    ]);

    // segunda corrida no mesmo dia: não mexe
    const again = await syncFromHighscores({
      id: 'royal-paladin', nick: 'Baverone', world: 'Celesta', dataDir: dir, fetchImpl: impl, now,
    });
    assert.equal(again.added, 0);
    assert.equal(JSON.parse(readFileSync(join(dir, 'royal-paladin.json'), 'utf-8')).length, 2);
  })
);

test(
  'lista ainda de antes do save não é gravada como o dia de ontem',
  quiet(async (t) => {
    const dir = tempDir(t);
    // atualizada às 08:50 Lisboa, antes do save; o pedido é às 09:10
    const { impl } = fakeFetch({ 1: page(1, [BAVERONE], { totalPages: 1, timestamp: '2026-10-16T08:10:00Z', age: 20 }) });

    await assert.rejects(
      syncFromHighscores({
        id: 'royal-paladin', nick: 'Baverone', world: 'Celesta', dataDir: dir, fetchImpl: impl,
        now: () => new Date('2026-10-16T08:10:00Z'),
      }),
      (error) => error.transient === true && /antes do server save/.test(error.message)
    );
  })
);

test('quem está à espera é dito no output e não pinta a corrida de vermelho', async (t) => {
  const dir = tempDir(t);
  const { impl } = fakeFetch({ 1: page(1, [BAVERONE], { totalPages: 1 }) });
  const lines = [];
  const { log, error } = console;
  console.log = console.error = (...args) => lines.push(args.join(' '));
  let result;
  try {
    result = await runCollection({
      players: [
        { id: 'royal-paladin', nick: 'Baverone', world: 'Celesta', source: 'tibiadata' },
        { id: 'exalted-monk', nick: 'Bluey The Cat', world: 'Celesta', source: null, waiting: 'fora do top 1000' },
      ],
      dataDir: dir, fetchImpl: impl, now, force: true,
    });
  } finally {
    Object.assign(console, { log, error });
  }

  assert.equal(process.exitCode ?? 0, 0);
  assert.deepEqual(result.covered.map((p) => p.nick), ['Baverone']);
  assert.deepEqual(result.waiting.map((p) => p.nick), ['Bluey The Cat']);
  const output = lines.join('\n');
  assert.match(output, /Cobertos .*: Baverone/);
  assert.match(output, /À ESPERA — Bluey The Cat \(exalted-monk\) NÃO está a ser recolhido: fora do top 1000/);
});

test(
  'um personagem coberto que falha sai com código 1',
  quiet(async (t) => {
    const dir = tempDir(t);
    const { impl } = fakeFetch({ 1: 503 });
    let exitCode;
    const result = await runCollection({
      players: [{ id: 'royal-paladin', nick: 'Baverone', world: 'Celesta', source: 'tibiadata' }],
      dataDir: dir, fetchImpl: impl, retryDelayMs: 0, now, force: true,
    }).finally(() => {
      exitCode = process.exitCode;
    });

    assert.equal(exitCode, 1);
    assert.deepEqual(result.failed.map((p) => p.nick), ['Baverone']);
  })
);
