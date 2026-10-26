// Guarda-costas do histórico de XP.
//
// A recolha ficou dez dias parada (2026-08-21 a 08-31) sem ninguém dar por
// isso, porque o workflow ficava verde à mesma: o guildstats.eu passou a
// responder 403 a todos os IPs dos runners do GitHub, o scraper tratava isso
// como falha transitória e saía com código 0. Verde todos os dias, zero dados.
//
// A lição não é "tratar 403 como erro" — é que a única pergunta que interessa
// não é "o pedido correu bem?" mas "os dados estão atrasados?". É isso que
// este script mede, e é ele que faz o workflow ficar VERMELHO (o único sinal
// que chega ao mail) quando o histórico está mesmo a ficar para trás,
// venha ele da Action ou do PC.
//
// Uso: node scripts/check-history-freshness.mjs [--max-idade-dias N]
import { readFileSync } from 'fs';
import { join } from 'path';
import { CHARACTERS, DATA_DIR } from './lib/trackedPlayers.mjs';
import { loadExistingHistory, missingDates } from './lib/guildstatsHistory.mjs';

// Duas margens de folga: o guildstats só publica o dia anterior por volta das
// 10:50 UTC (por isso "ontem" é o normal, não um atraso), e um dia perdido é
// recuperado sozinho na recolha seguinte porque o guildstats serve ~30 dias.
// Só a partir do terceiro dia é que há mesmo alguma coisa partida.
// É o mesmo limiar do aviso da app (`isStaleReading` em
// src/domain/homeSummary.ts, desde 22/10/2026): com mais de 3 dias, não com 3.
//
// O valor passado é validado: `--max-idade-dias` sem número (ou com lixo) dava
// NaN, e como toda a comparação com NaN é falsa nenhum ficheiro contava como
// atrasado — o alarme saía 0 a dizer "mais de NaN dia(s)". Um guarda-costas
// que se cala por causa de um argumento mal escrito é exatamente o modo de
// falha que este ficheiro existe para impedir.
const argIndex = process.argv.indexOf('--max-idade-dias');
const MAX_AGE_DAYS = argIndex !== -1 ? Number(process.argv[argIndex + 1]) : 3;

if (!Number.isFinite(MAX_AGE_DAYS) || MAX_AGE_DAYS < 0) {
  console.error(
    `--max-idade-dias precisa de um número >= 0 (recebi ${JSON.stringify(process.argv[argIndex + 1] ?? null)}).`
  );
  process.exit(2);
}

function lisbonToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date());
}

function daysBetween(fromIsoDate, toIsoDate) {
  const from = Date.parse(`${fromIsoDate}T00:00:00Z`);
  const to = Date.parse(`${toIsoDate}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

function newestDateIn(file) {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf-8'));
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    // Os ficheiros são gravados ordenados, mas não custa não confiar nisso.
    return parsed.reduce((newest, entry) => (entry?.date > newest ? entry.date : newest), '');
  } catch {
    return null;
  }
}

const today = lisbonToday();
const stale = [];
const ok = [];
const waiting = [];

// Percorre a lista de rastreados, e não a pasta: um ficheiro que lá tenha
// ficado de um boneco que já não se segue não é um alarme.
{
  const label = 'bonecos';
  for (const { id, waiting: reason } of CHARACTERS) {
    const newest = newestDateIn(join(DATA_DIR, `${id}.json`));
    // Sem fonte de recolha (limitação conhecida e aceite): não é um atraso
    // por que valha a pena acordar alguém, mas é dito sempre.
    if (reason) {
      waiting.push({ id, label, newest: newest ?? '(vazio/ilegível)', reason });
      continue;
    }
    if (!newest) {
      stale.push({ id, label, newest: '(vazio/ilegível)', age: Infinity });
      continue;
    }
    const age = daysBetween(newest, today);
    (age > MAX_AGE_DAYS ? stale : ok).push({ id, label, newest, age });
  }
}

for (const entry of ok) {
  console.log(`  ok   [${entry.label}] ${entry.id}: último dia ${entry.newest} (há ${entry.age} dia(s)).`);
}
for (const entry of waiting) {
  console.log(`  À ESPERA  [${entry.label}] ${entry.id}: último dia ${entry.newest} — NÃO recolhido: ${entry.reason}`);
}
// 20/10/2026 (T2 da auditoria): o 14/10 do Baverone faltava e ninguém o
// disse, porque um buraco no meio não atrasa o último dia. Não pinta de
// vermelho — os highscores só dão o dia corrente e não há como o recuperar —
// mas fica escrito em cada corrida.
//
// 26/10/2026: desde 25/10 o loadExistingHistory rebenta com um ficheiro
// estragado (marcas de conflito, escrita cortada). Sem o `try`, o alarme
// morria aqui com um stack trace, antes de dizer quem estava ATRASADO — o
// motivo passa a ir na linha desse boneco.
const unreadable = new Map();
for (const { id } of CHARACTERS) {
  let holes;
  try {
    holes = missingDates(loadExistingHistory(DATA_DIR, id));
  } catch (error) {
    unreadable.set(id, error.message);
    continue;
  }
  if (holes.length > 0) {
    console.log(`  BURACO  ${id}: falta(m) ${holes.join(', ')} — só se preenche se uma fonte tiver esse dia.`);
  }
}

if (stale.length === 0) {
  console.log(`\nHistórico em dia — nada com mais de ${MAX_AGE_DAYS} dia(s) de atraso (hoje em Lisboa: ${today}).`);
  process.exit(0);
}

console.error('');
for (const entry of stale) {
  console.error(
    `  ATRASADO  [${entry.label}] ${entry.id}: último dia ${entry.newest}` +
      (Number.isFinite(entry.age) ? ` (há ${entry.age} dia(s)).` : '.') +
      (unreadable.has(entry.id) ? `\n            ${unreadable.get(entry.id)}` : '')
  );
}
console.error(
  `\n${stale.length} ficheiro(s) com mais de ${MAX_AGE_DAYS} dia(s) de atraso (hoje em Lisboa: ${today}).\n` +
    'Baverone: a recolha do PC (tarefa tibia-xp do ai-pc) não está a correr, ou a API do TibiaData mudou/está em baixo —\n' +
    'correr node scripts/scrape-experience.mjs e ler as linhas "falhou".\n' +
    'Bluey: lido no Chrome do André pela tarefa tibia-xp-chrome do ai-pc (Chrome fechado, ou desafio do Cloudflare).'
);
process.exit(1);
