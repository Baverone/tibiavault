// Números escritos à mão no Bosstiary (22/11/2026): um campo de kills vazio ou
// com lixo não pode apagar as kills que lá estavam.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lerNumero } from './numero.ts';

test('um número limpa-se para inteiro ≥ 0', () => {
  assert.equal(lerNumero('37', false), 37);
  assert.equal(lerNumero(' 7.9 ', false), 7);
  assert.equal(lerNumero('-3', false), 0);
});

test('kills: vazio ou lixo não grava nada (undefined)', () => {
  assert.equal(lerNumero('', false), undefined);
  assert.equal(lerNumero('abc', false), undefined);
  assert.equal(lerNumero('1e999', false), undefined);
});

test('pontos no jogo: vazio limpa o campo (null)', () => {
  assert.equal(lerNumero('', true), null);
  assert.equal(lerNumero('abc', true), undefined);
});
