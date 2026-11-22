// A rotação de hoje (22/11/2026): o que entra, por que ordem, e o que fica de
// fora. Catálogo pequeno escrito aqui, para cada regra se ver sozinha.
import test from 'node:test';
import assert from 'node:assert/strict';
import { marcaEfetiva, rotacaoSolo, rotacaoTeam, type Contexto } from './rotacao.ts';
import type { EstadoPersonagem } from './estado.ts';
import type { Boss, Catalogo, ModoSolo, ModoTeam } from './types.ts';

const H = 3600_000;
const AGORA = Date.parse('2026-11-23T12:00:00.000Z'); // segunda-feira

const solo = (bloco: string, extra: Partial<ModoSolo> = {}): ModoSolo => ({
  dificil: false, nivelRp: 300, nivelMonk: 300, valor: 'equipamento', bloco, ordem: 0, minutos: 10, ...extra,
});
const team = (bloco: string, extra: Partial<ModoTeam> = {}): ModoTeam => ({
  tamanhoMin: 3, tamanhoTipico: 5, composicao: '', nivel: 500, valor: 'equipamento', bloco, ordem: 0, minutos: 20, ...extra,
});
const boss = (id: string, extra: Partial<Boss> = {}): Boss => ({
  id, nome: id, area: '', regiao: '', categoria: 'Archfoe', cooldownH: 20, acesso: '', loot: '', notas: '', incerto: false, fontes: [], ...extra,
});

const catalogo: Catalogo = {
  geradoEm: '2026-11-22',
  blocos: [
    { id: 'd1', nome: 'Edron', tipo: 'diario', ordem: 0 },
    { id: 'endgame', nome: 'Endgame', tipo: 'endgame', ordem: 1 },
    { id: 'f44', nome: 'Ferumbras', tipo: 'semana', ordem: 2 },
    { id: 'seg', nome: 'Segunda', tipo: 'semana', ordem: 3, diaSemana: 1 },
    { id: 'ter', nome: 'Terça', tipo: 'semana', ordem: 4, diaSemana: 2 },
    { id: 't1', nome: 'Rotten', tipo: 'team', ordem: 5 },
    { id: 't2', nome: 'Cults', tipo: 'team', ordem: 6 },
  ],
  bosses: [
    boss('drume', { solo: solo('d1') }),
    boss('oberon', { solo: solo('d1', { ordem: 1, nivelMonk: 700 }) }),
    boss('vlark', { solo: solo('d1', { ordem: 2, nivelMonk: null, nivelRp: 500 }) }),
    boss('bane', { categoria: 'Bane', cooldownH: 2, solo: solo('d1', { ordem: 3, valor: 'bosstiary' }) }),
    boss('murcion', { solo: solo('endgame', { dificil: true }), team: team('t1') }),
    boss('selo', { cooldownH: 44, solo: solo('f44', { valor: 'bosstiary' }) }),
    boss('sandking', { solo: solo('seg', { valor: 'bosstiary' }) }),
    boss('lloyd', { solo: solo('ter', { valor: 'bosstiary' }) }),
    boss('bakragore', { categoria: 'Nemesis', cooldownH: 68, team: team('t1', { ordem: 1 }) }),
    boss('leiden', { team: team('t2', { valor: 'bosstiary' }) }),
  ],
};

const ctx = (extra: Partial<Contexto> = {}): Contexto => ({
  agora: AGORA, diaSemana: 1, nivel: 1192, personagem: 'royal-paladin', boosted: null, ...extra,
});
const vazio = (): EstadoPersonagem => ({ bosses: {}, pontosJogo: null, aplicadas: [] });
const ids = (r: ReturnType<typeof rotacaoSolo>) => r.blocos.flatMap((b) => b.entradas.map((e) => e.boss.id));

test('marca por omissão: equipamento/lucro «sempre», bosstiary «bosstiary»', () => {
  const [drume, , , bane] = catalogo.bosses;
  assert.equal(marcaEfetiva(drume, { kills: 0, ultimaKill: null, acesso: null }, 'solo'), 'sempre');
  assert.equal(marcaEfetiva(bane, { kills: 0, ultimaKill: null, acesso: null }, 'solo'), 'bosstiary');
  assert.equal(marcaEfetiva(drume, { kills: 0, ultimaKill: null, acesso: null, marcaSolo: 'fora' }, 'solo'), 'fora');
});

test('um boss «fora» ou sem acesso não aparece', () => {
  const est: EstadoPersonagem = { bosses: { drume: { kills: 0, ultimaKill: null, acesso: null, marcaSolo: 'fora' }, oberon: { kills: 4, ultimaKill: null, acesso: false } }, pontosJogo: null, aplicadas: [] };
  const r = ids(rotacaoSolo(catalogo, est, ctx()));
  assert.ok(!r.includes('drume'));
  assert.ok(!r.includes('oberon'));
});

test('um boss «bosstiary» que chegou ao objetivo sai', () => {
  const est: EstadoPersonagem = { bosses: { bane: { kills: 25, ultimaKill: null, acesso: true } }, pontosJogo: null, aplicadas: [] };
  assert.ok(!ids(rotacaoSolo(catalogo, est, ctx())).includes('bane'));
  assert.ok(ids(rotacaoSolo(catalogo, vazio(), ctx())).includes('bane'));
});

test('o Monk só vê os bosses do nível dele; sem nível do Monk usa RP + 150, estimado', () => {
  const monk = ctx({ personagem: 'exalted-monk', nivel: 623 });
  const r = rotacaoSolo(catalogo, vazio(), monk);
  assert.ok(!ids(r).includes('oberon')); // nivelMonk 700
  assert.ok(!ids(r).includes('vlark')); // 500 + 150 = 650 > 623
  const r700 = rotacaoSolo(catalogo, vazio(), ctx({ personagem: 'exalted-monk', nivel: 700 }));
  const vlark = r700.blocos.flatMap((b) => b.entradas).find((e) => e.boss.id === 'vlark');
  assert.ok(vlark);
  assert.equal(vlark.nivelEstimado, true);
});

// 22/11/2026, o André: «não preciso que contes o cooldown do boss» — o jogo
// já o mostra. Uma kill recente não tira o boss da rota nem o põe de parte.
test('sem contagem de cooldown: uma kill há 1 h fica na rota e conta nos minutos', () => {
  const est: EstadoPersonagem = { bosses: { drume: { kills: 1, ultimaKill: new Date(AGORA - 1 * H).toISOString(), acesso: true } }, pontosJogo: null, aplicadas: [] };
  const bloco = rotacaoSolo(catalogo, est, ctx()).blocos[0];
  assert.ok(bloco.entradas.some((e) => e.boss.id === 'drume'));
  assert.equal(bloco.minutos, bloco.entradas.length * 10);
});

test('o varrimento da semana só entra no seu dia; os selos (f44) todos os dias', () => {
  const seg = ids(rotacaoSolo(catalogo, vazio(), ctx({ diaSemana: 1 })));
  assert.ok(seg.includes('sandking'));
  assert.ok(!seg.includes('lloyd'));
  assert.ok(seg.includes('selo'));
  const ter = ids(rotacaoSolo(catalogo, vazio(), ctx({ diaSemana: 2 })));
  assert.ok(ter.includes('lloyd'));
  assert.ok(!ter.includes('sandking'));
  assert.ok(ter.includes('selo'));
});

test('endgame: sem «passou» fica à parte; com «passou» entra na rota', () => {
  const r = rotacaoSolo(catalogo, vazio(), ctx());
  assert.ok(!ids(r).includes('murcion'));
  assert.deepEqual(r.endgame.map((e) => e.boss.id), ['murcion']);
  const est: EstadoPersonagem = { bosses: { murcion: { kills: 0, ultimaKill: null, acesso: true, passou: true } }, pontosJogo: null, aplicadas: [] };
  const r2 = rotacaoSolo(catalogo, est, ctx());
  assert.ok(ids(r2).includes('murcion'));
  assert.equal(r2.endgame.length, 0);
});

test('o boosted fica marcado, sem ligar a maiúsculas', () => {
  const r = rotacaoSolo(catalogo, vazio(), ctx({ boosted: 'DRUME' }));
  const drume = r.blocos[0].entradas.find((e) => e.boss.id === 'drume');
  assert.equal(drume?.boosted, true);
});

test('team: sessões com equipamento são principais, só-Bosstiary ficam à parte', () => {
  const r = rotacaoTeam(catalogo, vazio(), ctx());
  assert.deepEqual(r.principais.map((b) => b.bloco.id), ['t1']);
  assert.deepEqual(r.soBosstiary.map((b) => b.bloco.id), ['t2']);
});

test('team: sem contagem de cooldown, um final de 68 h morto há 10 h continua na sessão', () => {
  const est: EstadoPersonagem = {
    bosses: {
      bakragore: { kills: 1, ultimaKill: new Date(AGORA - 10 * H).toISOString(), acesso: true },
      murcion: { kills: 1, ultimaKill: new Date(AGORA - 10 * H).toISOString(), acesso: true },
    },
    pontosJogo: null,
    aplicadas: [],
  };
  const t1 = rotacaoTeam(catalogo, est, ctx()).principais[0];
  assert.deepEqual(t1.entradas.map((e) => e.boss.id).sort(), ['bakragore', 'murcion']);
});

test('o boosted sobe para o topo, mesmo que seja de outro dia da semana', () => {
  // lloyd é do varrimento de terça; hoje é segunda.
  const r = rotacaoSolo(catalogo, vazio(), ctx({ diaSemana: 1, boosted: 'Lloyd' }));
  assert.equal(r.blocos[0].bloco.id, 'boosted');
  assert.deepEqual(r.blocos[0].entradas.map((e) => e.boss.id), ['lloyd']);
  assert.equal(r.blocos[0].entradas[0].boosted, true);
  // e não aparece duas vezes
  assert.equal(ids(r).filter((id) => id === 'lloyd').length, 1);
});

test('team: um raro não entra nas sessões (aparece na lista dos raros)', () => {
  const comRaro: Catalogo = {
    ...catalogo,
    bosses: [...catalogo.bosses, boss('ferumbras', { categoria: 'Nemesis', team: team('t1'), raro: { nomeGuildstats: 'Ferumbras' } })],
  };
  const t1 = rotacaoTeam(comRaro, vazio(), ctx()).principais.find((b) => b.bloco.id === 't1');
  assert.ok(t1);
  assert.ok(!t1.entradas.some((e) => e.boss.id === 'ferumbras'));
});

test('team: a sessão com o boosted vem primeiro', () => {
  const r = rotacaoTeam(catalogo, vazio(), ctx({ boosted: 'leiden' }));
  assert.equal(r.soBosstiary[0].bloco.id, 't2');
  const r2 = rotacaoTeam(catalogo, vazio(), ctx({ boosted: 'bakragore' }));
  assert.equal(r2.principais[0].entradas[0].boss.id, 'bakragore');
});
