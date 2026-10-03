// getShareExpRange nao tinha testes, apesar de o comentario do ficheiro citar
// exemplos oficiais concretos (nivel 40 partilha com 60 mas nao com 20; 200
// partilha com 300) -- sao esses exemplos que se testam aqui.
import test from 'node:test';
import assert from 'node:assert/strict';
import { getShareExpRange } from './shareExperience.ts';

test('nivel 40: o parceiro mais fraco pode ir ate 2/3, o mais forte ate 3/2 (exemplo oficial)', () => {
  const range = getShareExpRange(40);
  assert.equal(range.min, 27); // ceil(40 * 2/3) = ceil(26.67) = 27
  assert.equal(range.max, 60); // floor(40 * 3/2) = 60
});

test('nivel 60 e o limite superior aceite para quem esta no nivel 40, e nivel 20 fica de fora', () => {
  const rangeDe40 = getShareExpRange(40);
  assert.ok(60 <= rangeDe40.max);
  assert.ok(20 < rangeDe40.min);
});

test('nivel 200 partilha com nivel 300 (exemplo oficial)', () => {
  const range = getShareExpRange(200);
  assert.equal(range.max, 300);
});

test('nivel 1 nunca produz um minimo abaixo de 1', () => {
  const range = getShareExpRange(1);
  assert.ok(range.min >= 1);
});
