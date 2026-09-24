// A GRELHA DOS ATALHOS do Início (24/09/2026).
//
// «Onde vais mais vezes» tinha seis atalhos numa grelha `auto-fit` com um
// mínimo de 190 px: nos 1200 px de conteúdo cabiam CINCO por linha e saíam
// 5 + 1 — o «Rashid e Tibiadrome» sozinho na segunda linha, esticado a toda a
// largura. Com colunas fixas o número de atalhos por linha é uma decisão e não
// um resto de divisão.
//
// Isto lê o CSS como texto (não há browser aqui) e por isso só serve para o
// que é uma DECISÃO escrita numa regra: quantas colunas, e se os cartões
// esticam. Quem mede píxeis é o Chrome, à mão.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ATALHOS_INICIO } from '../navigation/pages.ts';
import { PLAYERS } from '../constants/players.ts';

const CSS = readFileSync(new URL('./shell.css', import.meta.url), 'utf8');

/** O corpo da primeira regra `<seletor> {...}` a partir de `desde`. */
function regra(seletor: string, desde = 0): string {
  const abre = CSS.indexOf(`${seletor} {`, desde);
  assert.notEqual(abre, -1, `não há regra para \`${seletor}\``);
  const fecha = CSS.indexOf('}', abre);
  return CSS.slice(abre, fecha);
}

const MOVEL = CSS.indexOf('@media (max-width: 899px)');

test('os atalhos do Início são três colunas em ecrã grande', () => {
  const corpo = regra('.atalhos');
  assert.match(corpo, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(corpo, /auto-fit/, 'auto-fit deixa o número de colunas ao acaso');
});

test('e duas colunas no telemóvel', () => {
  assert.notEqual(MOVEL, -1, 'desapareceu o @media do telemóvel');
  assert.match(regra('.atalhos', MOVEL), /repeat\(2, minmax\(0, 1fr\)\)/);
});

test('os atalhos da mesma linha ficam com a mesma altura', () => {
  assert.match(regra('.atalhos'), /align-items:\s*stretch/);
});

test('há seis atalhos — três colunas dão 3 × 2, sem sobras', () => {
  const quantos = PLAYERS.length + ATALHOS_INICIO.length;
  assert.equal(
    quantos % 3,
    0,
    `são ${quantos} atalhos: numa grelha de 3 colunas a última linha fica com um buraco`,
  );
});
