// A fila das gravações do Bosstiary (22/11/2026): os cliques juntam-se e
// gravam-se num commit só, 2 s depois do último.
import test from 'node:test';
import assert from 'node:assert/strict';
import { juntar } from './fila.ts';
import type { Alteracao } from './estado.ts';

const kill: Alteracao = { tipo: 'kill', id: 'drume', quantas: 1, quando: '2026-11-22T20:00:00.000Z' };

test('kills seguidas no mesmo boss ficam todas', () => {
  assert.equal(juntar(juntar([], kill), kill).length, 2);
});

test('marca repetida no mesmo boss e modo fica só a última', () => {
  let fila = juntar([], { tipo: 'marca', id: 'drume', modo: 'solo', marca: 'fora' });
  fila = juntar(fila, kill);
  fila = juntar(fila, { tipo: 'marca', id: 'drume', modo: 'solo', marca: 'sempre' });
  assert.deepEqual(fila, [kill, { tipo: 'marca', id: 'drume', modo: 'solo', marca: 'sempre' }]);
});

test('marcas de modos diferentes ou de bosses diferentes não se substituem', () => {
  let fila = juntar([], { tipo: 'marca', id: 'drume', modo: 'solo', marca: 'fora' });
  fila = juntar(fila, { tipo: 'marca', id: 'drume', modo: 'team', marca: 'fora' });
  fila = juntar(fila, { tipo: 'marca', id: 'oberon', modo: 'solo', marca: 'fora' });
  assert.equal(fila.length, 3);
});

test('kills escritas à mão: fica a última, e uma escrita apaga os +1 anteriores do mesmo boss', () => {
  let fila = juntar([], kill);
  fila = juntar(fila, { tipo: 'kills', id: 'drume', valor: 10 });
  fila = juntar(fila, { tipo: 'kills', id: 'drume', valor: 12 });
  assert.deepEqual(fila, [{ tipo: 'kills', id: 'drume', valor: 12 }]);
});

test('pontos no jogo: fica o último', () => {
  let fila = juntar([], { tipo: 'pontosJogo', valor: 100 });
  fila = juntar(fila, { tipo: 'pontosJogo', valor: 200 });
  assert.deepEqual(fila, [{ tipo: 'pontosJogo', valor: 200 }]);
});
