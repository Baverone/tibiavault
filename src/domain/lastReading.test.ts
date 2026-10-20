// A nota «última leitura a DD/MM» da página do boneco, com dados antigos,
// ausentes e estragados. Os ficheiros reais só entram como CÓPIAS numa pasta
// temporária: o teste nunca lê nem escreve o `data/` do repositório.
import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lastReadingNote, summarizeCharacter } from './homeSummary.ts';
import { scrapedRecordsToHistory } from './scrapedHistory.ts';

const DADOS = fileURLToPath(new URL('../../data/scraped-history/', import.meta.url));
const AGORA = new Date('2026-10-20T13:00:00Z').getTime();

/** Copia os históricos para uma pasta temporária e devolve-a, mais a limpeza. */
function copias(): { pasta: string; limpar: () => void } {
  const pasta = mkdtempSync(join(tmpdir(), 'tibiavault-leitura-'));
  for (const nome of ['royal-paladin.json', 'exalted-monk.json']) copyFileSync(join(DADOS, nome), join(pasta, nome));
  return { pasta, limpar: () => rmSync(pasta, { recursive: true, force: true }) };
}

function lerCopia(pasta: string, nome: string) {
  return scrapedRecordsToHistory(JSON.parse(readFileSync(join(pasta, nome), 'utf8')));
}

test('sem leituras diz «sem leituras», sem data nem hora inventadas', () => {
  assert.equal(lastReadingNote([], AGORA), 'sem leituras');
  assert.deepEqual(scrapedRecordsToHistory([]), []);
  assert.deepEqual(scrapedRecordsToHistory(null), []);
  assert.deepEqual(scrapedRecordsToHistory({ erro: 'não é uma lista' }), []);
});

test('uma leitura só já dá a data (antes a nota ficava em branco)', () => {
  const historia = scrapedRecordsToHistory([
    { date: '2026-10-19', level: 650, experience: 4_500_000_000, scrapedAt: '2026-10-20T09:00:00.000Z' },
  ]);
  assert.equal(lastReadingNote(historia, AGORA), 'última leitura a 19/10 (há 1 dia)');
});

test('a nota leva só o dia e o mês, nunca uma hora', () => {
  const historia = scrapedRecordsToHistory([
    { date: '2026-10-20', level: 650, experience: 4_500_000_000, scrapedAt: '2026-10-20T23:59:00.000Z' },
  ]);
  const nota = lastReadingNote(historia, AGORA);
  assert.equal(nota, 'última leitura a 20/10 (hoje)');
  assert.doesNotMatch(nota, /\d{1,2}:\d{2}|\d{1,2}h/);
});

test('a idade conta dias de calendário, não o meio-dia UTC inventado', () => {
  const historia = scrapedRecordsToHistory([
    { date: '2026-10-19', level: 650, experience: 4_500_000_000, scrapedAt: '2026-10-20T08:00:00.000Z' },
  ]);
  // Antes do meio-dia UTC dava «hoje»: só tinham passado 21 h desde o timestamp.
  assert.equal(lastReadingNote(historia, new Date('2026-10-20T09:00:00Z').getTime()), 'última leitura a 19/10 (há 1 dia)');
  assert.equal(lastReadingNote(historia, new Date('2026-10-20T15:00:00Z').getTime()), 'última leitura a 19/10 (há 1 dia)');
  // No próprio dia, de manhã cedo e já de noite, é sempre «hoje».
  assert.equal(lastReadingNote(historia, new Date('2026-10-19T00:30:00Z').getTime()), 'última leitura a 19/10 (hoje)');
  assert.equal(lastReadingNote(historia, new Date('2026-10-19T22:30:00Z').getTime()), 'última leitura a 19/10 (hoje)');
  // O dia vira à meia-noite de Lisboa (23:00 UTC em horário de verão), como no check-history-freshness.
  assert.equal(lastReadingNote(historia, new Date('2026-10-19T23:30:00Z').getTime()), 'última leitura a 19/10 (há 1 dia)');
  assert.equal(summarizeCharacter(historia, new Date('2026-10-20T09:00:00Z').getTime()).daysSinceLastReading, 1);
});

test('linhas sem data ou sem XP não contam como leitura e não rebentam a data', () => {
  const historia = scrapedRecordsToHistory([
    { date: '2026-10-10', level: 600, experience: 3_500_000_000, scrapedAt: '2026-10-11T09:00:00.000Z' },
    { level: 600, experience: 3_600_000_000, scrapedAt: '2026-10-12T09:00:00.000Z' },
    { date: '2026-10-12', level: 600, scrapedAt: '2026-10-13T09:00:00.000Z' },
    { date: 'lixo', level: 600, experience: 3_700_000_000, scrapedAt: '2026-10-14T09:00:00.000Z' },
    null,
  ]);
  assert.equal(historia.length, 1);
  assert.equal(lastReadingNote(historia, AGORA), 'última leitura a 10/10 (há 10 dias)');
  // Mesmo que um NaN chegue à nota por outro caminho, conta a última leitura com data.
  assert.equal(lastReadingNote([...historia, { timestamp: Number.NaN, experience: 1 }], AGORA), 'última leitura a 10/10 (há 10 dias)');
  assert.equal(lastReadingNote([{ timestamp: Number.NaN, experience: 1 }], AGORA), 'sem leituras');
});

test('dados antigos: a cópia do histórico do Bluey dá a data da última linha', () => {
  const { pasta, limpar } = copias();
  try {
    const historia = lerCopia(pasta, 'exalted-monk.json');
    const brutas = JSON.parse(readFileSync(join(pasta, 'exalted-monk.json'), 'utf8')) as Array<{ date: string }>;
    assert.equal(historia.length, brutas.length);
    // O relógio sai da última data copiada, não de um dia fixo: o scraper vai
    // acrescentando linhas e o teste não pode envelhecer com o ficheiro.
    const ultimaData = brutas.at(-1)!.date;
    const [, mes, dia] = ultimaData.split('-');
    const tresDiasDepois = new Date(`${ultimaData}T09:00:00Z`).getTime() + 3 * 24 * 60 * 60 * 1000;
    assert.equal(lastReadingNote(historia, tresDiasDepois), `última leitura a ${dia}/${mes} (há 3 dias)`);
  } finally {
    limpar();
  }
});

test('ausentes: a cópia esvaziada ou estragada dá «sem leituras», o original fica intacto', () => {
  const original = readFileSync(join(DADOS, 'royal-paladin.json'), 'utf8');
  const { pasta, limpar } = copias();
  try {
    writeFileSync(join(pasta, 'royal-paladin.json'), '[]');
    assert.equal(lastReadingNote(lerCopia(pasta, 'royal-paladin.json'), AGORA), 'sem leituras');
    writeFileSync(join(pasta, 'royal-paladin.json'), JSON.stringify([{ level: 1 }, { scrapedAt: 'x' }]));
    assert.equal(lastReadingNote(lerCopia(pasta, 'royal-paladin.json'), AGORA), 'sem leituras');
  } finally {
    limpar();
  }
  assert.equal(readFileSync(join(DADOS, 'royal-paladin.json'), 'utf8'), original);
});
