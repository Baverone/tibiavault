// A semana do Início na mudança de hora (fim do horário de verão a 25/10/2026).
// O fuso tem de ser o de Lisboa para o problema aparecer — no UTC todos os dias
// têm 24 h e o teste passava sem provar nada. O `node --test` corre cada
// ficheiro no seu processo, por isso mudar o TZ aqui não toca nos outros.
process.env.TZ = 'Europe/Lisbon';

import test from 'node:test';
import assert from 'node:assert/strict';
import { combineDailyGains, summarizeCharacter, WEEK_DAYS } from './homeSummary.ts';
import type { HistoryEntry } from './types.ts';

const DIA = 24 * 60 * 60 * 1000;

/** Uma leitura por dia ao meio-dia UTC (como o scrapedHistory.ts), com os ganhos dados. */
function historico(inicio: string, base: number, ganhos: number[]): HistoryEntry[] {
  const arranque = new Date(`${inicio}T12:00:00Z`).getTime();
  const entradas: HistoryEntry[] = [{ timestamp: arranque, experience: base, source: 'guildstats' }];
  let total = base;
  ganhos.forEach((ganho, indice) => {
    total += ganho;
    entradas.push({ timestamp: arranque + (indice + 1) * DIA, experience: total, source: 'guildstats' });
  });
  return entradas;
}

test('o fuso do teste é mesmo o de Lisboa (senão o resto não prova nada)', () => {
  // 24/10 em horário de verão (UTC+1), 26/10 já em horário de inverno (UTC+0).
  assert.equal(new Date('2026-10-24T12:00:00Z').getTimezoneOffset(), -60);
  assert.equal(new Date('2026-10-26T12:00:00Z').getTimezoneOffset(), 0);
});

test('a semana que atravessa 25/10 tem sete dias e não seis', () => {
  // Ganhos de 24/10 a 31/10: a semana ancorada a 31/10 é 25/10..31/10.
  const ganhos = [1, 2, 3, 4, 5, 6, 7, 8];
  const resumo = summarizeCharacter(historico('2026-10-23', 1_000_000, ganhos), Date.now());
  assert.equal(resumo.weekDays, WEEK_DAYS);
  assert.equal(resumo.weekGain, 2 + 3 + 4 + 5 + 6 + 7 + 8);
});

test('o gráfico do Início com 7 dias que atravessam 25/10 mostra os sete', () => {
  const pontos = combineDailyGains({ a: historico('2026-10-23', 1_000, [1, 2, 3, 4, 5, 6, 7, 8]) }, 7);
  assert.deepEqual(
    pontos.map((ponto) => ponto.gains.a),
    [2, 3, 4, 5, 6, 7, 8]
  );
});
