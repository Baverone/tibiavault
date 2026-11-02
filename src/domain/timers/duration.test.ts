// O tempo do timer Boost, escrito a mao (pedido do Andre, 02/11/2026): minutos
// ou horas:minutos, entre 1 minuto e 10 horas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTimerMinutes, parseTimerMinutes, TIMER_MAX_MINUTES } from './duration.ts';

test('minutos inteiros', () => {
  assert.equal(parseTimerMinutes('60'), 60);
  assert.equal(parseTimerMinutes(' 45 '), 45);
  assert.equal(parseTimerMinutes('1'), 1);
});

test('horas:minutos', () => {
  assert.equal(parseTimerMinutes('1:30'), 90);
  assert.equal(parseTimerMinutes('2:05'), 125);
  assert.equal(parseTimerMinutes('0:45'), 45);
});

test('fora dos limites ou mal escrito e null', () => {
  assert.equal(parseTimerMinutes(''), null);
  assert.equal(parseTimerMinutes('0'), null);
  assert.equal(parseTimerMinutes('0:00'), null);
  assert.equal(parseTimerMinutes(String(TIMER_MAX_MINUTES + 1)), null);
  assert.equal(parseTimerMinutes('1:75'), null);
  assert.equal(parseTimerMinutes('1:5'), null);
  assert.equal(parseTimerMinutes('abc'), null);
  assert.equal(parseTimerMinutes('-5'), null);
  assert.equal(parseTimerMinutes('1.5'), null);
});

test('o limite de cima entra', () => {
  assert.equal(parseTimerMinutes(String(TIMER_MAX_MINUTES)), TIMER_MAX_MINUTES);
});

test('formatTimerMinutes escreve como se le no campo', () => {
  assert.equal(formatTimerMinutes(60), '60');
  assert.equal(formatTimerMinutes(90), '90');
});
