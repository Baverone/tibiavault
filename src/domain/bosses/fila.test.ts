// A fila das gravações do Bosstiary (22/11/2026): os cliques juntam-se e
// gravam-se num commit só, 2 s depois do último.
import test from 'node:test';
import assert from 'node:assert/strict';
import { devolver, juntar, tirar } from './fila.ts';
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

test('depois de gravar saem as alterações gravadas, pelo uid — não pela contagem', () => {
  // O lote em gravação levou «marca X = fora». Entretanto: +1 no Y e outra marca no X.
  const gravado: Alteracao[] = [{ tipo: 'marca', id: 'x', modo: 'solo', marca: 'fora', uid: 'm1' }];
  let fila: Alteracao[] = [];
  fila = juntar(fila, { tipo: 'kill', id: 'y', quantas: 1, quando: '2026-11-22T20:00:00.000Z', uid: 'k1' });
  fila = juntar(fila, { tipo: 'marca', id: 'x', modo: 'solo', marca: 'bosstiary', uid: 'm2' });
  assert.deepEqual(tirar(fila, gravado).map((a) => a.uid), ['k1', 'm2']);
});

test('se a gravação falha, o lote volta para a frente da fila, e o mais recente ganha', () => {
  const lote: Alteracao[] = [
    { tipo: 'kill', id: 'y', quantas: 1, quando: '2026-11-22T20:00:00.000Z', uid: 'k1' },
    { tipo: 'marca', id: 'x', modo: 'solo', marca: 'fora', uid: 'm1' },
  ];
  const fila: Alteracao[] = [{ tipo: 'marca', id: 'x', modo: 'solo', marca: 'sempre', uid: 'm2' }];
  assert.deepEqual(devolver(lote, fila).map((a) => a.uid), ['k1', 'm2']);
});
