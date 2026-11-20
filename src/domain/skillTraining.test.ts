// O treino de skills não tinha testes. 25/10/2026 (revisão): o nível base era
// tirado de um logaritmo com `floor`, e em cima de um nível certo o logaritmo
// sai às vezes 49,9999999 — Magic Level 50 de um Monk, sem Loyalty, aparecia
// como «base 49, 99,99 %», com 0 Lasting Exercise para o nível seguinte.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSkillTraining,
  calculateSkillFromWands,
  calculateTrainingToTarget,
  LASTING_EXERCISE_CHARGES,
  MAX_SKILL_LEVEL,
  minSkillLevel,
  VOCATION_SKILLS,
  type TrainableSkill,
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

// Auditoria de 11/11/2026 (Codex): nivel 10000 bloqueava a pagina num ciclo infinito.
test('no teto (MAX_SKILL_LEVEL) todas as contas acabam e dao numeros finitos', () => {
  const casos: Array<[TrainableSkill, Vocation]> = [
    ['magic', 'knight'], ['magic', 'paladin'], ['magic', 'sorcerer'], ['magic', 'monk'],
    ['distance', 'paladin'], ['sword', 'knight'], ['shielding', 'knight'], ['fist', 'monk'],
  ];
  for (const [skill, vocation] of casos) {
    const r = calculateSkillTraining(skill, vocation, MAX_SKILL_LEVEL - 1, 50, false, 0);
    assert.ok(Number.isFinite(r.pointsRemaining) && Number.isFinite(r.chargesNormal), `${skill}/${vocation}`);
    const t = calculateTrainingToTarget(skill, vocation, 100, 0, MAX_SKILL_LEVEL, false, 50);
    assert.ok(t && Number.isFinite(t.lastingNormal), `${skill}/${vocation} alvo`);
  }
});

test('acima do teto falha logo, em vez de bloquear', () => {
  assert.throws(() => calculateSkillTraining('magic', 'paladin', 10000, 50, false, 0), RangeError);
});

// 20/11/2026, pedido do André: «quantas varinhas quero gastar, e com o numero
// de varinhas dizes me o skill que obtenho» — o inverso do nível objetivo.
test('varinhas → skill: 0 varinhas devolve o nível atual', () => {
  const r = calculateSkillFromWands('magic', 'monk', 50, 30, 0, false, 0);
  assert.equal(r.base.level, 50);
  assert.ok(Math.abs(r.base.percent - 30) < 0.01);
  assert.equal(r.displayed.level, 50);
  assert.equal(r.capped, false);
});

test('varinhas → skill: as varinhas do objetivo levam pelo menos até ao objetivo', () => {
  for (const [skill, vocation] of [['magic', 'monk'], ['fist', 'monk'], ['distance', 'paladin'], ['magic', 'paladin']] as [TrainableSkill, Vocation][]) {
    const min = minSkillLevel(skill);
    const alvo = calculateTrainingToTarget(skill, vocation, min + 20, 40, min + 25, false, 0)!;
    const r = calculateSkillFromWands(skill, vocation, min + 20, 40, alvo.lastingNormal, false, 0);
    assert.ok(r.base.level >= min + 25, `${skill}/${vocation}: ${r.base.level}`);
    const menos = calculateSkillFromWands(skill, vocation, min + 20, 40, alvo.lastingNormal - 1, false, 0);
    assert.ok(menos.base.level < min + 25 || alvo.lastingNormal === 1, `${skill}/${vocation} com uma a menos`);
  }
});

test('varinhas → skill: uma varinha vale 14 400 cargas', () => {
  // Magic Level de Monk, 600 de mana por carga, do nível 0 exato.
  const r = calculateSkillFromWands('magic', 'monk', 0, 0, 1, false, 0);
  const pontos = LASTING_EXERCISE_CHARGES * 600;
  const soma = (l: number) => (1600 * (Math.pow(1.25, l) - 1)) / 0.25;
  assert.ok(soma(r.base.level) <= pontos && soma(r.base.level + 1) > pontos);
});

test('varinhas → skill: com Double Skill Event sobe-se mais, e com Loyalty o do jogo vai à frente', () => {
  const r = calculateSkillFromWands('distance', 'paladin', 100, 50, 10, false, 10);
  const nivel = (x: { level: number; percent: number }) => x.level + x.percent / 100;
  assert.ok(nivel(r.baseDouble) > nivel(r.base));
  assert.ok(nivel(r.displayed) > nivel(r.base));
  assert.ok(nivel(r.displayedDouble) > nivel(r.displayed));
});

test('varinhas → skill: acima do teto para no máximo e diz isso', () => {
  const r = calculateSkillFromWands('fist', 'monk', 100, 0, 1e30, false, 0);
  assert.equal(r.capped, true);
  assert.equal(r.base.level, MAX_SKILL_LEVEL);
});
