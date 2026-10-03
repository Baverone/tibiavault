// computeExperienceGains/computeDailyGains nao tinham testes. Cobre a
// divisao por zero num intervalo de tempo nulo e o colapso de varias
// leituras no mesmo dia (guildstats + entrada manual antiga a coexistir).
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDailyGains, computeExperienceGains } from './historyStats.ts';
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

test('computeDailyGains aceita perdas de XP dia a dia', () => {
  const dia1 = new Date(2026, 8, 1, 9, 0).getTime();
  const dia2 = new Date(2026, 8, 2, 9, 0).getTime();
  const ganhos = computeDailyGains([
    { timestamp: dia1, experience: 1000 },
    { timestamp: dia2, experience: 800 },
  ]);
  assert.equal(ganhos[0].experienceGained, -200);
});
