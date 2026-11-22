// O estado do Bosstiary de cada personagem e as alterações que o mudam
// (22/11/2026). Gravam-se diferenças, nunca o ficheiro inteiro por cima.
import test from 'node:test';
import assert from 'node:assert/strict';
import { acessoEfetivo, aplicar, estadoDe, limparEstado, type EstadoPersonagem } from './estado.ts';

const vazio = (): EstadoPersonagem => ({ bosses: {}, pontosJogo: null, aplicadas: [] });

test('limparEstado: lixo dá um estado vazio, kills ficam inteiros ≥ 0', () => {
  assert.deepEqual(limparEstado(null), { bosses: {}, pontosJogo: null, aplicadas: [] });
  assert.deepEqual(limparEstado('x'), { bosses: {}, pontosJogo: null, aplicadas: [] });
  const e = limparEstado({ bosses: { a: { kills: -3 }, b: { kills: 'abc' }, c: { kills: 7.9, marcaSolo: 'nada' } }, pontosJogo: 'x' });
  assert.equal(e.bosses.a.kills, 0);
  assert.equal(e.bosses.b.kills, 0);
  assert.equal(e.bosses.c.kills, 7);
  assert.equal(e.bosses.c.marcaSolo, undefined);
  assert.equal(e.pontosJogo, null);
});

test('kill soma e guarda a hora; não muda o original', () => {
  const antes = vazio();
  const depois = aplicar(antes, [{ tipo: 'kill', id: 'unaz', quantas: 3, quando: '2026-11-22T20:00:00.000Z' }]);
  assert.equal(depois.bosses.unaz.kills, 3);
  assert.equal(depois.bosses.unaz.ultimaKill, '2026-11-22T20:00:00.000Z');
  assert.deepEqual(antes, vazio());
});

test('kills escritas à mão são limpas', () => {
  assert.equal(aplicar(vazio(), [{ tipo: 'kills', id: 'a', valor: -2 }]).bosses.a.kills, 0);
  assert.equal(aplicar(vazio(), [{ tipo: 'kills', id: 'a', valor: 7.6 }]).bosses.a.kills, 7);
});

test('a marca de team não mexe na de solo', () => {
  let e = aplicar(vazio(), [{ tipo: 'marca', id: 'a', modo: 'solo', marca: 'sempre' }]);
  e = aplicar(e, [{ tipo: 'marca', id: 'a', modo: 'team', marca: 'fora' }]);
  assert.equal(e.bosses.a.marcaSolo, 'sempre');
  assert.equal(e.bosses.a.marcaTeam, 'fora');
});

test('acesso, objetivo, passou e pontos no jogo', () => {
  const e = aplicar(vazio(), [
    { tipo: 'acesso', id: 'a', acesso: false },
    { tipo: 'objetivo', id: 'a', objetivo: 'expertise' },
    { tipo: 'passou', id: 'a', passou: true },
    { tipo: 'pontosJogo', valor: 1234 },
  ]);
  assert.equal(e.bosses.a.acesso, false);
  assert.equal(e.bosses.a.objetivo, 'expertise');
  assert.equal(e.bosses.a.passou, true);
  assert.equal(e.pontosJogo, 1234);
});

test('estadoDe dá o valor por omissão a um boss sem registo', () => {
  assert.deepEqual(estadoDe(vazio(), 'x'), { kills: 0, ultimaKill: null, acesso: null });
});

test('acesso efetivo: quem tem kills tem acesso, salvo «sem acesso» explícito', () => {
  assert.equal(acessoEfetivo({ kills: 3, ultimaKill: null, acesso: null }), true);
  assert.equal(acessoEfetivo({ kills: 0, ultimaKill: null, acesso: null }), null);
  assert.equal(acessoEfetivo({ kills: 3, ultimaKill: null, acesso: false }), false);
  assert.equal(acessoEfetivo({ kills: 0, ultimaKill: null, acesso: true }), true);
});

test('uma alteração com uid já aplicado não conta duas vezes (o mesmo lote gravado duas vezes)', () => {
  const kill = { tipo: 'kill' as const, id: 'drume', quantas: 1, quando: '2026-11-22T20:00:00.000Z', uid: 'u1' };
  const uma = aplicar(vazio(), [kill]);
  assert.equal(uma.bosses.drume.kills, 1);
  assert.deepEqual(uma.aplicadas, ['u1']);
  const outraVez = aplicar(uma, [kill]);
  assert.equal(outraVez.bosses.drume.kills, 1);
  assert.deepEqual(limparEstado(JSON.parse(JSON.stringify(outraVez))).aplicadas, ['u1']);
});

test('a lista de uids aplicados fica com os 300 mais recentes', () => {
  const muitas = Array.from({ length: 305 }, (_, i) => ({ tipo: 'kill' as const, id: 'a', quantas: 1, quando: '2026-11-22T20:00:00.000Z', uid: `u${i}` }));
  const e = aplicar(vazio(), muitas);
  assert.equal(e.bosses.a.kills, 305);
  assert.equal(e.aplicadas.length, 300);
  assert.equal(e.aplicadas[299], 'u304');
});
