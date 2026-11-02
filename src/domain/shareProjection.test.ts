// Dias ate o Bluey e o Baverone partilharem XP: a regra dos 2/3, a simulacao
// dia a dia e a XP por dia que o mais baixo precisa para la chegar a tempo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { experienceForLevel } from './experienceTable.ts';
import { canShare, dailyXpToShareIn, daysUntilShare, parseDailyXp, shareGap } from './shareProjection.ts';

test('canShare segue os exemplos oficiais e nao depende da ordem', () => {
  assert.equal(canShare(40, 60), true);
  assert.equal(canShare(60, 40), true);
  assert.equal(canShare(40, 61), false);
  assert.equal(canShare(200, 300), true);
  assert.equal(canShare(20, 40), false);
});

test('daysUntilShare devolve 0 quando ja partilham', () => {
  const alto = { experience: experienceForLevel(300), dailyXp: 1_000_000 };
  const baixo = { experience: experienceForLevel(200), dailyXp: 0 };
  assert.equal(daysUntilShare(alto, baixo), 0);
});

test('daysUntilShare acerta no dia em que o mais baixo chega ao nivel que falta', () => {
  // O alto parado no 300 pede o 200; o baixo comeca no 199 e precisa de 10 dias.
  const falta = experienceForLevel(200) - experienceForLevel(199);
  const alto = { experience: experienceForLevel(300), dailyXp: 0 };
  const baixo = { experience: experienceForLevel(199), dailyXp: Math.ceil(falta / 10) };
  assert.equal(daysUntilShare(alto, baixo), 10);
});

test('daysUntilShare devolve null quando o mais alto se afasta mais depressa', () => {
  // Os numeros de 01/11/2026, ao ritmo de 30 dias: 18,1 M contra 3,5 M por dia.
  const baverone = { experience: 27_372_383_124, dailyXp: 18_100_000 };
  const bluey = { experience: 3_686_950_076, dailyXp: 3_500_000 };
  assert.equal(daysUntilShare(baverone, bluey), null);
});

test('daysUntilShare respeita o limite de dias', () => {
  const falta = experienceForLevel(200) - experienceForLevel(199);
  const alto = { experience: experienceForLevel(300), dailyXp: 0 };
  const baixo = { experience: experienceForLevel(199), dailyXp: Math.ceil(falta / 10) };
  assert.equal(daysUntilShare(alto, baixo, 9), null);
});

test('daysUntilShare com o mais alto a perder XP: partilham quando ele desce ao alcance', () => {
  // O baixo parado no 150 partilha com quem estiver ate ao 225.
  const alto = { experience: experienceForLevel(300), dailyXp: -1_000_000 };
  const baixo = { experience: experienceForLevel(150), dailyXp: 0 };
  const dias = daysUntilShare(alto, baixo);
  assert.ok(dias !== null);
  assert.ok(experienceForLevel(300) - dias * 1_000_000 < experienceForLevel(226));
});

test('daysUntilShare nao rebenta quando a XP chegaria abaixo de 0', () => {
  const alto = { experience: experienceForLevel(300), dailyXp: -1_000_000_000_000 };
  const baixo = { experience: experienceForLevel(10), dailyXp: 0 };
  // Fica no nivel 1, que nao partilha com o 10.
  assert.equal(daysUntilShare(alto, baixo, 30), null);
});

test('shareGap: com o Baverone no 1181 o Bluey precisa do 788', () => {
  const gap = shareGap(experienceForLevel(1181), experienceForLevel(606));
  assert.equal(gap.levelNeeded, 788);
  assert.equal(gap.experienceMissing, experienceForLevel(788) - experienceForLevel(606));
});

test('shareGap da 0 de XP em falta quando o mais baixo ja tem o nivel', () => {
  assert.equal(shareGap(experienceForLevel(300), experienceForLevel(250)).experienceMissing, 0);
});

test('dailyXpToShareIn com o mais alto parado e o que falta a dividir pelos dias', () => {
  const alto = { experience: experienceForLevel(300), dailyXp: 0 };
  const baixo = experienceForLevel(150);
  assert.equal(dailyXpToShareIn(alto, baixo, 30), Math.ceil((experienceForLevel(200) - baixo) / 30));
});

test('dailyXpToShareIn conta com o que o mais alto sobe entretanto', () => {
  const alto = { experience: experienceForLevel(1181), dailyXp: 18_100_000 };
  const baixo = experienceForLevel(606);
  const parado = dailyXpToShareIn({ ...alto, dailyXp: 0 }, baixo, 90);
  const aSubir = dailyXpToShareIn(alto, baixo, 90);
  assert.ok(aSubir > parado);
  // Fazendo exatamente isso por dia, partilham ao fim desses dias (ou antes).
  const dias = daysUntilShare(alto, { experience: baixo, dailyXp: aSubir });
  assert.ok(dias !== null && dias <= 90);
});

test('dailyXpToShareIn da 0 quando ja partilham', () => {
  const alto = { experience: experienceForLevel(300), dailyXp: 0 };
  assert.equal(dailyXpToShareIn(alto, experienceForLevel(250), 30), 0);
});

test('parseDailyXp aceita o numero inteiro, com separadores, e em milhoes', () => {
  assert.equal(parseDailyXp('18100000'), 18_100_000);
  assert.equal(parseDailyXp('18 100 000'), 18_100_000);
  assert.equal(parseDailyXp('18.100.000'), 18_100_000);
  assert.equal(parseDailyXp('18,1M'), 18_100_000);
  assert.equal(parseDailyXp('18.1 m'), 18_100_000);
  assert.equal(parseDailyXp('18kk'), 18_000_000);
  assert.equal(parseDailyXp('0'), 0);
});

test('parseDailyXp devolve null para vazio ou texto que nao e numero', () => {
  assert.equal(parseDailyXp(''), null);
  assert.equal(parseDailyXp('   '), null);
  assert.equal(parseDailyXp('muito'), null);
  assert.equal(parseDailyXp('18,1'), null);
  assert.equal(parseDailyXp('12abc'), null);
});
