// Lógica partilhada de scraping do guildstats.eu + merge do histórico.
//
// Nasceu partilhada porque havia dois scrapers (os bonecos principais e os
// jogadores da aba "Equipa") byte a byte iguais tirando a lista de jogadores e
// a pasta de saída. A aba Equipa saiu na limpeza de setembro de 2026 e hoje só
// o scrape-experience.mjs chama isto — o `runScraper({ players, dataDir })`
// fica parametrizado à mesma, que é o que torna estas funções testáveis.
//
// Endpoint discovered by inspecting guildstats.eu's own front-end JS: the
// character page loads its "Experience" tab via this internal AJAX route,
// which returns a small self-contained HTML fragment (no JS execution
// needed to read it).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as cheerio from 'cheerio';

// Same formula as src/domain/experienceTable.ts — duplicated here so these
// scripts stay standalone Node files with no build step. Keep in sync.
export function experienceForLevel(level) {
  return Math.round((50 / 3) * (level ** 3 - 6 * level ** 2 + 17 * level - 12));
}

export function levelForExperience(experience) {
  let low = 1;
  let high = 1;
  while (experienceForLevel(high) <= experience) high *= 2;
  while (low < high) {
    const mid = low + Math.ceil((high - low) / 2);
    if (experienceForLevel(mid) <= experience) low = mid;
    else high = mid - 1;
  }
  return low;
}

/**
 * Only proceed once the Tibia server save (09:00 Lisbon) has happened today.
 * No upper bound — GitHub Actions "schedule" triggers can be delayed by
 * hours under load, and a narrow window (e.g. "only 9-10am") means a
 * delayed run silently misses the whole day. Safe to leave open-ended
 * because we only ever append dates we don't already have.
 */
export function isAfterLisbonServerSave() {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', hour: '2-digit', hour12: false }).format(new Date())
  );
  return hour >= 9;
}

// UA de browser desde 7a9bdb8 (agosto de 2026): o guildstats.eu recusava o
// UA por omissão do node. A 16/10/2026 testou-se trocar por um honesto
// ("TibiaVault/1.0 (+https://github.com/Baverone/tibiavault)") e não deu para
// decidir: desde 14/10 o tab.php está atrás de um challenge do Cloudflare e
// leva 403 com QUALQUER cabeçalho (sem UA, honesto, Chrome 124, Chrome 141).
// Fica este até o endpoint voltar a responder e se poder testar o honesto.
// O guildstatsHistory.test.mjs falha se o pedido sair sem User-Agent.
export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const REQUEST_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://guildstats.eu/',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Lê a tabela de experiência de um fragmento HTML do guildstats. Exportado
 * para poder ser testado sem rede (scripts/lib/guildstatsHistory.test.mjs) —
 * este parser já partiu uma vez, quando o guildstats redesenhou a página em
 * agosto de 2026, e é a única peça deste ficheiro que depende do layout deles.
 */
export function parseExperienceRows(html) {
  const $ = cheerio.load(html);
  const rows = $('table tbody tr');
  if (rows.length === 0) {
    throw new Error('nenhuma linha de histórico (o layout pode ter mudado)');
  }

  const parsed = [];
  rows.each((_, element) => {
    const cells = $(element).find('td');
    // The date and experience cells each hold two spans: the full value for
    // desktop and a short mobile abbreviation ("08-23", "26.5B"). Take the
    // first span (the full value) — calling .text() on the whole cell glues
    // the abbreviation on, which broke the date regex and turned experience
    // into NaN when guildstats redesigned the page (2026-08). Using
    // `.find('span')` instead of a `.md\:inline` class selector also keeps
    // this robust across cheerio versions (newer css-select rejects the
    // escaped `:` in that class name).
    const date = cells.eq(0).find('span').first().text().trim() || cells.eq(0).text().trim();
    // The level cell appends a "(+N)" level-up badge on days the character
    // leveled up (e.g. "1150 (+1)") — parseInt reads the leading number and
    // ignores that trailing text, where Number() would return NaN.
    const level = parseInt(cells.eq(3).text().trim(), 10);
    const experienceText = cells.eq(4).find('span').first().text().trim() || cells.eq(4).text().trim();
    // Number('') é 0, não NaN: uma célula de experiência vazia (coluna que
    // muda de sítio, linha de totais, layout novo) passava o teste do
    // Number.isFinite e entrava no histórico como um dia de 0 XP — que depois
    // nunca mais sai, porque o merge nunca sobrescreve o que já lá está.
    const experienceDigits = experienceText.replace(/,/g, '');
    const experience = Number(experienceDigits);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(level) ||
      experienceDigits === '' ||
      !Number.isFinite(experience)
    )
      return;
    parsed.push({ date, level, experience });
  });

  if (parsed.length === 0) {
    throw new Error('nenhuma linha parseável (o layout pode ter mudado)');
  }

  return parsed;
}

/**
 * O texto do erro é o que aparece no scrape-xp.log e no runner, por isso tem
 * de apontar para a causa certa. A mensagem antiga mandava procurar o IP do
 * GitHub Actions e fez perder tempo em outubro de 2026, quando o pedido saía
 * do PC e o problema era outro.
 */
export function httpErrorFor(response) {
  const { status } = response;
  let message = `HTTP ${status}`;
  let retry = true;
  if (status === 403 && response.headers.get('cf-mitigated') === 'challenge') {
    // Repetir não adianta: o challenge só se resolve num browser com JS.
    message =
      'HTTP 403 — challenge do Cloudflare (cf-mitigated: challenge): o guildstats exige um browser ' +
      'neste endpoint. Não é o IP nem o User-Agent — mudar cabeçalhos não resolve.';
    retry = false;
  } else if (status === 403) {
    message = 'HTTP 403 — o guildstats recusou o pedido, provavelmente por causa dos cabeçalhos (User-Agent).';
  }
  const httpError = new Error(message);
  httpError.status = status;
  httpError.retry = retry;
  // 403, 429 e 5xx são do lado do guildstats, não um bug do scraper; um 404
  // (nick errado) etc. fica não-transitório.
  httpError.transient = status === 403 || status === 429 || status >= 500;
  return httpError;
}

async function fetchAndParse(nick) {
  const encodedNick = encodeURIComponent(nick).replace(/%20/g, '+');
  const url = `https://guildstats.eu/include/character/tab.php?nick=${encodedNick}&tab=experience`;

  let response;
  try {
    response = await fetch(url, { headers: REQUEST_HEADERS });
  } catch (networkError) {
    // DNS/connection blips are transient — worth a retry / not a real bug.
    networkError.transient = true;
    throw networkError;
  }
  if (!response.ok) {
    throw httpErrorFor(response);
  }

  return parseExperienceRows(await response.text());
}

/**
 * Every experience row guildstats.eu exposes for this character (it serves
 * ~30 days, newest first), not just the latest one.
 *
 * Reading the whole table is what makes the scraper self-healing: any day
 * missed while the workflow was failing/paused gets backfilled on the next
 * successful run, as long as it's still inside guildstats' window. Reading
 * only the first row (the old behaviour) meant a missed day was lost forever.
 *
 * Retries a few times with a growing delay, because guildstats hands out
 * intermittent 403s to CI IPs — a later attempt almost always gets through.
 */
export async function fetchExperienceRows(nick, { attempts = 3, retryDelayMs = 4000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetchAndParse(nick);
    } catch (error) {
      lastError = error;
      if (error.retry === false) break;
      if (attempt < attempts) await sleep(retryDelayMs * attempt);
    }
  }
  const tried = lastError.retry === false ? '1 tentativa (sem repetir)' : `${attempts} tentativas`;
  const wrapped = new Error(`falhou após ${tried} para "${nick}": ${lastError.message}`);
  wrapped.transient = lastError.transient === true;
  throw wrapped;
}

function historyPath(dataDir, id) {
  return join(dataDir, `${id}.json`);
}

export function loadExistingHistory(dataDir, id) {
  const path = historyPath(dataDir, id);
  if (!existsSync(path)) return [];
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(dataDir, id, history) {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(historyPath(dataDir, id), `${JSON.stringify(history, null, 2)}\n`);
}

/**
 * Scrapes one player and appends every day guildstats knows about that isn't
 * already in their history file. Existing entries are never overwritten —
 * the stored date wins — so re-running is always a safe no-op once caught up.
 */
async function syncPlayer({ id, nick, dataDir }) {
  const rows = await fetchExperienceRows(nick);
  const history = loadExistingHistory(dataDir, id);
  const knownDates = new Set(history.map((entry) => entry.date));

  const missing = rows.filter((row) => !knownDates.has(row.date)).sort((a, b) => a.date.localeCompare(b.date));

  if (missing.length === 0) {
    console.log(`[${id}] já está em dia (mais recente disponível: ${rows[0].date}) — nada a fazer.`);
    return 0;
  }

  const scrapedAt = new Date().toISOString();
  for (const row of missing) {
    const expectedLevel = levelForExperience(row.experience);
    if (expectedLevel !== row.level) {
      console.warn(
        `[${id}] aviso: nível reportado pelo guildstats (${row.level}) difere do calculado pela fórmula (${expectedLevel}) para ${row.experience} XP.`
      );
    }
    history.push({ ...row, scrapedAt });
  }

  history.sort((a, b) => a.date.localeCompare(b.date));
  saveHistory(dataDir, id, history);

  // Report the range, not the last appended entry's level — when backfilling
  // old gaps the newest row isn't the one we just added, and saying "agora no
  // nível X" for a level from two weeks ago is actively misleading.
  const range = missing.length === 1 ? missing[0].date : `${missing[0].date} a ${missing[missing.length - 1].date}`;
  const latest = rows[0];
  console.log(
    `[${id}] guardado(s) ${missing.length} dia(s): ${range}. Mais recente disponível: ${latest.date} (nível ${latest.level}).`
  );
  return missing.length;
}

/**
 * Runs the scrape for a list of players. One player failing never blocks the
 * others.
 *
 * Exit codes matter here, because a silent green run is how this scraper went
 * unnoticed for ten days (2026-08-21 → 08-31): guildstats.eu started answering
 * *every* GitHub Actions runner IP with 403, all three retries burned, and the
 * old code deliberately logged a warning and exited 0. The workflow was green
 * every day while collecting nothing.
 *
 * So: any failure at all now exits non-zero. Deciding whether that matters is
 * not this script's job — check-history-freshness.mjs does it, by looking at
 * whether the data itself is actually falling behind, which is the only
 * question worth waking someone up for.
 */
export async function runScraper({ players, dataDir }) {
  if (!isAfterLisbonServerSave() && process.env.FORCE_SCRAPE !== 'true') {
    console.log('Ainda não passou o server save das 9h em Lisboa — a ignorar esta execução.');
    return;
  }

  let addedTotal = 0;
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    try {
      addedTotal += await syncPlayer({ ...player, dataDir });
      successCount++;
    } catch (error) {
      failureCount++;
      console.error(`[${player.id}] falhou: ${error.message}`);
    }
    // Space requests out so guildstats is less likely to 403 the next one.
    if (i < players.length - 1) await sleep(2000);
  }

  console.log(`\nResumo: ${successCount} jogador(es) ok, ${failureCount} falha(s), ${addedTotal} dia(s) novo(s) guardado(s).`);

  if (failureCount > 0) {
    if (successCount === 0) {
      console.error('Nenhum jogador foi recolhido — ver a causa nas linhas "falhou:" acima.');
    }
    process.exitCode = 1;
  }
}
