// Testes do parser da tabela do guildstats e da formula de experiencia.
// Sem rede: o HTML e uma fixture aqui ao lado, copiada da forma que o
// guildstats serve desde o redesenho de agosto de 2026 (duas spans por
// celula, a segunda com a abreviatura para telemovel).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  USER_AGENT,
  experienceForLevel,
  fetchExperienceRows,
  levelForExperience,
  loadExistingHistory,
  mergeRows,
  missingDates,
  parseExperienceRows,
} from './guildstatsHistory.mjs';

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

test('missingDates aponta os buracos do meio da série', () => {
  const serie = ['2026-10-12', '2026-10-13', '2026-10-15', '2026-10-16', '2026-10-19'].map((date) => ({ date }));
  assert.deepEqual(missingDates(serie), ['2026-10-14', '2026-10-17', '2026-10-18']);
  assert.deepEqual(missingDates([]), []);
});
