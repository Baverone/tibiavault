// Testes do parser da tabela do guildstats e da formula de experiencia.
// Sem rede: o HTML e uma fixture aqui ao lado, copiada da forma que o
// guildstats serve desde o redesenho de agosto de 2026 (duas spans por
// celula, a segunda com a abreviatura para telemovel).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  LOCK_STALE_MS,
  USER_AGENT,
  experienceForLevel,
  fetchExperienceRows,
  levelForExperience,
  loadExistingHistory,
  mergeRows,
  missingDates,
  parseExperienceRows,
  recoverStaleLock,
  updateHistory,
  withHistoryLock,
  writeFileAtomic,
} from './guildstatsHistory.mjs';

// Um pid que ja nao existe: o de um processo que acabou de terminar.
const DEAD_PID = spawnSync(process.execPath, ['-e', '']).pid;
const DEAD = JSON.stringify({ pid: DEAD_PID });

// 25/10/2026: um ficheiro estragado dava [] e era reescrito só com a linha de
// hoje. Numa pasta temporária, nunca no data/ verdadeiro.
test('loadExistingHistory recusa um ficheiro estragado em vez de o dar por vazio', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tibia-hist-'));
  assert.deepEqual(loadExistingHistory(dir, 'nao-existe'), []);

  const conflito = '<<<<<<< HEAD\n[{"date":"2026-10-24"}]\n=======\n[]\n>>>>>>> outro\n';
  writeFileSync(join(dir, 'conflito.json'), conflito);
  assert.throws(() => loadExistingHistory(dir, 'conflito'), /não é JSON válido/);
  assert.equal(readFileSync(join(dir, 'conflito.json'), 'utf-8'), conflito);

  writeFileSync(join(dir, 'objecto.json'), '{"date":"2026-10-24"}');
  assert.throws(() => loadExistingHistory(dir, 'objecto'), /não é uma lista/);

  writeFileSync(join(dir, 'bom.json'), '[{"date":"2026-10-24","level":1,"experience":0}]');
  assert.equal(loadExistingHistory(dir, 'bom').length, 1);
});

const linha = (data, curta, nivel, xp, xpCurta) => `
  <tr>
    <td><span>${data}</span><span>${curta}</span></td>
    <td>1</td>
    <td>2</td>
    <td>${nivel}</td>
    <td><span>${xp}</span><span>${xpCurta}</span></td>
  </tr>`;

const tabela = (...linhas) => `<table><tbody>${linhas.join('')}</tbody></table>`;

test('le a tabela toda, e nao so a linha mais recente', () => {
  const html = tabela(
    linha('2026-09-05', '09-05', '1150', '26,552,190,000', '26.5B'),
    linha('2026-09-04', '09-04', '1149 (+1)', '26,500,000,000', '26.5B')
  );

  assert.deepEqual(parseExperienceRows(html), [
    { date: '2026-09-05', level: 1150, experience: 26552190000 },
    { date: '2026-09-04', level: 1149, experience: 26500000000 },
  ]);
});

test('celula de experiencia vazia nao vira um dia de 0 XP', () => {
  // Number('') e 0, nao NaN: sem o guarda, esta linha entrava no historico
  // como um dia legitimo de zero experiencia e ficava la para sempre.
  const html = tabela(
    linha('2026-09-05', '09-05', '1150', '26,552,190,000', '26.5B'),
    linha('2026-09-04', '09-04', '1149', '', '')
  );

  assert.deepEqual(parseExperienceRows(html), [{ date: '2026-09-05', level: 1150, experience: 26552190000 }]);
});

test('linhas com data ou nivel ilegiveis sao ignoradas', () => {
  const html = tabela(
    linha('Total', '', '', '999', ''),
    linha('2026-09-05', '09-05', '1150', '26,552,190,000', '26.5B')
  );

  assert.deepEqual(parseExperienceRows(html), [{ date: '2026-09-05', level: 1150, experience: 26552190000 }]);
});

test('uma tabela sem linhas parseaveis grita em vez de devolver vazio', () => {
  assert.throws(() => parseExperienceRows(tabela(linha('Total', '', '', '999', ''))), /layout pode ter mudado/);
  assert.throws(() => parseExperienceRows('<p>403 Forbidden</p>'), /layout pode ter mudado/);
});

// Substitui o fetch global durante um teste e guarda os pedidos feitos.
async function comFetchFalso(responder, corpo) {
  const original = globalThis.fetch;
  const pedidos = [];
  globalThis.fetch = async (url, init = {}) => {
    pedidos.push({ url: String(url), headers: new Headers(init.headers) });
    return responder();
  };
  try {
    await corpo(pedidos);
  } finally {
    globalThis.fetch = original;
  }
}

test('todos os pedidos ao guildstats levam User-Agent', async () => {
  // O fetch do node nao manda UA de browser por si; se REQUEST_HEADERS deixar
  // de ser passado, isto apanha antes de o guildstats o apanhar.
  const html = tabela(linha('2026-10-14', '10-14', '1174', '26,885,267,055', '26.9B'));
  await comFetchFalso(
    () => new Response(html, { status: 200 }),
    async (pedidos) => {
      await fetchExperienceRows('Bluey The Cat', { attempts: 1 });
      assert.equal(pedidos.length, 1);
      assert.match(pedidos[0].url, /^https:\/\/guildstats\.eu\//);
      assert.ok(pedidos[0].headers.get('user-agent'), 'pedido saiu sem User-Agent');
      assert.equal(pedidos[0].headers.get('user-agent'), USER_AGENT);
    }
  );
});

test('403 do challenge do Cloudflare diz o que e e nao repete', async () => {
  await comFetchFalso(
    () => new Response('<title>Just a moment...</title>', { status: 403, headers: { 'cf-mitigated': 'challenge' } }),
    async (pedidos) => {
      await assert.rejects(fetchExperienceRows('Baverone', { attempts: 3, retryDelayMs: 0 }), (error) => {
        assert.match(error.message, /403 — challenge do Cloudflare/);
        assert.doesNotMatch(error.message, /IP do runner|GitHub Actions/);
        return true;
      });
      assert.equal(pedidos.length, 1);
    }
  );
});

test('403 simples aponta para os cabecalhos, nao para o IP', async () => {
  await comFetchFalso(
    () => new Response('Forbidden', { status: 403 }),
    async (pedidos) => {
      await assert.rejects(
        fetchExperienceRows('Baverone', { attempts: 2, retryDelayMs: 0 }),
        /403 — o guildstats recusou o pedido, provavelmente por causa dos cabeçalhos/
      );
      assert.equal(pedidos.length, 2);
    }
  );
});

test('a formula de experiencia bate certo com a tabela oficial', () => {
  assert.equal(experienceForLevel(1), 0);
  assert.equal(experienceForLevel(2), 100);
  assert.equal(experienceForLevel(8), 4200);
  assert.equal(levelForExperience(0), 1);
  assert.equal(levelForExperience(99), 1);
  assert.equal(levelForExperience(100), 2);
  assert.equal(levelForExperience(experienceForLevel(1150)), 1150);
  assert.equal(levelForExperience(experienceForLevel(1150) - 1), 1149);
});

// 20/10/2026 (T2 da auditoria): o Baverone ficou sem o dia 14/10 entre 13/10 e
// 15/10. Um buraco no MEIO da série tem de ser preenchido quando a fonte o
// traz, e não só os dias depois do último — sem tocar nos que já lá estão.
test('mergeRows preenche buracos no meio da série e nunca sobrescreve', () => {
  const ja = [
    { date: '2026-10-13', level: 1174, experience: 100, scrapedAt: 'a' },
    { date: '2026-10-15', level: 1174, experience: 300, scrapedAt: 'b' },
  ];
  const fonte = [
    { date: '2026-10-16', level: 1175, experience: 400 },
    { date: '2026-10-15', level: 1174, experience: 999 },
    { date: '2026-10-14', level: 1174, experience: 200 },
  ];
  const { history, added } = mergeRows(ja, fonte, 'agora');
  assert.deepEqual(added.map((row) => row.date), ['2026-10-14', '2026-10-16']);
  assert.deepEqual(history.map((row) => row.date), ['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16']);
  assert.equal(history[2].experience, 300, 'o 15/10 que já estava não pode ser sobrescrito');
  assert.equal(history[1].scrapedAt, 'agora');
  assert.equal(ja.length, 2, 'não mexe no array de entrada');
});

// 12/11/2026 (proposta 3 da auditoria): gravacao atomica e trinco.
test('writeFileAtomic: se a troca falhar, o ficheiro antigo fica inteiro e o temporario sai', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'hist-atomic-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'a.json');
  writeFileSync(path, '[1]\n');
  assert.throws(
    () =>
      writeFileAtomic(path, '[1,2]\n', {
        renameImpl: () => {
          throw Object.assign(new Error('disco cheio'), { code: 'ENOSPC' });
        },
      }),
    /disco cheio/
  );
  assert.equal(readFileSync(path, 'utf-8'), '[1]\n');
  assert.deepEqual(readdirSync(dir), ['a.json']);
});

test('writeFileAtomic: se a escrita falhar antes da troca, tambem nao sobra temporario', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'hist-atomic-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'a.json');
  writeFileSync(path, '[1]\n');
  assert.throws(
    () =>
      writeFileAtomic(path, '[1,2]\n', {
        writeImpl: () => {
          throw Object.assign(new Error('disco cheio'), { code: 'ENOSPC' });
        },
      }),
    /disco cheio/
  );
  assert.equal(readFileSync(path, 'utf-8'), '[1]\n');
  assert.deepEqual(readdirSync(dir), ['a.json']);
});

test('writeFileAtomic repete quando o Windows tem o ficheiro ocupado por instantes', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'hist-atomic-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'a.json');
  let tries = 0;
  writeFileAtomic(path, '[3]\n', {
    renameImpl: (from, to) => {
      tries++;
      if (tries < 3) throw Object.assign(new Error('ocupado'), { code: 'EBUSY' });
      renameSync(from, to);
    },
  });
  assert.equal(tries, 3);
  assert.equal(readFileSync(path, 'utf-8'), '[3]\n');
});

test('updateHistory grava dentro do trinco e tira-o no fim, mesmo quando falha', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'hist-lock-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  updateHistory(dir, 'boneco', (history) => {
    assert.ok(existsSync(join(dir, 'boneco.json.lock')));
    return [...history, { date: '2026-11-11', level: 1, experience: 0 }];
  });
  assert.equal(JSON.parse(readFileSync(join(dir, 'boneco.json'), 'utf-8')).length, 1);
  assert.equal(updateHistory(dir, 'boneco', () => null), null);
  assert.throws(() => updateHistory(dir, 'boneco', () => { throw new Error('rebentou'); }), /rebentou/);
  assert.deepEqual(readdirSync(dir), ['boneco.json']);
});

test('withHistoryLock: com o trinco de outro processo, espera e falha como temporario', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'hist-lock-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'boneco.json.lock'), '{"pid":1}');
  let ran = false;
  assert.throws(
    () => withHistoryLock(dir, 'boneco', () => { ran = true; }, { waitMs: 300, pollMs: 50 }),
    (error) => error.transient === true && /trancado/.test(error.message)
  );
  assert.equal(ran, false);
  assert.ok(existsSync(join(dir, 'boneco.json.lock')), 'o trinco dos outros nao e tirado');
});

test('withHistoryLock: um trinco esquecido (processo morto) deixa de contar', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'hist-lock-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const lock = join(dir, 'boneco.json.lock');
  writeFileSync(lock, DEAD);
  const old = new Date(Date.now() - LOCK_STALE_MS - 60_000);
  utimesSync(lock, old, old);
  assert.equal(withHistoryLock(dir, 'boneco', () => 'feito', { waitMs: 300, pollMs: 50 }), 'feito');
  assert.equal(existsSync(lock), false);
});

// Terceira ronda do Codex (12/11/2026): a recuperacao nunca tira o trinco do
// lugar; prende-o com uma segunda ligacao exclusiva e so o apaga se for o velho.
function oldLock(dir, content) {
  const lock = join(dir, 'boneco.json.lock');
  writeFileSync(lock, content);
  const old = new Date(Date.now() - LOCK_STALE_MS - 60_000);
  utimesSync(lock, old, old);
  return lock;
}

test('recoverStaleLock: o trinco velho que se viu sai, e nao sobra nada', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'hist-lock-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const lock = oldLock(dir, DEAD);
  assert.equal(recoverStaleLock(lock, DEAD), true);
  assert.deepEqual(readdirSync(dir), []);
});

// 4.a ronda do Codex: velho nao prova morto (processo suspenso).
test('recoverStaleLock: um trinco velho de um processo ainda vivo fica', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'hist-lock-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const vivo = JSON.stringify({ pid: process.pid });
  const lock = oldLock(dir, vivo);
  assert.equal(recoverStaleLock(lock, vivo), false);
  assert.equal(readFileSync(lock, 'utf-8'), vivo);
  const semPid = '{"quem":"?"}';
  writeFileSync(lock, semPid);
  assert.equal(recoverStaleLock(lock, semPid, -1), false, 'sem pid nao ha como confirmar');
  assert.deepEqual(readdirSync(dir), ['boneco.json.lock']);
});

test('recoverStaleLock: se entretanto o trinco ja e outro, nao lhe toca', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'hist-lock-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const lock = join(dir, 'boneco.json.lock');
  writeFileSync(lock, '{"pid":"vivo"}'); // A tirou o velho e pos o seu
  assert.equal(recoverStaleLock(lock, DEAD), false);
  assert.equal(readFileSync(lock, 'utf-8'), '{"pid":"vivo"}');
  assert.deepEqual(readdirSync(dir), ['boneco.json.lock']);
});

test('recoverStaleLock: com outro processo a recuperar, nao faz nada', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'hist-lock-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const lock = oldLock(dir, DEAD);
  writeFileSync(`${lock}.recuperar`, 'outro');
  assert.equal(recoverStaleLock(lock, DEAD), false);
  assert.equal(readFileSync(lock, 'utf-8'), DEAD);
  assert.equal(readFileSync(`${lock}.recuperar`, 'utf-8'), 'outro');
});

test('withHistoryLock: uma recuperacao presa respeita o prazo e diz que ficheiro apagar', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'hist-lock-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const lock = oldLock(dir, DEAD);
  writeFileSync(`${lock}.recuperar`, 'preso');
  const started = Date.now();
  assert.throws(
    () => withHistoryLock(dir, 'boneco', () => {}, { waitMs: 300, pollMs: 50 }),
    (error) => error.transient === true && /recuperar \(processo morto\?\)/.test(error.message)
  );
  assert.ok(Date.now() - started < 3000, 'nao fica a rodar sem pausa');
});

test('withHistoryLock: no fim so tira o trinco se ainda for o seu', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'hist-lock-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const lock = join(dir, 'boneco.json.lock');
  withHistoryLock(dir, 'boneco', () => {
    // como se outro processo o tivesse tomado entretanto
    writeFileSync(lock, '{"pid":"outro"}');
  });
  assert.equal(readFileSync(lock, 'utf-8'), '{"pid":"outro"}');
});

// Revisao do Codex (12/11/2026): dois processos a ver o mesmo trinco velho
// apagavam o trinco um do outro e gravavam os dois ao mesmo tempo, perdendo dias.
test('withHistoryLock: varios processos a disputar um trinco velho nao perdem nenhuma linha', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'hist-race-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const lock = join(dir, 'boneco.json.lock');
  writeFileSync(lock, DEAD);
  const old = new Date(Date.now() - LOCK_STALE_MS - 60_000);
  utimesSync(lock, old, old);
  const lib = pathToFileURL(join(import.meta.dirname, 'guildstatsHistory.mjs')).href;
  const child = (n) => `
    const { updateHistory } = await import(${JSON.stringify(lib)});
    updateHistory(${JSON.stringify(dir)}, 'boneco', (h) => {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150);
      return [...h, { date: '2026-11-0${n}', level: 1, experience: ${n} }];
    });`;
  const run = (n) =>
    new Promise((resolve) => {
      const p = spawn(process.execPath, ['--input-type=module', '-e', child(n)], { stdio: 'inherit' });
      p.on('exit', resolve);
    });
  const codes = await Promise.all([1, 2, 3, 4, 5].map(run));
  assert.deepEqual(codes, [0, 0, 0, 0, 0]);
  const saved = JSON.parse(readFileSync(join(dir, 'boneco.json'), 'utf-8'));
  assert.deepEqual(saved.map((e) => e.experience).sort(), [1, 2, 3, 4, 5]);
  assert.deepEqual(readdirSync(dir), ['boneco.json']);
});

test('missingDates ignora datas que nao existem em vez de andar ate ao ano 10000', () => {
  const started = Date.now();
  const holes = missingDates([
    { date: '2026-11-01' }, { date: 'x' }, { date: '2026-02-30' }, { date: '2026-13-01' }, { date: '2026-11-32' },
    { date: null }, {}, { date: '2026-11-03' },
  ]);
  assert.deepEqual(holes, ['2026-11-02']);
  assert.ok(Date.now() - started < 1000);
});

test('missingDates aponta os buracos do meio da série', () => {
  const serie = ['2026-10-12', '2026-10-13', '2026-10-15', '2026-10-16', '2026-10-19'].map((date) => ({ date }));
  assert.deepEqual(missingDates(serie), ['2026-10-14', '2026-10-17', '2026-10-18']);
  assert.deepEqual(missingDates([]), []);
});

// Auditoria de 11/11/2026 (com o Codex).
test('levelForExperience acaba sempre, mesmo com XP absurda, e recusa XP invalida', () => {
  assert.equal(levelForExperience(1e60), 2 ** 26);
  assert.throws(() => levelForExperience(-1));
  assert.throws(() => levelForExperience(Number.NaN));
});

test('mergeRows: a mesma data duas vezes no lote entra uma vez; com valores diferentes, falha', () => {
  const linha = { date: '2026-11-10', level: 1, experience: 5 };
  const { added } = mergeRows([], [linha, { ...linha }], 'agora');
  assert.equal(added.length, 1);
  assert.throws(() => mergeRows([], [linha, { ...linha, experience: 6 }], 'agora'), /duas vezes/);
});
