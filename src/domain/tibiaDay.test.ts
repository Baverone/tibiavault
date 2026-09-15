// computeTibiaDayBoundary decide o "dia de Tibia" (avanca as 9h em Lisboa, nao
// a meia-noite) e ja tinha um comentario a dizer que era usado no Rashid
// Tracker e no alarme de frescura, mas nenhum teste proprio. O ponto fino e
// o ajuste automatico de fuso horario entre WEST (verao, UTC+1) e WET
// (inverno, UTC+0) atraves do Intl.DateTimeFormat.
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTibiaDayBoundary, SERVER_SAVE_HOUR } from './tibiaDay.ts';

test('antes das 9h em Lisboa (verao, WEST/UTC+1), o dia de Tibia ainda e o de ontem', () => {
  const antesDasNove = Date.UTC(2026, 8, 15, 7, 59); // 08:59 em Lisboa
  const boundary = computeTibiaDayBoundary(antesDasNove);
  assert.equal(boundary.dateKey, '2026-09-14');
});

test('as 9h em ponto em Lisboa (verao), o dia de Tibia ja avancou', () => {
  const asNove = Date.UTC(2026, 8, 15, 8, 0); // 09:00 em Lisboa
  const boundary = computeTibiaDayBoundary(asNove);
  assert.equal(boundary.dateKey, '2026-09-15');
});

test('no inverno (WET/UTC+0), a fronteira das 9h segue a mesma logica sem o deslocamento de verao', () => {
  const antesDasNove = Date.UTC(2026, 0, 15, 8, 59); // 08:59 em Lisboa, sem DST
  const asNove = Date.UTC(2026, 0, 15, 9, 0); // 09:00 em Lisboa, sem DST
  assert.equal(computeTibiaDayBoundary(antesDasNove).dateKey, '2026-01-14');
  assert.equal(computeTibiaDayBoundary(asNove).dateKey, '2026-01-15');
});

test('weekdayIndex segue a convencao de Date.getDay() (0 = domingo)', () => {
  // 2026-09-15 e uma terca-feira -> getDay() = 2
  const asNove = Date.UTC(2026, 8, 15, 8, 0);
  assert.equal(computeTibiaDayBoundary(asNove).weekdayIndex, 2);
});

test('nextChangeAt aponta sempre para a proxima mudanca de dia no futuro, nunca no passado', () => {
  const agora = Date.UTC(2026, 8, 15, 8, 0);
  const boundary = computeTibiaDayBoundary(agora);
  assert.ok(boundary.nextChangeAt > agora);
  // No maximo 24h de distancia (a mudanca e diaria).
  assert.ok(boundary.nextChangeAt - agora <= 24 * 60 * 60 * 1000);
});

test('SERVER_SAVE_HOUR e 9 (a hora oficial do server save em Lisboa)', () => {
  assert.equal(SERVER_SAVE_HOUR, 9);
});
