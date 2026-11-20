// Histórico dos skills (20/11/2026, pedido do André: «que eles fiquem gravados,
// com isto, podemos avaliar o progresso de evolução dos Skills ao longo do
// tempo e até quando há os eventos»).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fractionalLevel,
  rateInsideOutsideEvents,
  ratePerDay,
  readingFromConfig,
  sanitizeEvents,
  sanitizeReadings,
  skillSeries,
  type SkillReading,
} from './skillsHistory.ts';

const DIA = 24 * 60 * 60 * 1000;
const t0 = new Date(2026, 10, 1).getTime(); // 01/11/2026 00:00, hora local

test('nível fracionário: o jogo mostra o que falta', () => {
  assert.equal(fractionalLevel(80, 100), 80);
  assert.equal(fractionalLevel(80, 25), 80.75);
});

test('leituras: o lixo sai, o que está certo fica e vem por ordem', () => {
  const r = sanitizeReadings([
    { timestamp: t0 + DIA, loyaltyBonusPercent: 0, skills: { magic: { level: 81, percentMissing: 50 } } },
    'lixo',
    { timestamp: 'ontem', skills: {} },
    { timestamp: t0, loyaltyBonusPercent: 7, skills: { magic: { level: 80, percentMissing: 40 }, nada: { level: 1, percentMissing: 1 }, fist: { level: 'x' } } },
    { timestamp: t0 + 2 * DIA, loyaltyBonusPercent: 0, skills: { magic: { level: 82, percentMissing: 120 } } },
  ]);
  assert.deepEqual(r, [
    { timestamp: t0, loyaltyBonusPercent: 0, skills: { magic: { level: 80, percentMissing: 40 } } },
    { timestamp: t0 + DIA, loyaltyBonusPercent: 0, skills: { magic: { level: 81, percentMissing: 50 } } },
  ]);
  assert.deepEqual(sanitizeReadings(null), []);
  assert.deepEqual(sanitizeReadings({ leituras: [] }), []);
});

test('eventos: só os que têm nome e datas certas, com o fim depois do início', () => {
  const e = sanitizeEvents([
    { id: 'a', name: 'Double Skill', start: '2026-11-21', end: '2026-11-24' },
    { id: 'b', name: '', start: '2026-11-21', end: '2026-11-24' },
    { id: 'c', name: 'Ao contrário', start: '2026-11-24', end: '2026-11-21' },
    { id: 'd', name: 'Data má', start: '21/11/2026', end: '2026-11-24' },
    7,
  ]);
  assert.deepEqual(e, [{ id: 'a', name: 'Double Skill', start: '2026-11-21', end: '2026-11-24' }]);
});

test('leitura a partir da calculadora: só as skills com valores válidos', () => {
  const r = readingFromConfig(
    {
      knightWeapons: [],
      specialDummy: false,
      loyaltyBonusPercent: 10,
      targetMode: 'level',
      skills: { magic: { level: '80', percent: '40' }, fist: { level: '', percent: '' }, distance: { level: '90', percent: '20' } },
    },
    ['magic', 'fist'],
    t0
  );
  assert.deepEqual(r, { timestamp: t0, loyaltyBonusPercent: 10, skills: { magic: { level: 80, percentMissing: 40 } } });
  assert.equal(
    readingFromConfig({ knightWeapons: [], specialDummy: false, loyaltyBonusPercent: 0, targetMode: 'level', skills: {} }, ['magic'], t0),
    null
  );
});

const leituras: SkillReading[] = [
  { timestamp: t0, loyaltyBonusPercent: 0, skills: { magic: { level: 80, percentMissing: 100 } } },
  { timestamp: t0 + 2 * DIA, loyaltyBonusPercent: 0, skills: { magic: { level: 81, percentMissing: 100 }, fist: { level: 100, percentMissing: 50 } } },
  { timestamp: t0 + 4 * DIA, loyaltyBonusPercent: 0, skills: { magic: { level: 82, percentMissing: 100 } } },
];

test('série e ritmo por dia', () => {
  assert.deepEqual(skillSeries(leituras, 'magic').map((p) => p.value), [80, 81, 82]);
  assert.deepEqual(skillSeries(leituras, 'fist'), [{ timestamp: t0 + 2 * DIA, value: 100.5 }]);
  assert.equal(ratePerDay(skillSeries(leituras, 'magic')), 0.5);
  // uma leitura só, ou duas no mesmo minuto: não há ritmo
  assert.equal(ratePerDay(skillSeries(leituras, 'fist')), null);
  assert.equal(ratePerDay([{ timestamp: t0, value: 1 }, { timestamp: t0 + 1000, value: 2 }]), null);
});

test('ritmo dentro e fora dos eventos: só os intervalos todos de um lado contam', () => {
  // 01/11 → 03/11 → 05/11 → 07/11; evento de 03/11 a 05/11 (inclusive).
  const serie = [
    { timestamp: t0, value: 80 },
    { timestamp: t0 + 2 * DIA, value: 81 }, // 2 dias fora: +1
    { timestamp: t0 + 4 * DIA, value: 85 }, // 2 dias dentro: +4
    { timestamp: t0 + 6 * DIA, value: 86 }, // atravessa o fim (05/11 12h → 07/11): não conta
  ];
  const eventos = [{ id: 'e', name: 'Double Skill', start: '2026-11-03', end: '2026-11-05' }];
  assert.deepEqual(rateInsideOutsideEvents(serie, eventos), { inside: 2, outside: 0.5 });
  assert.deepEqual(rateInsideOutsideEvents(serie, []), { inside: null, outside: 1 });
});
