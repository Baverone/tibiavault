// Previsao de niveis e de XP a X dias: janela simetrica ancorada a leitura
// mais recente. Nao tinha testes -- e a logica mais fina do painel de XP,
// incluindo o caso de ritmo negativo (mortes a comer mais do que se ganha).
import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarDaysUntil, computeRateOverWindow, forecastNextLevels, projectAtHorizon, readingInstant } from './xpForecast.ts';
import { experienceForLevel } from './experienceTable.ts';
import type { HistoryEntry } from './types.ts';

const DIA = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 8, 1);

function entrada(diasDepoisDeT0: number, experience: number): HistoryEntry {
  return { timestamp: T0 + diasDepoisDeT0 * DIA, experience };
}

test('computeRateOverWindow devolve null com menos de duas leituras', () => {
  assert.equal(computeRateOverWindow([], 7), null);
  assert.equal(computeRateOverWindow([entrada(0, 1000)], 7), null);
});

test('computeRateOverWindow devolve null para uma janela invalida (zero ou negativa)', () => {
  const historico = [entrada(0, 1000), entrada(1, 2000)];
  assert.equal(computeRateOverWindow(historico, 0), null);
  assert.equal(computeRateOverWindow(historico, -1), null);
});

test('computeRateOverWindow calcula a media diaria ancorada na leitura mais recente', () => {
  const historico = [entrada(0, 0), entrada(7, 700)];
  const taxa = computeRateOverWindow(historico, 7);
  assert.ok(taxa);
  assert.equal(taxa!.averageDailyXp, 100);
  assert.equal(taxa!.totalXpGained, 700);
  assert.equal(taxa!.readingsUsed, 2);
});

test('computeRateOverWindow ignora leituras fora da janela pedida', () => {
  const historico = [entrada(0, 0), entrada(20, 2000), entrada(27, 2700)];
  const taxa = computeRateOverWindow(historico, 7);
  assert.ok(taxa);
  // So as leituras dos ultimos 7 dias (dia 20 a 27) entram.
  assert.equal(taxa!.readingsUsed, 2);
  assert.equal(taxa!.totalXpGained, 700);
});

test('computeRateOverWindow aceita ritmo negativo (XP perdida a mortes)', () => {
  const historico = [entrada(0, 5000), entrada(5, 4000)];
  const taxa = computeRateOverWindow(historico, 5);
  assert.ok(taxa);
  assert.equal(taxa!.averageDailyXp, -200);
});

test('computeRateOverWindow devolve null quando as leituras da janela colidem no tempo (span <= 0)', () => {
  const historico = [entrada(5, 1000), { timestamp: T0 + 5 * DIA, experience: 1000 }];
  assert.equal(computeRateOverWindow(historico, 7), null);
});

test('projectAtHorizon nao deixa a XP prevista cair abaixo de 0', () => {
  const taxa = { averageDailyXp: -1000, totalXpGained: -1000, windowDays: 7, daysCovered: 7, readingsUsed: 2, firstEntry: entrada(0, 100), lastEntry: entrada(7, 0) };
  const projecao = projectAtHorizon(100, taxa);
  assert.equal(projecao.experience, 0);
  assert.equal(projecao.level, 1);
});

test('projectAtHorizon soma o ritmo medio pelos mesmos dias da janela', () => {
  const taxa = { averageDailyXp: 1000, totalXpGained: 7000, windowDays: 7, daysCovered: 7, readingsUsed: 2, firstEntry: entrada(0, 0), lastEntry: entrada(7, 7000) };
  const from = new Date(T0 + 7 * DIA);
  const projecao = projectAtHorizon(50000, taxa, from);
  assert.equal(projecao.experience, 50000 + 7000);
  assert.equal(projecao.date.getTime(), from.getTime() + 7 * DIA);
});

test('forecastNextLevels devolve lista vazia para ritmo zero ou negativo', () => {
  assert.deepEqual(forecastNextLevels(1000, 0), []);
  assert.deepEqual(forecastNextLevels(1000, -100), []);
  assert.deepEqual(forecastNextLevels(1000, NaN), []);
});

test('forecastNextLevels devolve `count` niveis consecutivos a partir do nivel atual', () => {
  const previsoes = forecastNextLevels(0, 1000, 3);
  assert.equal(previsoes.length, 3);
  assert.deepEqual(previsoes.map((p) => p.level), [2, 3, 4]);
  assert.ok(previsoes.every((p) => p.daysToReach > 0));
});

// Auditoria de 11/11/2026: a Previsão conta a partir da leitura, não de «agora».
test('readingInstant: a linha do dia D vale o server save de D+1 (09:00 de Lisboa)', () => {
  const inverno = { timestamp: Date.parse('2026-11-10T12:00:00Z'), experience: 0 };
  assert.equal(readingInstant(inverno).toISOString(), '2026-11-11T09:00:00.000Z');
  const verao = { timestamp: Date.parse('2026-07-10T12:00:00Z'), experience: 0 };
  assert.equal(readingInstant(verao).toISOString(), '2026-07-11T08:00:00.000Z');
});

test('calendarDaysUntil conta dias de calendario, como a data mostrada ao lado', () => {
  const now = new Date(2026, 10, 11, 21, 18);
  assert.equal(calendarDaysUntil(new Date(2026, 10, 21, 1, 0), now), 10);
  assert.equal(calendarDaysUntil(new Date(2026, 10, 11, 23, 0), now), 0);
  assert.equal(calendarDaysUntil(new Date(2026, 10, 12, 0, 30), now), 1);
  assert.equal(calendarDaysUntil(new Date(2026, 10, 9), now), -2);
});

test('com a leitura atrasada, um nivel ja passado fica com data no passado', () => {
  const lastReading = { timestamp: Date.parse('2026-10-20T12:00:00Z'), experience: 0 };
  const from = readingInstant(lastReading);
  const [next] = forecastNextLevels(experienceForLevel(100) - 10, 10, 1, from);
  assert.ok(next.estimatedDate.getTime() < Date.parse('2026-10-25T00:00:00Z'));
});
