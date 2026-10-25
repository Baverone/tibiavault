// O treino de skills não tinha testes. 25/10/2026 (revisão): o nível base era
// tirado de um logaritmo com `floor`, e em cima de um nível certo o logaritmo
// sai às vezes 49,9999999 — Magic Level 50 de um Monk, sem Loyalty, aparecia
// como «base 49, 99,99 %», com 0 Lasting Exercise para o nível seguinte.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSkillTraining,
  calculateTrainingToTarget,
  minSkillLevel,
  VOCATION_SKILLS,
  type Vocation,
} from './skillTraining.ts';

test('sem Loyalty, o nível base é o nível do jogo em todos os níveis de todas as skills', () => {
  const errados: string[] = [];
  for (const vocation of Object.keys(VOCATION_SKILLS) as Vocation[]) {
    for (const skill of VOCATION_SKILLS[vocation]) {
      const min = minSkillLevel(skill);
      for (let level = min; level <= min + 150; level++) {
        const r = calculateSkillTraining(skill, vocation, level, 0, false, 0);
        if (r.baseLevel !== level || r.basePercent !== 0 || r.chargesNormalBase !== r.chargesNormal) {
          errados.push(`${vocation} ${skill} ${level} → base ${r.baseLevel} (${r.basePercent}%)`);
        }
      }
    }
  }
  assert.deepEqual(errados, []);
});

test('o caso que se via: Magic Level 50 de um Monk, 0% feito', () => {
  const r = calculateSkillTraining('magic', 'monk', 50, 0, false, 0);
  assert.equal(r.baseLevel, 50);
  assert.ok(r.chargesNormalBase > 0);
  // o alvo 50 já está atingido: não há varinhas a mostrar
  assert.equal(calculateTrainingToTarget('magic', 'monk', 50, 0, 50, false, 0), null);
  assert.ok(calculateTrainingToTarget('magic', 'monk', 50, 0, 51, false, 0)!.lastingNormal > 0);
});

test('com Loyalty o nível base fica atrás do do jogo, e a meio de um nível não salta', () => {
  const r = calculateSkillTraining('distance', 'paladin', 100, 50, false, 10);
  assert.ok(r.baseLevel < 100);
  assert.ok(r.basePercent > 0 && r.basePercent < 100);
  const meio = calculateSkillTraining('magic', 'monk', 50, 50, false, 0);
  assert.equal(meio.baseLevel, 50);
  assert.ok(Math.abs(meio.basePercent - 50) < 0.01);
});
