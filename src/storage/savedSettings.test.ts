// Auditoria de 11/11/2026 (Codex): definicoes guardadas com JSON valido mas com
// a forma errada rebentavam as calculadoras a cada recarga.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ENTRADA_VAZIA, sanearEntrada } from './huntPlannerStorage.ts';
import { sanitizeSkillTrainingConfig } from './skillTrainingStorage.ts';

test('calculadora de hunt: campos do tipo errado voltam ao valor por omissao', () => {
  const entrada = sanearEntrada({ nivelAlvo: null, xpHora: '5000000', stamina: 'sim', extra: 1 });
  assert.deepEqual(entrada, { ...ENTRADA_VAZIA, xpHora: '5000000' });
});

test('treino de skills: forma errada nao passa, o que esta certo fica', () => {
  assert.deepEqual(sanitizeSkillTrainingConfig({ skills: null }).skills, {});
  const config = sanitizeSkillTrainingConfig({
    knightWeapons: ['sword', 'lanca', 3],
    skills: { magic: { level: '80', percent: '40', target: '90' }, sword: { level: 1 }, nada: { level: '1', percent: '1' } },
    specialDummy: 'sim',
    loyaltyBonusPercent: 7,
  });
  assert.deepEqual(config, {
    knightWeapons: ['sword'],
    skills: { magic: { level: '80', percent: '40', target: '90' } },
    specialDummy: false,
    loyaltyBonusPercent: 0,
    targetMode: 'level',
  });
  assert.equal(sanitizeSkillTrainingConfig('lixo').loyaltyBonusPercent, 0);
  // 20/11/2026: o modo por varinhas e o campo das varinhas sobrevivem a recarregar.
  const varinhas = sanitizeSkillTrainingConfig({ targetMode: 'wands', skills: { magic: { level: '80', percent: '40', wands: '12' } } });
  assert.equal(varinhas.targetMode, 'wands');
  assert.equal(varinhas.skills.magic?.wands, '12');
  assert.equal(sanitizeSkillTrainingConfig({ targetMode: 'outra' }).targetMode, 'level');
});
