// A calculadora de hunt (Utilitarios -> Hunt) nao tinha testes -- e a que
// tinha o bug documentado no proprio ficheiro ("boosted" era o erro que a
// calculadora antiga fazia). Cobre a combinacao de bonus (soma + stamina
// verde a multiplicar por cima, conforme o TibiaWiki), a divisao por zero
// quando o ritmo e nulo, e os boosts a mais do que MAX_BOOSTS_POR_DIA.
//
// As importacoes deste ficheiro tinham de ganhar a extensao ".ts" explicita
// (experienceTable, types) para o node --test conseguir resolve-las em
// runtime -- sem isso este modulo nunca podia ser testado diretamente, o que
// explica por que nao tinha testes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularHunt, formatarHoras, multiplicador, type OpcoesHunt } from './huntPlanner.ts';

const NENHUMA: OpcoesHunt = { stamina: false, dobro: false };
const STAMINA: OpcoesHunt = { stamina: true, dobro: false };
const DOBRO: OpcoesHunt = { stamina: false, dobro: true };
const TUDO: OpcoesHunt = { stamina: true, dobro: true };

test('multiplicador: sem nada e 1x, boost sozinho e 1.5x', () => {
  assert.equal(multiplicador(NENHUMA, false), 1);
  assert.equal(multiplicador(NENHUMA, true), 1.5);
});

test('multiplicador: os bonus somam-se, e so a stamina verde multiplica por cima (exemplo do TibiaWiki)', () => {
  // 700 base, evento de dobro + XP Boost -> 700 * (1 + 1 + 0.5) = 1750
  assert.equal(700 * multiplicador(DOBRO, true), 1750);
  // o mesmo, com stamina verde -> 1750 * 1.5 = 2625, nao 700*(1+1+0.5+0.5)=2450
  assert.equal(700 * multiplicador(TUDO, true), 2625);
});

test('multiplicador: stamina verde sozinha e so 1.5x, sem boost nem dobro', () => {
  assert.equal(multiplicador(STAMINA, false), 1.5);
});

test('calcularHunt: usa primeiro as horas com boost, so depois as sem boost', () => {
  const r = calcularHunt(0, 10, 1000, 5, 2, NENHUMA);
  assert.equal(r.horasComBoost, 2);
  assert.equal(r.horasSemBoost, 3);
  assert.equal(r.xpDaSessao, 2 * 1500 + 3 * 1000);
});

test('calcularHunt: clampa os boosts usaveis a MAX_BOOSTS_POR_DIA (5) mesmo que se peca mais', () => {
  const r = calcularHunt(0, 10, 1000, 5, 100, NENHUMA);
  assert.equal(r.horasComBoost, 5);
  assert.equal(r.horasSemBoost, 0);
});

test('calcularHunt: alvo ja atingido tem xpEmFalta 0 e jaAtingido true', () => {
  const r = calcularHunt(1_000_000, 5, 1000, 1, 0, NENHUMA);
  assert.equal(r.jaAtingido, true);
  assert.equal(r.xpEmFalta, 0);
  assert.equal(r.chega, true);
  assert.equal(r.horasNecessarias, 0);
});

test('calcularHunt: xp/h zero nao divide por zero -- horasNecessarias fica null', () => {
  const r = calcularHunt(0, 10, 0, 5, 2, NENHUMA);
  assert.equal(r.horasNecessarias, null);
  assert.equal(r.chega, false);
});

test('calcularHunt: zero horas planeadas e uma sessao vazia, nao um erro', () => {
  const r = calcularHunt(0, 10, 1000, 0, 0, NENHUMA);
  assert.equal(r.xpDaSessao, 0);
  assert.equal(r.horasComBoost, 0);
  assert.equal(r.horasSemBoost, 0);
});

test('calcularHunt: horasNecessarias conta os boosts primeiro e so depois o ritmo sem boost', () => {
  // xpEmFalta = 9300; 2 boosts a 1500/h dao 3000; restam 6300 a 1000/h -> 6.3h + 2h = 8.3h
  const r = calcularHunt(0, 10, 1000, 5, 2, NENHUMA);
  assert.equal(r.horasNecessarias, 8.3);
});

test('formatarHoras: valores negativos ou nao-finitos mostram um traco em vez de um numero estranho', () => {
  assert.equal(formatarHoras(-1), '—');
  assert.equal(formatarHoras(NaN), '—');
  assert.equal(formatarHoras(Infinity), '—');
});

test('formatarHoras: 0 mostra minutos, nao "0h"', () => {
  assert.equal(formatarHoras(0), '0m');
  assert.equal(formatarHoras(3.5), '3h 30m');
});
