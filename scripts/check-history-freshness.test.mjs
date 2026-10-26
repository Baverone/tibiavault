// O alarme de frescura corrido de ponta a ponta, numa CÓPIA dos scripts com
// uma pasta de dados temporária — nunca o data/ verdadeiro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function lisbonToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date());
}

/** Corre o alarme com estes ficheiros em data/scraped-history/. */
function runAlarm(files) {
  const dir = mkdtempSync(join(tmpdir(), 'tibia-frescura-'));
  mkdirSync(join(dir, 'scripts', 'lib'), { recursive: true });
  for (const file of ['check-history-freshness.mjs', 'lib/trackedPlayers.mjs', 'lib/guildstatsHistory.mjs']) {
    copyFileSync(join(ROOT, 'scripts', file), join(dir, 'scripts', file));
  }
  // O guildstatsHistory.mjs importa o cheerio.
  symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'), 'junction');
  const dataDir = join(dir, 'data', 'scraped-history');
  mkdirSync(dataDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dataDir, name), content);
  try {
    return spawnSync(process.execPath, [join(dir, 'scripts', 'check-history-freshness.mjs')], { encoding: 'utf-8' });
  } finally {
    // A junção sai primeiro, sozinha: um rm recursivo nunca chega a passar por ela.
    unlinkSync(join(dir, 'node_modules'));
    rmSync(dir, { recursive: true, force: true });
  }
}

// 26/10/2026 (ronda): desde 25/10 o loadExistingHistory rebenta com um ficheiro
// estragado, e o ciclo dos buracos não o apanhava — o alarme morria com um
// stack trace antes de dizer quem estava ATRASADO e porquê.
test('um historico estragado sai vermelho com ATRASADO e o motivo, sem stack trace', () => {
  const today = lisbonToday();
  const result = runAlarm({
    'royal-paladin.json': '<<<<<<< HEAD\n[]\n=======\n[]\n>>>>>>> outro\n',
    'exalted-monk.json': JSON.stringify([{ date: today, level: 1, experience: 0 }]),
  });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /ATRASADO {2}\[bonecos\] royal-paladin/);
  assert.match(result.stderr, /royal-paladin\.json não é JSON válido/);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
  assert.match(result.stdout, /ok {3}\[bonecos\] exalted-monk/);
});

test('historicos em dia saem 0 e os buracos continuam a ser ditos', () => {
  const today = lisbonToday();
  const result = runAlarm({
    'royal-paladin.json': JSON.stringify([
      { date: '2026-10-01', level: 1, experience: 0 },
      { date: '2026-10-03', level: 1, experience: 0 },
      { date: today, level: 1, experience: 0 },
    ]),
    'exalted-monk.json': JSON.stringify([{ date: today, level: 1, experience: 0 }]),
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /BURACO {2}royal-paladin: falta\(m\) 2026-10-02/);
});
