// A calculadora de flechas nao tinha testes. Foco nos guardas de divisao por
// zero/negativos que o proprio codigo documenta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ARROW_RATES, buildArrowRateTable, calculateArrowsPerMinute, closestArrowRate, closestTableMinute, MAX_TABLE_MINUTES } from './arrowsCalculator.ts';

test('buildArrowRateTable tem uma linha por minuto e minute*rate em cada coluna', () => {
  const tabela = buildArrowRateTable();
  assert.equal(tabela.length, MAX_TABLE_MINUTES);
  assert.equal(tabela[0].minute, 1);
  assert.equal(tabela[0].totals[25], 25);
  assert.equal(tabela[29].minute, 30);
  assert.equal(tabela[29].totals[28], 30 * 28);
});

test('calculateArrowsPerMinute divide e arredonda a 2 casas', () => {
  assert.equal(calculateArrowsPerMinute(100, 3), 33.33);
  assert.equal(calculateArrowsPerMinute(0, 10), 0);
});

test('calculateArrowsPerMinute guarda contra divisao por zero e inputs invalidos', () => {
  assert.equal(calculateArrowsPerMinute(100, 0), null);
  assert.equal(calculateArrowsPerMinute(100, -1), null);
  assert.equal(calculateArrowsPerMinute(-1, 10), null);
  assert.equal(calculateArrowsPerMinute(NaN, 10), null);
  assert.equal(calculateArrowsPerMinute(100, Infinity), null);
});

test('closestTableMinute clampa entre 1 e MAX_TABLE_MINUTES e recusa <= 0', () => {
  assert.equal(closestTableMinute(0), null);
  assert.equal(closestTableMinute(-5), null);
  assert.equal(closestTableMinute(0.4), 1);
  assert.equal(closestTableMinute(100), MAX_TABLE_MINUTES);
});

test('closestArrowRate escolhe a taxa mais proxima entre as conhecidas', () => {
  assert.equal(closestArrowRate(25.1), 25);
  assert.equal(closestArrowRate(26.6), 27);
  assert.equal(closestArrowRate(1000), ARROW_RATES[ARROW_RATES.length - 1]);
});
