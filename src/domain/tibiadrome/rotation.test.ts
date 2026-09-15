// computeRotationState deriva a rotacao ativa do Tibiadrome so a partir de um
// ancora fixa + "agora", sem estado mutavel -- nao tinha testes. O ponto
// fino e a aritmetica de periodos completos decorridos (Math.floor), que tem
// de acertar tanto mesmo em cima da fronteira como um instante antes dela.
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRotationState, formatDuration, ROTATION_DURATION_MS, type RotationAnchor } from './rotation.ts';

const ANCHOR: RotationAnchor = { number: 100, startAt: '2026-07-03T10:00:00+01:00' };
const ANCHOR_MS = new Date(ANCHOR.startAt).getTime();

test('no proprio instante da ancora, a rotacao e a da ancora', () => {
  const estado = computeRotationState(ANCHOR, ANCHOR_MS);
  assert.equal(estado.number, 100);
  assert.equal(estado.startAt, ANCHOR_MS);
  assert.equal(estado.endAt, ANCHOR_MS + ROTATION_DURATION_MS);
});

test('um milissegundo antes da ancora, ja e a rotacao anterior', () => {
  const estado = computeRotationState(ANCHOR, ANCHOR_MS - 1);
  assert.equal(estado.number, 99);
  assert.equal(estado.endAt, ANCHOR_MS);
});

test('duas rotacoes completas depois, o numero avanca 2 e a janela encadeia sem falhas', () => {
  const doisPeriodosDepois = ANCHOR_MS + 2 * ROTATION_DURATION_MS + 5000;
  const estado = computeRotationState(ANCHOR, doisPeriodosDepois);
  assert.equal(estado.number, 102);
  assert.equal(estado.startAt, ANCHOR_MS + 2 * ROTATION_DURATION_MS);
  assert.equal(estado.endAt - estado.startAt, ROTATION_DURATION_MS);
});

test('formatDuration nunca mostra negativos', () => {
  assert.equal(formatDuration(0), '00:00:00');
  assert.equal(formatDuration(-5), '00:00:00');
});

test('formatDuration mostra o segmento de dias so quando ha pelo menos um dia inteiro', () => {
  assert.equal(formatDuration(23 * 60 * 60 * 1000), '23:00:00');
  assert.equal(formatDuration(25 * 60 * 60 * 1000), '1d 01:00:00');
});
