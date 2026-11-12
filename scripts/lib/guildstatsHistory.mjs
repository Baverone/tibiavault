// Lógica partilhada de scraping do guildstats.eu + merge do histórico.
//
// Nasceu partilhada porque havia dois scrapers (os bonecos principais e os
// jogadores da aba "Equipa") byte a byte iguais tirando a lista de jogadores e
// a pasta de saída. A aba Equipa saiu na limpeza de setembro de 2026.
//
// Desde 16/10/2026 o scrape-experience.mjs já não chama o `runScraper`: o
// tab.php está atrás do Cloudflare e a recolha passou para os highscores
// (tibiaDataHighscores.mjs), que usa daqui a fórmula e o load/save do
// histórico. O Bluey voltou a ser recolhido a 21/10/2026, mas pela página de
// personagem (guildstatsCharacter.mjs), não por aqui. O parser do tab.php fica
// para o dia em que o histórico deixar de estar atrás do Cloudflare.
//
// Endpoint discovered by inspecting guildstats.eu's own front-end JS: the
// character page loads its "Experience" tab via this internal AJAX route,
// which returns a small self-contained HTML fragment (no JS execution
// needed to read it).
import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import * as cheerio from 'cheerio';

// Same formula as src/domain/experienceTable.ts — duplicated here so these
// scripts stay standalone Node files with no build step. Keep in sync.
export function experienceForLevel(level) {
  return Math.round((50 / 3) * (level ** 3 - 6 * level ** 2 + 17 * level - 12));
}

// Teto da pesquisa, o mesmo de MAX_SEARCH_LEVEL na app. Sem ele, uma XP enorme
// (1e60) levava `high` acima de 2^53, onde `high *= 2` deixa de mudar e o ciclo
// nunca acaba (a app foi corrigida a 08/11/2026; aqui ficou por corrigir ate a
// auditoria de 11/11/2026).
export const MAX_SEARCH_LEVEL = 2 ** 26;

export function levelForExperience(experience) {
  if (!Number.isFinite(experience) || experience < 0) {
    throw new Error(`XP invalida: ${experience}`);
  }
  let low = 1;
  let high = 1;
  while (experienceForLevel(high) <= experience) {
    if (high >= MAX_SEARCH_LEVEL) return MAX_SEARCH_LEVEL;
    high *= 2;
  }
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

/**
 * O histórico gravado. Só um ficheiro que NÃO EXISTE conta como vazio.
 *
 * 25/10/2026 (revisão): um ficheiro que não se lia (marcas de conflito do git,
 * uma escrita cortada a meio) também dava `[]`, e quem o chamava acrescentava
 * a linha de hoje e gravava — meses de XP trocados por uma linha, e o alarme
 * de frescura a dizer «ok» porque a linha mais recente era de hoje. Agora
 * rebenta com o caminho: a corrida desse boneco falha e ninguém grava nada.
 */
export function loadExistingHistory(dataDir, id) {
  const path = historyPath(dataDir, id);
  if (!existsSync(path)) return [];
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf-8'));
  } catch (error) {
    throw new Error(`${path} não é JSON válido (${error.message}) — não gravo por cima; corrige o ficheiro`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${path} não é uma lista de leituras — não gravo por cima; corrige o ficheiro`);
  }
  return parsed;
}

/** Espera sem largar o processo (as recolhas são scripts curtos, sem nada mais a correr). */
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Erros do Windows que passam sozinhos: um antivírus, o indexador ou o git com
// o ficheiro aberto por instantes.
const BUSY_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);

/**
 * Escreve `content` em `path` de uma vez: primeiro num ficheiro temporário ao
 * lado, forçado para o disco, e só depois troca um pelo outro.
 *
 * 12/11/2026 (proposta 3 da auditoria, do Codex, aprovada pelo André): o
 * `writeFileSync` direto escrevia por cima do histórico. Um corte de luz ou um
 * processo morto a meio deixava um JSON cortado, e daí em diante a recolha
 * desse boneco falhava (o loadExistingHistory recusa-o, de propósito) até
 * alguém o reparar à mão. Com a troca, quem lê vê o ficheiro antigo inteiro ou
 * o novo inteiro, nunca um meio.
 */
export function writeFileAtomic(path, content, { renameImpl = renameSync, writeImpl = writeFileSync } = {}) {
  const tmp = `${path}.${process.pid}.tmp`;
  // Qualquer falha (abrir, escrever, forçar para o disco, trocar) tira o
  // temporário: o ficheiro antigo fica como estava e não sobra lixo.
  try {
    const fd = openSync(tmp, 'w');
    try {
      writeImpl(fd, content);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    for (let attempt = 1; ; attempt++) {
      try {
        renameImpl(tmp, path);
        return;
      } catch (error) {
        if (attempt >= 5 || !BUSY_CODES.has(error.code)) throw error;
        sleepSync(100 * attempt);
      }
    }
  } catch (error) {
    rmSync(tmp, { force: true });
    throw error;
  }
}

export function saveHistory(dataDir, id, history) {
  mkdirSync(dataDir, { recursive: true });
  writeFileAtomic(historyPath(dataDir, id), `${JSON.stringify(history, null, 2)}\n`);
}

/** Um trinco esquecido por um processo morto deixa de contar ao fim disto. */
export const LOCK_STALE_MS = 10 * 60_000;

/** Cria `path` só se não existir, com `content`; devolve false se já existir. */
function createExclusive(path, content) {
  let fd;
  try {
    fd = openSync(path, 'wx');
  } catch (error) {
    if (error.code === 'EEXIST') return false;
    throw error;
  }
  try {
    writeFileSync(fd, content);
  } finally {
    closeSync(fd);
  }
  return true;
}

function ageOf(path) {
  try {
    return Date.now() - statSync(path).mtimeMs;
  } catch {
    return null; // já não existe
  }
}

function readOrNull(path) {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Tira um trinco esquecido sem nunca tocar no de outro. Devolve true se tirou.
 * Exportada só para os testes.
 *
 * Três rondas de revisão do Codex (12/11/2026). «Está velho → apaga» deixava
 * A e B verem o mesmo trinco velho; A apagava-o e criava o seu, e B apagava o
 * de A. Um segundo trinco de recuperação tinha o mesmo problema um nível
 * acima, e tirar o trinco do lugar para o conferir deixava-o livre (ou
 * abandonado) se a devolução corresse mal.
 *
 * Agora o trinco nunca sai do lugar enquanto se confere. Quem recupera cria
 * primeiro uma segunda ligação (hard link) para o ficheiro que lá está,
 * `<id>.json.lock.recuperar`, em modo exclusivo: só um processo de cada vez
 * pode estar a recuperar. Pela ligação lê o conteúdo desse mesmo ficheiro. Se
 * for o trinco velho que viu (as marcas são únicas), continuar velho e o
 * processo dono (o pid da marca) já não existir, apaga-o; se não, não toca em
 * nada. Enquanto a ligação existe, o trinco não pode
 * mudar: o dono do velho morreu, nenhum outro pode recuperar, e ninguém cria
 * um trinco novo enquanto o nome está ocupado.
 *
 * Se um processo morrer nos microssegundos em que tem a ligação, ela fica e a
 * recuperação deixa de ser possível. As recolhas passam a falhar como
 * temporárias, com a mensagem a apontar o ficheiro, e o alarme de frescura
 * fica vermelho. Prefere-se isso a um caminho automático que possa deixar
 * entrar dois escritores.
 */
export function recoverStaleLock(lockPath, seenContent, staleMs = LOCK_STALE_MS, { isAlive = processIsAlive } = {}) {
  // 4.ª ronda do Codex: velho não prova morto (um processo suspenso retoma e
  // grava por cima). Só se tira o trinco de um dono que já não existe; sem
  // forma de o confirmar, fica.
  const ownerPid = pidIn(seenContent);
  if (ownerPid === null || isAlive(ownerPid)) return false;
  const claim = `${lockPath}.recuperar`;
  const fail = (what, error) =>
    Object.assign(new Error(`não consegui ${what} (${error.message}) — tentar mais tarde`), { transient: true });
  try {
    linkSync(lockPath, claim);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EEXIST') return false; // saiu entretanto / outro está a recuperar
    throw fail(`prender o trinco ${lockPath}`, error);
  }
  let removed = false;
  let failure = null;
  try {
    const age = ageOf(claim);
    if (readOrNull(claim) === seenContent && age !== null && age > staleMs) {
      rmSync(lockPath, { force: true });
      removed = true;
    }
  } catch (error) {
    failure = fail(`tirar o trinco esquecido ${lockPath}`, error);
  }
  try {
    rmSync(claim, { force: true });
  } catch (error) {
    failure ??= fail(`tirar ${claim}`, error); // o primeiro erro é o que conta
  }
  if (failure) throw failure;
  return removed;
}

/** O pid gravado na marca de um trinco, ou null se não tiver um. */
function pidIn(content) {
  try {
    const pid = JSON.parse(content)?.pid;
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

/** Se o processo existe. ESRCH = não existe; EPERM = existe (de outro utilizador). */
export function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== 'ESRCH';
  }
}

/**
 * Corre `fn` com o histórico do boneco trancado: ninguém mais lê-junta-grava
 * esse ficheiro ao mesmo tempo.
 *
 * 12/11/2026 (proposta 3, com a escrita atómica): o histórico tem dois
 * escritores no PC, a tarefa tibia-xp (highscores) e a tibia-xp-chrome
 * (junta.mjs do ai-pc). Se um corresse por cima do outro, os dois liam o mesmo
 * ficheiro, cada um juntava o seu dia e o segundo a gravar apagava o dia do
 * primeiro. O trinco é um ficheiro `<id>.json.lock` criado em modo exclusivo,
 * com uma marca única de quem o tem: quem chega depois espera até `waitMs` e,
 * se não abrir, falha como temporário (a próxima corrida tenta outra vez). Um
 * trinco com mais de `staleMs` é de um processo que morreu e é retirado (ver
 * recoverStaleLock). No fim, cada um só tira o trinco se ainda tiver a sua marca.
 */
export function withHistoryLock(dataDir, id, fn, { waitMs = 30_000, staleMs = LOCK_STALE_MS, pollMs = 200 } = {}) {
  mkdirSync(dataDir, { recursive: true });
  const lockPath = `${historyPath(dataDir, id)}.lock`;
  const token = JSON.stringify({ pid: process.pid, at: new Date().toISOString(), n: Math.random() });
  const deadline = Date.now() + waitMs;
  while (!createExclusive(lockPath, token)) {
    const seen = readOrNull(lockPath);
    const age = ageOf(lockPath);
    // Só volta logo ao início se tirou mesmo um trinco velho; senão conta o
    // prazo e espera, como qualquer outra volta.
    if (seen !== null && age !== null && age > staleMs && recoverStaleLock(lockPath, seen, staleMs)) continue;
    if (Date.now() >= deadline) {
      const stuck = existsSync(`${lockPath}.recuperar`)
        ? ` Há uma recuperação presa em ${lockPath}.recuperar (processo morto?): se nenhuma recolha estiver a correr, apaga esse ficheiro e o .lock.`
        : '';
      throw Object.assign(
        new Error(`o histórico de ${id} está trancado por outra recolha (${lockPath}) — tentar mais tarde.${stuck}`),
        { transient: true }
      );
    }
    sleepSync(pollMs);
  }
  try {
    return fn();
  } finally {
    if (readOrNull(lockPath) === token) rmSync(lockPath, { force: true });
  }
}

/**
 * Lê, deixa `change` decidir, e grava — tudo dentro do trinco. `change` recebe
 * o histórico e devolve o novo (que é gravado) ou `null` (nada a gravar).
 * Devolve o que `change` devolveu.
 */
export function updateHistory(dataDir, id, change) {
  return withHistoryLock(dataDir, id, () => {
    const next = change(loadExistingHistory(dataDir, id));
    if (next) saveHistory(dataDir, id, next);
    return next;
  });
}

/**
 * Junta ao histórico todas as linhas da fonte cuja data ainda lá não está —
 * as do fim e as dos BURACOS no meio (T2 da auditoria de 20/10/2026: o
 * Baverone ficou sem o 14/10). O que já está guardado nunca é sobrescrito.
 * Pura: não mexe nos arrays que recebe.
 */
export function mergeRows(history, rows, scrapedAt) {
  const knownDates = new Set(history.map((entry) => entry.date));
  // 11/11/2026 (auditoria): duas linhas novas com a mesma data entravam as
  // duas. Iguais, fica uma; com XP diferente nao ha como saber qual e a certa,
  // e gravar uma delas a sorte e pior do que falhar.
  const byDate = new Map();
  for (const row of rows) {
    const seen = byDate.get(row.date);
    if (!seen) byDate.set(row.date, row);
    else if (seen.experience !== row.experience || seen.level !== row.level) {
      throw new Error(`a fonte trouxe ${row.date} duas vezes com valores diferentes (${seen.experience} e ${row.experience}) - nao gravo nenhuma`);
    }
  }
  const added = [...byDate.values()]
    .filter((row) => !knownDates.has(row.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => ({ ...row, scrapedAt }));
  const merged = [...history, ...added].sort((a, b) => a.date.localeCompare(b.date));
  return { history: merged, added };
}

/**
 * Os dias que faltam entre o primeiro e o último do histórico. É o que o
 * alarme de frescura mostra: um buraco no meio não atrasa o «último dia» e,
 * sem isto, ficava calado.
 */
/** Uma data AAAA-MM-DD que existe no calendário ("2026-02-30" e "2026-13-01" não). */
export function isRealDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function missingDates(history) {
  // 12/11/2026: só datas reais. Uma linha com `date: "x"` ficava em último na
  // ordenação, e o ciclo de baixo andava dia a dia até ao ano 10000 à procura
  // dela (o alarme de frescura levava mais de um minuto e rebentava no fim).
  const dates = new Set(history.map((entry) => entry?.date).filter(isRealDate));
  const sorted = [...dates].sort();
  const out = [];
  if (sorted.length < 2) return out;
  const day = new Date(`${sorted[0]}T00:00:00Z`);
  const last = sorted[sorted.length - 1];
  for (;;) {
    day.setUTCDate(day.getUTCDate() + 1);
    const key = day.toISOString().slice(0, 10);
    if (key >= last) break;
    if (!dates.has(key)) out.push(key);
  }
  return out;
}

/**
 * Scrapes one player and appends every day guildstats knows about that isn't
 * already in their history file. Existing entries are never overwritten —
 * the stored date wins — so re-running is always a safe no-op once caught up.
 */
async function syncPlayer({ id, nick, dataDir }) {
  const rows = await fetchExperienceRows(nick);
  const { history, added: missing } = mergeRows(loadExistingHistory(dataDir, id), rows, new Date().toISOString());

  if (missing.length === 0) {
    console.log(`[${id}] já está em dia (mais recente disponível: ${rows[0].date}) — nada a fazer.`);
    return 0;
  }

  for (const row of missing) {
    const expectedLevel = levelForExperience(row.experience);
    if (expectedLevel !== row.level) {
      console.warn(
        `[${id}] aviso: nível reportado pelo guildstats (${row.level}) difere do calculado pela fórmula (${expectedLevel}) para ${row.experience} XP.`
      );
    }
  }

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
