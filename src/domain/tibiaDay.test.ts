// computeTibiaDayBoundary decide o "dia de Tibia" (avanca as 9h em Lisboa, nao
// a meia-noite) e ja tinha um comentario a dizer que era usado no Rashid
// Tracker e no alarme de frescura, mas nenhum teste proprio. O ponto fino e
// o ajuste automatico de fuso horario entre WEST (verao, UTC+1) e WET
// (inverno, UTC+0) atraves do Intl.DateTimeFormat.
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTibiaDayBoundary, SERVER_SAVE_HOUR, serverSaveAt } from './tibiaDay.ts';

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

// 20/10/2026: o nextChangeAt era calculado com o desvio de Lisboa de AGORA. Na
// vespera da mudanca de hora o proximo save ja esta do outro lado e ficava uma
// hora errado. Os dois lados das duas mudancas (25/10/2026 e 28/03/2027).
const HORA = 60 * 60 * 1000;

test('outubro: a 24/10 (WEST) o proximo save e 25/10 09:00 WET = 09:00 UTC', () => {
  const agora = Date.UTC(2026, 9, 24, 21, 0); // 22:00 em Lisboa, ainda de verao
  const boundary = computeTibiaDayBoundary(agora);
  assert.equal(boundary.dateKey, '2026-10-24');
  assert.equal(boundary.nextChangeAt, Date.UTC(2026, 9, 25, 9, 0));
});

test('outubro: a 24/10 antes do save, o proximo e nesse dia as 09:00 WEST = 08:00 UTC', () => {
  const agora = Date.UTC(2026, 9, 24, 6, 0); // 07:00 em Lisboa
  assert.equal(computeTibiaDayBoundary(agora).nextChangeAt, Date.UTC(2026, 9, 24, 8, 0));
});

test('outubro: a 26/10 (WET) o proximo save e 27/10 09:00 = 09:00 UTC', () => {
  const agora = Date.UTC(2026, 9, 26, 10, 0);
  const boundary = computeTibiaDayBoundary(agora);
  assert.equal(boundary.dateKey, '2026-10-26');
  assert.equal(boundary.nextChangeAt, Date.UTC(2026, 9, 27, 9, 0));
});

test('outubro: no proprio dia da mudanca (25/10) o dia de Tibia muda as 09:00 WET', () => {
  assert.equal(computeTibiaDayBoundary(Date.UTC(2026, 9, 25, 8, 59)).dateKey, '2026-10-24');
  assert.equal(computeTibiaDayBoundary(Date.UTC(2026, 9, 25, 9, 0)).dateKey, '2026-10-25');
});

test('marco: a 27/03/2027 (WET) o proximo save e 28/03 09:00 WEST = 08:00 UTC', () => {
  const agora = Date.UTC(2027, 2, 27, 22, 0);
  const boundary = computeTibiaDayBoundary(agora);
  assert.equal(boundary.dateKey, '2027-03-27');
  assert.equal(boundary.nextChangeAt, Date.UTC(2027, 2, 28, 8, 0));
  assert.equal(boundary.nextChangeAt - agora, 10 * HORA);
});

test('marco: a 29/03/2027 (WEST) o proximo save e 30/03 09:00 WEST = 08:00 UTC', () => {
  const agora = Date.UTC(2027, 2, 29, 12, 0);
  assert.equal(computeTibiaDayBoundary(agora).nextChangeAt, Date.UTC(2027, 2, 30, 8, 0));
});

test('serverSaveAt: o save e as 10:00 de Berlim, todo o ano', () => {
  assert.equal(serverSaveAt('2026-10-24'), Date.UTC(2026, 9, 24, 8, 0));
  assert.equal(serverSaveAt('2026-10-25'), Date.UTC(2026, 9, 25, 9, 0));
  assert.equal(serverSaveAt('2026-10-26'), Date.UTC(2026, 9, 26, 9, 0));
  assert.equal(serverSaveAt('2027-03-27'), Date.UTC(2027, 2, 27, 9, 0));
  assert.equal(serverSaveAt('2027-03-28'), Date.UTC(2027, 2, 28, 8, 0));
});
