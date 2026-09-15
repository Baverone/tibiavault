// getLevelProgress combina experienceTable com um simples "quanto falta" e
// nao tinha testes proprios.
import test from 'node:test';
import assert from 'node:assert/strict';
import { experienceForLevel } from './experienceTable.ts';
import { getLevelProgress } from './levelProgress.ts';

test('no limite exato de um nivel, o progresso e 0% e falta tudo do proximo', () => {
  const xpNivel50 = experienceForLevel(50);
  const progresso = getLevelProgress(xpNivel50);
  assert.equal(progresso.currentLevel, 50);
  assert.equal(progresso.nextLevel, 51);
  assert.equal(progresso.experienceIntoLevel, 0);
  assert.equal(progresso.progressPercent, 0);
});

test('a meio de um nivel, o progresso reflete a fracao de XP ganha nesse nivel', () => {
  const inicio = experienceForLevel(50);
  const fim = experienceForLevel(51);
  const meio = inicio + Math.round((fim - inicio) / 2);
  const progresso = getLevelProgress(meio);
  assert.ok(progresso.progressPercent > 0 && progresso.progressPercent < 100);
  assert.equal(progresso.experienceToNextLevel, fim - meio);
});

test('progressPercent fica sempre entre 0 e 100, mesmo mesmo assim que entra no nivel', () => {
  const xp = experienceForLevel(10) + 1;
  const progresso = getLevelProgress(xp);
  assert.ok(progresso.progressPercent >= 0);
  assert.ok(progresso.progressPercent <= 100);
});
