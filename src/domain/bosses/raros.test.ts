// A lista dos raros (22/11/2026): a chance de hoje do GuildStats ao lado do
// progresso no Bosstiary, pela ordem de quem tem mais hipóteses de aparecer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { leituraVelha, limparLeitura, listaRaros } from './raros.ts';
import type { EstadoPersonagem } from './estado.ts';
import type { Boss, Catalogo } from './types.ts';

const raro = (nome: string, nomeGuildstats = nome): Boss => ({
  id: nome.toLowerCase().replace(/[^a-z]+/g, '-'), nome, area: '', regiao: '', categoria: 'Nemesis', cooldownH: null,
  acesso: '', loot: '', notas: '', incerto: false, fontes: [], raro: { nomeGuildstats },
});
const catalogo: Catalogo = {
  geradoEm: '2026-11-22',
  blocos: [],
  bosses: [
    raro('Dharalion'), raro("Gaz'haragoth"), raro('Morshabaal'), raro('Tyrn'), raro('Arachir the Ancient One', 'Arachir The Ancient One'),
    raro('Zushuka'), raro('Sem Leitura'),
    { ...raro('Nao Raro'), raro: undefined, solo: { dificil: false, nivelRp: 1, nivelMonk: 1, valor: 'bosstiary', bloco: 'd1', ordem: 0, minutos: 5 } },
  ],
};
const AGORA = Date.parse('2026-11-22T12:00:00Z');
const leitura = limparLeitura({
  lidoEm: '2026-11-22T10:10:00.000Z',
  fonte: 'https://guildstats.eu/bosses?world=Celesta',
  bosses: [
    { nome: 'Dharalion', tipo: 'Nemesis', previsao: { tipo: 'nao', emDias: 3 }, ultimoVisto: '2026-11-19', ontem: 0 },
    { nome: "Gaz'haragoth", tipo: 'Nemesis', previsao: { tipo: 'pct', valor: 9.4 }, ultimoVisto: '2026-11-03', ontem: 0 },
    { nome: 'Morshabaal', tipo: 'Nemesis', previsao: { tipo: 'baixa' }, ultimoVisto: null, ontem: 0 },
    { nome: 'Tyrn', tipo: 'Nemesis', previsao: { tipo: 'pct', valor: 16.2 }, ultimoVisto: '2026-11-14', ontem: 1 },
    { nome: 'ARACHIR THE ANCIENT ONE', tipo: 'Nemesis', previsao: { tipo: 'nao', emDias: 1 }, ultimoVisto: '2026-11-21', ontem: 0 },
    { nome: 'Zushuka', tipo: 'Nemesis', previsao: { tipo: 'nao', emDias: null }, ultimoVisto: '2026-10-30', ontem: 0 },
  ],
});

test('ordem: maior chance hoje, depois «baixa», depois a janela que abre mais cedo, e sem leitura no fim', () => {
  const r = listaRaros(catalogo, { bosses: {}, pontosJogo: null, aplicadas: [] }, leitura, AGORA);
  assert.deepEqual(
    r.map((e) => e.boss.nome),
    ['Tyrn', "Gaz'haragoth", 'Morshabaal', 'Arachir the Ancient One', 'Dharalion', 'Zushuka', 'Sem Leitura'],
  );
});

test('cada entrada traz a previsão, o último dia visto, há quantos dias e as kills', () => {
  const est: EstadoPersonagem = { bosses: { tyrn: { kills: 2, ultimaKill: null, acesso: null } }, pontosJogo: null, aplicadas: [] };
  const [tyrn] = listaRaros(catalogo, est, leitura, AGORA);
  assert.deepEqual(tyrn.previsao, { tipo: 'pct', valor: 16.2 });
  assert.equal(tyrn.ultimoVisto, '2026-11-14');
  assert.equal(tyrn.diasDesde, 8);
  assert.equal(tyrn.ontem, 1);
  assert.equal(tyrn.estado.kills, 2);
  const sem = listaRaros(catalogo, est, null, AGORA);
  assert.equal(sem.length, 7);
  assert.ok(sem.every((e) => e.previsao === null));
});

test('limparLeitura: lixo dá null; linhas estragadas saem', () => {
  assert.equal(limparLeitura(null), null);
  assert.equal(limparLeitura({ bosses: 'x' }), null);
  const l = limparLeitura({ lidoEm: '2026-11-22T10:10:00Z', fonte: 'f', bosses: [{ nome: 'A', previsao: { tipo: 'pct', valor: 'x' } }, { nome: 'B', previsao: { tipo: 'baixa' } }] });
  assert.deepEqual(l?.bosses.map((b) => b.nome), ['B']);
});

test('a leitura fica velha ao fim de 36 h', () => {
  assert.ok(leitura);
  assert.equal(leituraVelha(leitura, AGORA), false);
  assert.equal(leituraVelha(leitura, Date.parse('2026-11-24T00:00:00Z')), true);
});
