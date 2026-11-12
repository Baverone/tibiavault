// validation.ts e usado por todos os formularios da app e nao tinha testes.
// O caso mais subtil, ja documentado no proprio ficheiro: `Number('')` e 0 e
// nao NaN, por isso um input feito so de separadores ("...", ",", "%") tem de
// ser tratado como vazio explicitamente, nao como um zero valido.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFutureDate,
  parseLevelList,
  parseNonNegativeInteger,
  parseNonNegativeNumber,
  parsePercentMissing,
  parsePositiveNumber,
  validateLevelInRange,
  validateLevelPlanTarget,
} from './validation.ts';

test('parseNonNegativeInteger aceita inteiros, milhares e virgula decimal', () => {
  assert.deepEqual(parseNonNegativeInteger('0', 'x'), { ok: true, value: 0 });
  assert.deepEqual(parseNonNegativeInteger('1.500', 'x'), { ok: true, value: 1500 });
});

test('parseNonNegativeInteger rejeita vazio, negativos e "so pontuacao"', () => {
  assert.equal(parseNonNegativeInteger('', 'x').ok, false);
  assert.equal(parseNonNegativeInteger('-1', 'x').ok, false);
  assert.equal(parseNonNegativeInteger('...', 'x').ok, false);
  assert.equal(parseNonNegativeInteger(',', 'x').ok, false);
});

// 12/11/2026 (proposta 4 da auditoria, decisao do Andre): ate aqui "1.5" dava
// 15 e "85.5" dava 855 sem aviso. O ponto so passa em grupos de tres.
test('parseNonNegativeInteger: o ponto so e aceite como separador de milhares', () => {
  assert.deepEqual(parseNonNegativeInteger('1.500', 'x'), { ok: true, value: 1500 });
  assert.deepEqual(parseNonNegativeInteger('3.581.151.352', 'x'), { ok: true, value: 3_581_151_352 });
  assert.deepEqual(parseNonNegativeInteger(' 12.000 ', 'x'), { ok: true, value: 12_000 });
  for (const errado of ['1.5', '85.5', '1.50', '1.5000', '1..500', '.500', '1.500.', '12.34.567']) {
    const resultado = parseNonNegativeInteger(errado, 'o nivel');
    assert.equal(resultado.ok, false, errado);
    if (!resultado.ok) assert.match(resultado.error, /ponto fora do s/, errado);
  }
});

test('parseNonNegativeNumber e parsePositiveNumber: "2.5" ja nao vira 25', () => {
  assert.equal(parseNonNegativeNumber('2.5', 'x').ok, false);
  assert.equal(parsePositiveNumber('2.5', 'x').ok, false);
  assert.deepEqual(parsePositiveNumber('2,5', 'x'), { ok: true, value: 2.5 });
  assert.deepEqual(parsePositiveNumber('1.500,5', 'x'), { ok: true, value: 1500.5 });
  assert.equal(parseNonNegativeNumber('-1.500', 'x').ok, false); // negativo, nao ponto errado
});

test('parseNonNegativeInteger: a virgula e o separador decimal, "1,5" rejeita como nao-inteiro', () => {
  assert.equal(parseNonNegativeInteger('1,5', 'x').ok, false);
});

test('parsePositiveNumber rejeita zero (estrito > 0)', () => {
  assert.equal(parsePositiveNumber('0', 'x').ok, false);
  assert.equal(parsePositiveNumber('-1', 'x').ok, false);
  assert.deepEqual(parsePositiveNumber('2,5', 'x'), { ok: true, value: 2.5 });
});

test('parseNonNegativeNumber aceita zero mas nao negativos', () => {
  assert.deepEqual(parseNonNegativeNumber('0', 'x'), { ok: true, value: 0 });
  assert.equal(parseNonNegativeNumber('-0.1', 'x').ok, false);
});

test('parsePercentMissing aceita 0-100 e o simbolo %, rejeita fora do intervalo', () => {
  assert.deepEqual(parsePercentMissing('50%'), { ok: true, value: 50 });
  assert.deepEqual(parsePercentMissing('0'), { ok: true, value: 0 });
  assert.deepEqual(parsePercentMissing('100'), { ok: true, value: 100 });
  assert.equal(parsePercentMissing('101').ok, false);
  assert.equal(parsePercentMissing('-1').ok, false);
  assert.equal(parsePercentMissing('%').ok, false); // so pontuacao, nao pode virar zero
});

test('validateLevelInRange rejeita nivel 0, negativo, nao-inteiro e acima do maximo', () => {
  assert.equal(validateLevelInRange(0, 3500).ok, false);
  assert.equal(validateLevelInRange(-1, 3500).ok, false);
  assert.equal(validateLevelInRange(1.5, 3500).ok, false);
  assert.equal(validateLevelInRange(3501, 3500).ok, false);
  assert.deepEqual(validateLevelInRange(3500, 3500), { ok: true, value: 3500 });
});

test('parseLevelList separa por virgula/espaco/ponto-e-virgula, ordena e remove duplicados', () => {
  const resultado = parseLevelList('1400, 1350 1400;1500', 3500);
  assert.equal(resultado.ok, true);
  if (resultado.ok) assert.deepEqual(resultado.value, [1350, 1400, 1500]);
});

test('parseLevelList propaga o erro do primeiro nivel invalido da lista', () => {
  const resultado = parseLevelList('1400, -5', 3500);
  assert.equal(resultado.ok, false);
});

test('validateLevelPlanTarget exige alvo estritamente maior que o nivel atual', () => {
  assert.equal(validateLevelPlanTarget(100, 100, 3500).ok, false);
  assert.equal(validateLevelPlanTarget(99, 100, 3500).ok, false);
  assert.deepEqual(validateLevelPlanTarget(101, 100, 3500), { ok: true, value: 101 });
});

test('validateLevelPlanTarget rejeita uma diferenca maior que MAX_LEVEL_PLAN_STEPS', () => {
  assert.equal(validateLevelPlanTarget(700, 100, 3500).ok, false);
  assert.equal(validateLevelPlanTarget(600, 100, 3500).ok, true);
});

test('parseFutureDate rejeita vazio e datas invalidas', () => {
  assert.equal(parseFutureDate('').ok, false);
  assert.equal(parseFutureDate('nao e uma data').ok, false);
});

test('parseFutureDate aceita hoje mas rejeita ontem, comparando so a data (sem hora)', () => {
  const hoje = new Date(2026, 8, 15, 23, 0, 0);
  assert.equal(parseFutureDate('2026-09-15', hoje).ok, true);
  assert.equal(parseFutureDate('2026-09-14', hoje).ok, false);
});
