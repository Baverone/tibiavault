// A formula oficial da XP e a base de tudo (niveis, previsoes, hunt planner)
// e nao tinha um unico teste. `levelForExperience` e uma busca binaria por
// cima de `experienceForLevel` -- o sitio classico para um erro de fence-post
// nos limites exatos de um nivel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { experienceForLevel, levelForExperience, MAX_KNOWN_LEVEL } from './experienceTable.ts';

test('experienceForLevel bate com os valores oficiais conhecidos', () => {
  assert.equal(experienceForLevel(1), 0);
  assert.equal(experienceForLevel(2), 100);
  assert.equal(experienceForLevel(8), 4200);
  assert.equal(experienceForLevel(100), 15_694_800);
});

test('experienceForLevel rejeita niveis invalidos', () => {
  assert.throws(() => experienceForLevel(0), /Invalid level/);
  assert.throws(() => experienceForLevel(-5), /Invalid level/);
  assert.throws(() => experienceForLevel(1.5), /Invalid level/);
  assert.throws(() => experienceForLevel(NaN), /Invalid level/);
});

test('experienceForLevel funciona acima do MAX_KNOWN_LEVEL (a formula nao tem teto)', () => {
  assert.equal(experienceForLevel(MAX_KNOWN_LEVEL + 1), experienceForLevel(MAX_KNOWN_LEVEL + 1));
  assert.ok(experienceForLevel(5000) > experienceForLevel(MAX_KNOWN_LEVEL));
});

test('levelForExperience rejeita experiencia invalida', () => {
  assert.throws(() => levelForExperience(-1), /Invalid experience/);
  assert.throws(() => levelForExperience(NaN), /Invalid experience/);
  assert.throws(() => levelForExperience(Infinity), /Invalid experience/);
});

test('levelForExperience acerta exatamente nas fronteiras de nivel', () => {
  const xpNivel1150 = experienceForLevel(1150);
  assert.equal(levelForExperience(xpNivel1150), 1150);
  assert.equal(levelForExperience(xpNivel1150 - 1), 1149);
  assert.equal(levelForExperience(xpNivel1150 + 1), 1150);
});

test('levelForExperience trata 0 XP como nivel 1', () => {
  assert.equal(levelForExperience(0), 1);
  assert.equal(levelForExperience(99), 1);
  assert.equal(levelForExperience(100), 2);
});

test('levelForExperience e experienceForLevel sao inversas em toda a volta, niveis 1-200', () => {
  for (let level = 1; level <= 200; level++) {
    const xp = experienceForLevel(level);
    assert.equal(levelForExperience(xp), level, `nivel ${level}`);
  }
});

test('levelForExperience aguenta XP muito grande sem degradar (busca exponencial)', () => {
  const nivelAlto = 4000;
  const xp = experienceForLevel(nivelAlto);
  assert.equal(levelForExperience(xp), nivelAlto);
});
