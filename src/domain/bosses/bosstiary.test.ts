// As regras do Bosstiary (22/11/2026, confirmadas nas duas pesquisas):
// Bane 25/100/300 kills e 5/15/30 pontos; Archfoe 5/20/60 e Nemesis 1/3/5,
// os dois com 10/30/60 pontos.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bonusLoot, chegouAoObjetivo, objetivoOmissao, patamar, pontos, proximo } from './bosstiary.ts';

test('patamar pelas kills', () => {
  assert.equal(patamar(4, 'Archfoe'), 'nenhum');
  assert.equal(patamar(5, 'Archfoe'), 'prowess');
  assert.equal(patamar(20, 'Archfoe'), 'expertise');
  assert.equal(patamar(60, 'Archfoe'), 'mastery');
  assert.equal(patamar(300, 'Bane'), 'mastery');
  assert.equal(patamar(1, 'Nemesis'), 'prowess');
});

test('pontos acumulados', () => {
  assert.equal(pontos(20, 'Archfoe'), 40);
  assert.equal(pontos(25, 'Bane'), 5);
  assert.equal(pontos(5, 'Nemesis'), 100);
  assert.equal(pontos(0, 'Archfoe'), 0);
  assert.equal(pontos(999, 'Bane'), 50);
});

test('o que falta para o patamar seguinte', () => {
  assert.deepEqual(proximo(12, 'Archfoe'), { patamar: 'expertise', faltam: 8 });
  assert.deepEqual(proximo(0, 'Bane'), { patamar: 'prowess', faltam: 25 });
  assert.equal(proximo(60, 'Archfoe'), null);
});

test('objetivo por omissão e quando se chega lá', () => {
  assert.equal(objetivoOmissao('Archfoe'), 'mastery');
  assert.equal(objetivoOmissao('Nemesis'), 'mastery');
  assert.equal(objetivoOmissao('Bane'), 'prowess');
  assert.equal(chegouAoObjetivo(24, 'Bane', 'prowess'), false);
  assert.equal(chegouAoObjetivo(25, 'Bane', 'prowess'), true);
  assert.equal(chegouAoObjetivo(59, 'Archfoe', 'mastery'), false);
});

test('bónus de loot do slot pelos pontos', () => {
  assert.equal(bonusLoot(0), 25);
  assert.equal(bonusLoot(100), 35);
  assert.equal(bonusLoot(250), 50);
  assert.equal(bonusLoot(750), 75);
  assert.equal(bonusLoot(1250), 100);
  assert.equal(bonusLoot(1274), 100);
  assert.equal(bonusLoot(1275), 101);
  assert.equal(bonusLoot(1305), 102);
});
