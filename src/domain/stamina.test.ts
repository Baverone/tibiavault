// A calculadora de Stamina nao tinha testes. Cobre as duas zonas de
// regeneracao (rapida ate 39h, lenta 39h-42h), o atraso de 10 minutos antes
// de comecar a regenerar, os limites (0h, 42h) e o parsing de inputs em
// varios formatos ("39:30", "39", "39,5").
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  depleteStamina,
  formatDuration,
  formatStamina,
  GREEN_START_MIN,
  MAX_STAMINA_MIN,
  offlineMinutesToReach,
  parseDurationToMinutes,
  parseStaminaToMinutes,
  regenerateStamina,
  staminaZone,
} from './stamina.ts';

test('regenerateStamina nao mexe nos primeiros 10 minutos offline', () => {
  assert.equal(regenerateStamina(2000, 0), 2000);
  assert.equal(regenerateStamina(2000, 10), 2000);
});

test('regenerateStamina: zona rapida e 3 min offline por 1 min de stamina', () => {
  // 15 min offline = 5 min efetivos (10 de atraso) -> 5/3 min de stamina
  assert.equal(regenerateStamina(2000, 15), 2000 + 5 / 3);
});

test('regenerateStamina: zona lenta (39h-42h) e 6 min offline por 1 min de stamina', () => {
  assert.equal(regenerateStamina(GREEN_START_MIN, 10 + 6 * 180), MAX_STAMINA_MIN);
});

test('regenerateStamina nunca ultrapassa 42h, mesmo com muito tempo offline ou input acima do maximo', () => {
  assert.equal(regenerateStamina(2340, 100000), MAX_STAMINA_MIN);
  assert.equal(regenerateStamina(3000, 100), MAX_STAMINA_MIN);
});

test('offlineMinutesToReach devolve null quando o alvo ja foi atingido', () => {
  assert.equal(offlineMinutesToReach(MAX_STAMINA_MIN, MAX_STAMINA_MIN), null);
  assert.equal(offlineMinutesToReach(2400, 2340), null);
});

test('offlineMinutesToReach atravessa as duas zonas quando o alvo esta na zona lenta', () => {
  assert.equal(offlineMinutesToReach(2000, GREEN_START_MIN), 1030);
  assert.equal(offlineMinutesToReach(GREEN_START_MIN, MAX_STAMINA_MIN), 1090);
});

test('offlineMinutesToReach ignora um alvo pedido acima de 42h (clampa ao maximo)', () => {
  assert.equal(offlineMinutesToReach(2500, 3000), offlineMinutesToReach(2500, MAX_STAMINA_MIN));
});

test('depleteStamina nunca fica negativa', () => {
  assert.equal(depleteStamina(100, 150), 0);
  assert.equal(depleteStamina(0, 10), 0);
});

test('depleteStamina clampa o ponto de partida a 42h', () => {
  assert.equal(depleteStamina(3000, 10), MAX_STAMINA_MIN - 10);
});

test('parseStaminaToMinutes aceita HH:MM, horas inteiras e decimais com virgula ou ponto', () => {
  assert.equal(parseStaminaToMinutes('39:30'), 2370);
  assert.equal(parseStaminaToMinutes('39'), 2340);
  assert.equal(parseStaminaToMinutes('39,5'), 2370);
  assert.equal(parseStaminaToMinutes('39.5'), 2370);
});

test('parseStaminaToMinutes rejeita fora de 0:00-42:00, minutos invalidos, negativos e lixo', () => {
  assert.equal(parseStaminaToMinutes('42:01'), null);
  assert.equal(parseStaminaToMinutes('-1'), null);
  assert.equal(parseStaminaToMinutes('39:60'), null);
  assert.equal(parseStaminaToMinutes(''), null);
  assert.equal(parseStaminaToMinutes('abc'), null);
});

test('parseStaminaToMinutes aceita os limites exatos 0:00 e 42:00', () => {
  assert.equal(parseStaminaToMinutes('0:00'), 0);
  assert.equal(parseStaminaToMinutes('42:00'), MAX_STAMINA_MIN);
});

test('parseDurationToMinutes rejeita zero e negativos (uma hunt tem de durar algo)', () => {
  assert.equal(parseDurationToMinutes('0'), null);
  assert.equal(parseDurationToMinutes('-1'), null);
  assert.equal(parseDurationToMinutes(''), null);
});

test('parseDurationToMinutes aceita HH:MM e decimais', () => {
  assert.equal(parseDurationToMinutes('3:30'), 210);
  assert.equal(parseDurationToMinutes('3,5'), 210);
});

test('formatStamina clampa a 0:00-42:00 mesmo com input fora do intervalo', () => {
  assert.equal(formatStamina(MAX_STAMINA_MIN), '42:00');
  assert.equal(formatStamina(-10), '0:00');
  assert.equal(formatStamina(3000), '42:00');
});

test('formatDuration nunca mostra negativos e omite a unidade a zero', () => {
  assert.equal(formatDuration(0), '0min');
  assert.equal(formatDuration(90), '1h 30min');
  assert.equal(formatDuration(-5), '0min');
  assert.equal(formatDuration(120), '2h');
});

test('staminaZone cobre as quatro faixas de XP', () => {
  assert.equal(staminaZone(GREEN_START_MIN).xp, '150%');
  assert.equal(staminaZone(840).xp, '100%');
  assert.equal(staminaZone(1).xp, '50%');
  assert.equal(staminaZone(0).xp, '0%');
});
