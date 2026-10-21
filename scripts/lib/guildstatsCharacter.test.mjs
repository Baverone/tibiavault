// Testes da recolha pela página de personagem do guildstats. Sem rede: o HTML
// vem de fixtures/, cortado das páginas reais lidas a 21/10/2026 (a URL e a
// hora estão num comentário no topo de cada uma).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  USER_AGENT,
  characterUrl,
  checkExperience,
  fetchCharacterPage,
  parseCharacterPage,
  readCharacter,
  syncFromGuildstatsCharacter,
} from './guildstatsCharacter.mjs';
import { runCollection, syncFromHighscores } from './tibiaDataHighscores.mjs';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const BLUEY = readFileSync(join(FIXTURES, 'guildstats-character-bluey.html'), 'utf-8');
const BAVERONE = readFileSync(join(FIXTURES, 'guildstats-character-baverone.html'), 'utf-8');

// 11:05 em Lisboa (UTC+1 em outubro), depois do save de dia 21.
const now = () => new Date('2026-10-21T10:05:00Z');

/** Duplo do fetch: cada pedido recebe o próximo da lista (ou o último). */
function fakeFetch(...replies) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    const spec = replies[Math.min(calls.length, replies.length) - 1];
    if (spec instanceof Error) throw spec;
    if (spec instanceof Response) return spec;
    if (typeof spec === 'number') return new Response('erro', { status: spec });
    return new Response(spec, { status: 200, headers: { 'content-type': 'text/html' } });
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
  const dir = mkdtempSync(join(tmpdir(), 'guildstats-char-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('extrai o nível, o progresso e o total da página real do Bluey', () => {
  const page = parseCharacterPage(BLUEY);
  assert.deepEqual(page, {
    name: 'Bluey The Cat',
    world: 'Celesta',
    level: 600,
    nextLevel: 601,
    progress: 16_981_552,
    levelSpan: 17_910_200,
    experience: 3_581_151_352,
  });
  // e bate com a fórmula: 3.564.169.800 + 16.981.552
  checkExperience(page);
});

test('a página com outro aspecto (a do Baverone, "Level up!") falha alto em vez de inventar', () => {
  assert.throws(
    () => parseCharacterPage(BAVERONE),
    (error) => error.layout === true && error.transient === false && /mudou de aspecto.*to level/.test(error.message)
  );
});

test('uma página sem o cabeçalho da personagem falha alto', () => {
  assert.throws(() => parseCharacterPage('<html><body><h1>Bluey The Cat</h1></body></html>'), /não encontrei o rótulo "Level"/);
  assert.throws(() => parseCharacterPage('<html><body>Just a moment...</body></html>'), /sem <h1>/);
});

test('um número que não é número (célula mudada) falha alto', () => {
  assert.throws(
    () => parseCharacterPage(BLUEY.replace('16,981,552', '16.9M')),
    /o progresso não é um número \("16.9M"\)/
  );
});

test('o total que não bate com a tabela falha, com os três números na mensagem', () => {
  const html = BLUEY.replace('(3,581,151,352 exp)', '(3,581,151,353 exp)');
  assert.throws(
    () => checkExperience(parseCharacterPage(html)),
    (error) => {
      assert.equal(error.mismatch, true);
      assert.equal(error.transient, false);
      assert.match(error.message, /expDoNivel\(600\) = 3564169800/);
      assert.match(error.message, /progresso 16981552/);
      assert.match(error.message, /o total na página é 3581151353/);
      return true;
    }
  );
});

test('o salto para o nível seguinte também é confrontado com a fórmula', () => {
  const html = BLUEY.replace('17,910,200', '17,910,201');
  assert.throws(() => checkExperience(parseCharacterPage(html)), /o salto 600→601 na página é 17910201, pela fórmula é 17910200/);
});

test('pede a página com o User-Agent honesto (o de Chrome leva challenge)', async () => {
  const { impl, calls } = fakeFetch(BLUEY);
  await readCharacter('Bluey The Cat', { world: 'Celesta', fetchImpl: impl });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://guildstats.eu/character?nick=Bluey+The+Cat');
  assert.equal(calls[0].init.headers['User-Agent'], USER_AGENT);
  assert.match(USER_AGENT, /^TibiaVault\//);
  assert.equal(characterUrl('Bluey The Cat'), calls[0].url);
});

test('a página de outra personagem não entra no ficheiro do Bluey', async () => {
  const { impl } = fakeFetch(BLUEY.replace('<h1 class="text-3xl font-bold text-white">Bluey The Cat</h1>', '<h1>Bluey The Dog</h1>'));
  await assert.rejects(readCharacter('Bluey The Cat', { world: 'Celesta', fetchImpl: impl }), /a página é de "Bluey The Dog"/);
});

test('site em baixo: repete e, se continuar, falha como temporário', async () => {
  const { impl, calls } = fakeFetch(503);
  await assert.rejects(fetchCharacterPage('Bluey The Cat', { fetchImpl: impl, retryDelayMs: 0 }), (error) => {
    assert.equal(error.transient, true);
    assert.match(error.message, /3 tentativas.*HTTP 503/);
    return true;
  });
  assert.equal(calls.length, 3);
});

test('sem rede: repete, e uma falha passageira não chega a ser erro', async () => {
  const { impl, calls } = fakeFetch(new TypeError('fetch failed'), BLUEY);
  const page = await readCharacter('Bluey The Cat', { world: 'Celesta', fetchImpl: impl, retryDelayMs: 0 });
  assert.equal(page.experience, 3_581_151_352);
  assert.equal(calls.length, 2);
});

test('o challenge do Cloudflare falha à primeira, sem repetir, e diz o que é', async () => {
  const challenge = () => new Response('<title>Just a moment...</title>', { status: 403, headers: { 'cf-mitigated': 'challenge' } });
  const { impl, calls } = fakeFetch(challenge());
  await assert.rejects(fetchCharacterPage('Bluey The Cat', { fetchImpl: impl, retryDelayMs: 0 }), (error) => {
    assert.equal(error.transient, false);
    assert.match(error.message, /1 tentativa.*challenge do Cloudflare/);
    return true;
  });
  assert.equal(calls.length, 1);
});

test(
  'grava a linha do dia com a proveniência, a seguir ao que lá está, sem apagar nada nem inventar o buraco',
  quiet(async (t) => {
    const dir = tempDir(t);
    const antigo = [
      { date: '2026-10-13', level: 600, experience: 3_581_151_352, scrapedAt: '2026-10-14T09:05:19.348Z' },
    ];
    writeFileSync(join(dir, 'exalted-monk.json'), `${JSON.stringify(antigo, null, 2)}\n`);
    const { impl } = fakeFetch(BLUEY);

    const result = await syncFromGuildstatsCharacter({
      id: 'exalted-monk', nick: 'Bluey The Cat', world: 'Celesta', dataDir: dir, fetchImpl: impl, now,
    });

    assert.equal(result.added, 1);
    const saved = JSON.parse(readFileSync(join(dir, 'exalted-monk.json'), 'utf-8'));
    // a leitura de dia 21 depois do save é a linha de 20; 14 a 19 ficam em falta
    assert.deepEqual(saved, [
      ...antigo,
      {
        date: '2026-10-20',
        level: 600,
        experience: 3_581_151_352,
        scrapedAt: '2026-10-21T10:05:00.000Z',
        source: 'guildstats',
      },
    ]);

    const again = await syncFromGuildstatsCharacter({
      id: 'exalted-monk', nick: 'Bluey The Cat', world: 'Celesta', dataDir: dir, fetchImpl: impl, now,
    });
    assert.equal(again.added, 0);
    assert.equal(JSON.parse(readFileSync(join(dir, 'exalted-monk.json'), 'utf-8')).length, 2);
  })
);

test(
  'um total que não bate não grava nada',
  quiet(async (t) => {
    const dir = tempDir(t);
    const { impl } = fakeFetch(BLUEY.replace('(3,581,151,352 exp)', '(3,581,151,353 exp)'));
    await assert.rejects(
      syncFromGuildstatsCharacter({ id: 'exalted-monk', nick: 'Bluey The Cat', world: 'Celesta', dataDir: dir, fetchImpl: impl, now }),
      /não batem com a tabela/
    );
    assert.throws(() => readFileSync(join(dir, 'exalted-monk.json')), /ENOENT/);
  })
);

test(
  'a recolha completa: os dois bonecos, cada um pela sua fonte e com a proveniência',
  quiet(async (t) => {
    const dir = tempDir(t);
    const highscores = {
      highscores: {
        highscore_age: 5,
        highscore_list: [{ rank: 612, name: 'Baverone', level: 1176, value: 27_001_000_000 }],
        highscore_page: { current_page: 1, total_pages: 1 },
      },
      information: { timestamp: '2026-10-21T10:00:00Z' },
    };
    const impl = async (url) =>
      url.startsWith('https://guildstats.eu/')
        ? new Response(BLUEY, { status: 200 })
        : new Response(JSON.stringify(highscores), { status: 200 });

    let exitCode;
    const result = await runCollection({
      players: [
        { id: 'royal-paladin', nick: 'Baverone', world: 'Celesta', source: 'tibiadata' },
        { id: 'exalted-monk', nick: 'Bluey The Cat', world: 'Celesta', source: 'guildstats' },
      ],
      syncers: { tibiadata: syncFromHighscores, guildstats: syncFromGuildstatsCharacter },
      dataDir: dir, fetchImpl: impl, now, force: true,
    }).finally(() => {
      exitCode = process.exitCode;
    });

    assert.equal(exitCode ?? 0, 0);
    assert.deepEqual(result.covered.map((p) => p.nick), ['Baverone', 'Bluey The Cat']);
    const read = (id) => JSON.parse(readFileSync(join(dir, `${id}.json`), 'utf-8'));
    assert.deepEqual(read('royal-paladin').map((e) => [e.date, e.source]), [['2026-10-20', 'highscores']]);
    assert.deepEqual(read('exalted-monk').map((e) => [e.date, e.source, e.experience]), [
      ['2026-10-20', 'guildstats', 3_581_151_352],
    ]);
  })
);
