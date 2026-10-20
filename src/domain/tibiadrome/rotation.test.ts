// computeRotationState deriva a rotacao ativa do Tibiadrome so a partir de um
// ancora fixa + "agora", sem estado mutavel -- nao tinha testes. O ponto
// fino e a aritmetica de periodos completos decorridos (Math.floor), que tem
// de acertar tanto mesmo em cima da fronteira como um instante antes dela.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRotationState,
  formatDuration,
  formatRotationDate,
  ROTATION_DURATION_MS,
  type RotationAnchor,
} from './rotation.ts';

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

// 20/10/2026: as rotacoes eram ancora + N x 14 x 24h fixas. A ancora real e
// um server save de verao (08/07 09:00 WEST), e a rotacao que acaba a 28/10 —
// tres dias depois da mudanca de hora — aparecia a acabar as 08:00 de Lisboa.
// O save e as 10:00 de Berlim (09:00 de Lisboa) todo o ano.
const REAL: RotationAnchor = { number: 1, startAt: '2026-07-08T09:00:00+01:00' };

test('outubro: a 24/10 (WEST) a rotacao acaba a 28/10 as 09:00 de Lisboa', () => {
  const estado = computeRotationState(REAL, Date.UTC(2026, 9, 24, 12, 0));
  assert.equal(estado.endAt, Date.UTC(2026, 9, 28, 9, 0));
  assert.equal(formatRotationDate(estado.endAt), '28/10/2026, 09:00');
  assert.equal(estado.startAt, Date.UTC(2026, 9, 14, 8, 0));
});

test('outubro: a 26/10 (WET) a mesma rotacao, ainda a acabar as 09:00', () => {
  const estado = computeRotationState(REAL, Date.UTC(2026, 9, 26, 12, 0));
  assert.equal(formatRotationDate(estado.endAt), '28/10/2026, 09:00');
});

test('outubro: a rotacao seguinte comeca e acaba as 09:00 de inverno', () => {
  const estado = computeRotationState(REAL, Date.UTC(2026, 9, 28, 9, 0));
  assert.equal(estado.startAt, Date.UTC(2026, 9, 28, 9, 0));
  assert.equal(formatRotationDate(estado.startAt), '28/10/2026, 09:00');
  assert.equal(formatRotationDate(estado.endAt), '11/11/2026, 09:00');
  // um instante antes do save de 28/10 ainda e a anterior
  assert.equal(computeRotationState(REAL, Date.UTC(2026, 9, 28, 8, 59)).number, estado.number - 1);
});

test('marco: a rotacao que atravessa 28/03/2027 comeca as 09:00 WET e acaba as 09:00 WEST', () => {
  const antes = computeRotationState(REAL, Date.UTC(2027, 2, 27, 12, 0));
  const depois = computeRotationState(REAL, Date.UTC(2027, 2, 29, 12, 0));
  assert.equal(antes.number, depois.number);
  assert.equal(formatRotationDate(antes.startAt), '17/03/2027, 09:00');
  assert.equal(formatRotationDate(antes.endAt), '31/03/2027, 09:00');
});

test('formatDuration nunca mostra negativos', () => {
  assert.equal(formatDuration(0), '00:00:00');
  assert.equal(formatDuration(-5), '00:00:00');
});

test('formatDuration mostra o segmento de dias so quando ha pelo menos um dia inteiro', () => {
  assert.equal(formatDuration(23 * 60 * 60 * 1000), '23:00:00');
  assert.equal(formatDuration(25 * 60 * 60 * 1000), '1d 01:00:00');
});
