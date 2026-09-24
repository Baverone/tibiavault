// O painel do Início: a XP do último dia, a da semana e a série dos dois
// bonecos lado a lado. Tudo contas puras, sem rede e sem browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { agoText, combineDailyGains, summarizeCharacter, WEEK_DAYS } from './homeSummary.ts';
import type { HistoryEntry } from './types.ts';

const DIA = 24 * 60 * 60 * 1000;

/** Uma leitura por dia, a partir de uma data, com os ganhos que se derem. */
function historico(inicio: string, base: number, ganhos: number[]): HistoryEntry[] {
  const arranque = new Date(`${inicio}T12:00:00Z`).getTime();
  const entradas: HistoryEntry[] = [{ timestamp: arranque, experience: base, source: 'guildstats' }];
  let total = base;
  ganhos.forEach((ganho, indice) => {
    total += ganho;
    entradas.push({ timestamp: arranque + (indice + 1) * DIA, experience: total, source: 'guildstats' });
  });
  return entradas;
}

test('sem histórico não há resumo nenhum, e nada rebenta', () => {
  const resumo = summarizeCharacter([], Date.now());
  assert.equal(resumo.level, null);
  assert.equal(resumo.experience, null);
  assert.equal(resumo.lastDayGain, null);
  assert.equal(resumo.weekGain, null);
  assert.equal(resumo.weekDays, 0);
  assert.equal(resumo.daysSinceLastReading, null);
});

test('uma leitura só dá nível mas não dá ganho — não há com que comparar', () => {
  const resumo = summarizeCharacter(historico('2026-09-20', 1_000_000, []), Date.now());
  assert.ok(resumo.level !== null && resumo.level > 1);
  assert.equal(resumo.lastDayGain, null);
  assert.equal(resumo.weekGain, null);
});

test('o último dia é o ganho do dia mais recente', () => {
  const resumo = summarizeCharacter(historico('2026-09-20', 1_000_000, [100, 250, 400]), Date.now());
  assert.equal(resumo.lastDayGain, 400);
});

test('a semana soma sete dias e diz quantos entraram', () => {
  // Dez dias de ganhos: só os sete últimos contam.
  const ganhos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const resumo = summarizeCharacter(historico('2026-09-10', 1_000_000, ganhos), Date.now());
  assert.equal(resumo.weekDays, WEEK_DAYS);
  assert.equal(resumo.weekGain, 4 + 5 + 6 + 7 + 8 + 9 + 10);
});

test('a janela é ancorada ao dia mais recente e não a «hoje»', () => {
  // A recolha parou há um mês. «A semana» continua a mostrar sete dias de
  // dados em vez de encolher para zero — era este o comportamento do gráfico
  // e é o mesmo aqui.
  const historia = historico('2026-08-01', 1_000_000, [10, 20, 30, 40, 50, 60, 70, 80]);
  const resumo = summarizeCharacter(historia, new Date('2026-09-24T12:00:00Z').getTime());
  assert.equal(resumo.weekDays, WEEK_DAYS);
  assert.equal(resumo.weekGain, 20 + 30 + 40 + 50 + 60 + 70 + 80);
});

test('dias sem leitura suficientes: a semana cobre só o que há', () => {
  const resumo = summarizeCharacter(historico('2026-09-20', 1_000_000, [5, 5]), Date.now());
  assert.equal(resumo.weekDays, 2);
  assert.equal(resumo.weekGain, 10);
});

test('uma morte dá um ganho negativo, e isso não é um erro', () => {
  const resumo = summarizeCharacter(historico('2026-09-20', 5_000_000, [100, -900]), Date.now());
  assert.equal(resumo.lastDayGain, -900);
  assert.equal(resumo.weekGain, -800);
});

test('daysSinceLastReading conta a partir da leitura mais recente', () => {
  const historia = historico('2026-09-20', 1_000_000, [10]);
  // A última leitura é 21/09 ao meio-dia UTC.
  const agora = new Date('2026-09-24T12:00:00Z').getTime();
  assert.equal(summarizeCharacter(historia, agora).daysSinceLastReading, 3);
});

test('combineDailyGains junta os dois bonecos no mesmo dia', () => {
  const pontos = combineDailyGains(
    {
      a: historico('2026-09-20', 1_000, [10, 20]),
      b: historico('2026-09-20', 2_000, [5, 6]),
    },
    30
  );
  assert.equal(pontos.length, 2);
  assert.deepEqual(pontos[0].gains, { a: 10, b: 5 });
  assert.deepEqual(pontos[1].gains, { a: 20, b: 6 });
});

test('um boneco atrasado não desalinha o outro: um dia pode ter só uma chave', () => {
  const pontos = combineDailyGains(
    {
      a: historico('2026-09-20', 1_000, [10, 20, 30]),
      b: historico('2026-09-20', 2_000, [5]),
    },
    30
  );
  assert.equal(pontos.length, 3);
  assert.deepEqual(pontos[0].gains, { a: 10, b: 5 });
  assert.deepEqual(pontos[2].gains, { a: 30 });
});

test('combineDailyGains corta pela janela pedida, a contar do dia mais recente', () => {
  const pontos = combineDailyGains({ a: historico('2026-09-01', 1_000, [1, 2, 3, 4, 5, 6]) }, 3);
  assert.equal(pontos.length, 3);
  assert.deepEqual(
    pontos.map((ponto) => ponto.gains.a),
    [4, 5, 6]
  );
});

test('sem histórico nenhum, o gráfico fica sem pontos em vez de rebentar', () => {
  assert.deepEqual(combineDailyGains({ a: [], b: undefined }, 30), []);
});

test('agoText fala português e não diz «há 0 dias»', () => {
  assert.equal(agoText(0), 'hoje');
  assert.equal(agoText(-1), 'hoje');
  assert.equal(agoText(1), 'há 1 dia');
  assert.equal(agoText(4), 'há 4 dias');
});
