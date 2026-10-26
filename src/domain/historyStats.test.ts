// computeExperienceGains/computeDailyGains nao tinham testes. Cobre a
// divisao por zero num intervalo de tempo nulo e o colapso de varias
// leituras no mesmo dia (guildstats + entrada manual antiga a coexistir).
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDailyGains, computeExperienceGains, recentReadings } from './historyStats.ts';
import type { HistoryEntry } from './types.ts';

test('computeExperienceGains devolve lista vazia com 0 ou 1 leitura', () => {
  assert.deepEqual(computeExperienceGains([]), []);
  assert.deepEqual(computeExperienceGains([{ timestamp: 1, experience: 100 }]), []);
});

test('computeExperienceGains ordena por tempo antes de calcular os intervalos', () => {
  const historico: HistoryEntry[] = [
    { timestamp: 2000, experience: 200 },
    { timestamp: 1000, experience: 100 },
  ];
  const ganhos = computeExperienceGains(historico);
  assert.equal(ganhos.length, 1);
  assert.equal(ganhos[0].experienceGained, 100);
});

test('computeExperienceGains nao divide por zero quando duas leituras tem o mesmo timestamp', () => {
  const historico: HistoryEntry[] = [
    { timestamp: 1000, experience: 100 },
    { timestamp: 1000, experience: 200 },
  ];
  const [ganho] = computeExperienceGains(historico);
  assert.equal(ganho.hoursElapsed, 0);
  assert.equal(ganho.experiencePerHour, 0);
});

test('computeExperienceGains aceita XP negativa (mortes) sem rebentar', () => {
  const historico: HistoryEntry[] = [
    { timestamp: 0, experience: 1000 },
    { timestamp: 60 * 60 * 1000, experience: 900 },
  ];
  const [ganho] = computeExperienceGains(historico);
  assert.equal(ganho.experienceGained, -100);
  assert.equal(ganho.experiencePerHour, -100);
});

test('computeDailyGains colapsa varias leituras do mesmo dia local na ultima', () => {
  const dia1 = new Date(2026, 8, 1, 9, 0).getTime();
  const dia1Tarde = new Date(2026, 8, 1, 20, 0).getTime();
  const dia2 = new Date(2026, 8, 2, 9, 0).getTime();
  const historico: HistoryEntry[] = [
    { timestamp: dia1, experience: 100 },
    { timestamp: dia1Tarde, experience: 150 },
    { timestamp: dia2, experience: 300 },
  ];
  const ganhos = computeDailyGains(historico);
  assert.equal(ganhos.length, 1);
  assert.equal(ganhos[0].experience, 300);
  assert.equal(ganhos[0].experienceGained, 300 - 150);
});

test('computeDailyGains omite o primeiro dia (nao ha anterior para comparar)', () => {
  const dia1 = new Date(2026, 8, 1, 9, 0).getTime();
  assert.deepEqual(computeDailyGains([{ timestamp: dia1, experience: 100 }]), []);
});

// 22/10/2026 (ronda): depois de um dia sem leitura, a XP de dois dias saía
// como a de um dia só — uma barra «XP nesse dia» com o dobro, e a média da
// semana inflacionada. Um dia só tem ganho se o dia anterior tiver leitura.
test('computeDailyGains nao junta a XP de varios dias num dia depois de um buraco', () => {
  const dia1 = new Date(2026, 8, 1, 13, 0).getTime();
  const dia2 = new Date(2026, 8, 2, 13, 0).getTime();
  const dia4 = new Date(2026, 8, 4, 13, 0).getTime();
  const dia5 = new Date(2026, 8, 5, 13, 0).getTime();
  const ganhos = computeDailyGains([
    { timestamp: dia1, experience: 100 },
    { timestamp: dia2, experience: 150 },
    { timestamp: dia4, experience: 400 },
    { timestamp: dia5, experience: 450 },
  ]);
  assert.deepEqual(
    ganhos.map((ganho) => [new Date(ganho.dayTimestamp).getDate(), ganho.experienceGained]),
    [
      [2, 50],
      [5, 50],
    ]
  );
});

// 26/10/2026 (ronda): a lista «Últimas leituras» comparava com a leitura
// anterior fosse de que dia fosse — sem o 25/10, o 26/10 aparecia com a XP de
// dois dias, por baixo do gráfico que (desde 22/10) já não dá ganho a esse dia.
// Inclui a mudança de hora de 25/10 de propósito.
test('recentReadings nao da ganho a um dia cujo dia anterior nao tem leitura', () => {
  const dia23 = new Date(2026, 9, 23, 13, 0).getTime();
  const dia24 = new Date(2026, 9, 24, 13, 0).getTime();
  const dia26 = new Date(2026, 9, 26, 13, 0).getTime();
  const dia27 = new Date(2026, 9, 27, 13, 0).getTime();
  const linhas = recentReadings(
    [
      { timestamp: dia23, experience: 100 },
      { timestamp: dia24, experience: 150 },
      { timestamp: dia26, experience: 400 },
      { timestamp: dia27, experience: 450 },
    ],
    5
  );
  assert.deepEqual(
    linhas.map((linha) => [new Date(linha.entry.timestamp).getDate(), linha.experienceGained]),
    [
      [27, 50],
      [26, null],
      [24, 50],
      [23, null],
    ]
  );
});

test('recentReadings corta nas ultimas N e mostra a leitura unica sem ganho', () => {
  const dias = [1, 2, 3, 4].map((dia) => new Date(2026, 8, dia, 13, 0).getTime());
  const linhas = recentReadings(
    dias.map((timestamp, i) => ({ timestamp, experience: 100 * (i + 1) })),
    2
  );
  assert.deepEqual(
    linhas.map((linha) => [new Date(linha.entry.timestamp).getDate(), linha.experienceGained]),
    [
      [4, 100],
      [3, 100],
    ]
  );
  assert.deepEqual(recentReadings([{ timestamp: dias[0], experience: 100 }], 5), [
    { entry: { timestamp: dias[0], experience: 100 }, experienceGained: null },
  ]);
  assert.deepEqual(recentReadings([], 5), []);
});

test('computeDailyGains aceita perdas de XP dia a dia', () => {
  const dia1 = new Date(2026, 8, 1, 9, 0).getTime();
  const dia2 = new Date(2026, 8, 2, 9, 0).getTime();
  const ganhos = computeDailyGains([
    { timestamp: dia1, experience: 1000 },
    { timestamp: dia2, experience: 800 },
  ]);
  assert.equal(ganhos[0].experienceGained, -200);
});
