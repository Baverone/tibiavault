// computeRashidState so faz o lookup na tabela semanal a partir do dia de
// Tibia (ja coberto em tibiaDay.test.ts) -- aqui interessa confirmar que o
// indice bate com a cidade certa e que os 7 dias da semana estao todos
// cobertos sem overlaps nem omissoes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRashidState } from './rashidSchedule.ts';
import { RASHID_WEEKLY_SCHEDULE } from '../../data/rashid/schedule.ts';

test('computeRashidState devolve a cidade da tabela correspondente ao dia de Tibia', () => {
  // 2026-09-15 as 09:00 em Lisboa (verao) e terca-feira -> indice 2 -> Liberty Bay
  const asNove = Date.UTC(2026, 8, 15, 8, 0);
  const estado = computeRashidState(asNove);
  assert.equal(estado.tibiaDayIndex, 2);
  assert.deepEqual(estado.location, RASHID_WEEKLY_SCHEDULE[2]);
  assert.equal(estado.location.city, 'Liberty Bay');
});

test('antes do server save, ainda mostra a cidade do dia de Tibia anterior', () => {
  // 08:59 em Lisboa de terca -> ainda "segunda" para efeitos de Tibia -> Svargrond
  const antesDasNove = Date.UTC(2026, 8, 15, 7, 59);
  const estado = computeRashidState(antesDasNove);
  assert.equal(estado.tibiaDayIndex, 1);
  assert.equal(estado.location.city, 'Svargrond');
});

test('a tabela semanal tem exatamente 7 entradas, uma por dia', () => {
  assert.equal(RASHID_WEEKLY_SCHEDULE.length, 7);
});
