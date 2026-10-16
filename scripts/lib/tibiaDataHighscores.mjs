// Recolha da XP pelos highscores oficiais, servidos pela API do TibiaData.
//
// Existe porque o guildstats.eu pôs o tab.php atrás de um challenge do
// Cloudflare a 14/10/2026 e deixou de responder a qualquer pedido sem browser
// (ver httpErrorFor em guildstatsHistory.mjs). Os highscores do Celesta trazem,
// por personagem, o `value` — os pontos de experiência — e o `level`. Sem
// chave, sem browser.
//
// O limite é o tamanho da lista: 20 páginas de 50, o top 1000 do mundo. Quem
// estiver abaixo do corte não aparece, e por isso não é recolhido por aqui —
// ver `waiting` em trackedPlayers.mjs.
//
// Escreve exatamente o mesmo formato que o scraper do guildstats
// ({ date, level, experience, scrapedAt }), para a app não ter de mudar.
import {
  isAfterLisbonServerSave,
  levelForExperience,
  loadExistingHistory,
  saveHistory,
} from './guildstatsHistory.mjs';

export function highscoresUrl(world, page) {
  return `https://api.tibiadata.com/v4/highscores/${encodeURIComponent(world)}/experience/all/${page}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function lisbonParts(instant) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(instant);
  const get = (type) => parts.find((part) => part.type === type).value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24 };
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * O dia do Tibia a que um instante pertence: começa no server save das 09:00
 * de Lisboa, por isso às 08:59 de dia 16 ainda é dia 15. Mesma regra que
 * src/domain/tibiaDay.ts — duplicada para os scripts não precisarem de build.
 */
export function tibiaDayOf(instant) {
  const { date, hour } = lisbonParts(instant);
  return hour >= 9 ? date : addDays(date, -1);
}

/**
 * Data com que a leitura entra no histórico. A convenção é a do guildstats,
 * que é a de todo o histórico que já lá está: a linha do dia D é a XP no fim
 * do dia D, e só existe depois do server save de D+1 (a recolha de 14/10 às
 * 10h trouxe a linha de 13/10). Uma leitura feita hoje depois do save é,
 * portanto, a linha de ontem.
 */
export function historyDateFor(snapshotAt) {
  return addDays(tibiaDayOf(snapshotAt), -1);
}

/**
 * Uma página da API, com repetição. A API em baixo (rede, 429, 5xx, resposta
 * que não é JSON — o proxy deles devolve HTML quando cai) é temporária:
 * repete-se e, se não passar, o erro sai marcado `transient`. Nunca vira
 * "não há dados".
 */
export async function fetchHighscoresPage(world, page, { fetchImpl = fetch, attempts = 3, retryDelayMs = 4000 } = {}) {
  const url = highscoresUrl(world, page);
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      let response;
      try {
        response = await fetchImpl(url, { headers: { Accept: 'application/json' } });
      } catch (networkError) {
        throw Object.assign(new Error(`sem ligação (${networkError.message})`), { transient: true });
      }
      if (!response.ok) {
        const transient = response.status === 429 || response.status >= 500;
        throw Object.assign(new Error(`HTTP ${response.status}`), { transient });
      }
      try {
        return JSON.parse(await response.text());
      } catch {
        throw Object.assign(new Error('a resposta não é JSON'), { transient: true });
      }
    } catch (error) {
      lastError = error;
      if (!error.transient) break;
      if (attempt < attempts) await sleep(retryDelayMs * attempt);
    }
  }
  const tried = lastError.transient ? `${attempts} tentativas` : '1 tentativa';
  throw Object.assign(new Error(`API do TibiaData, página ${page} (${tried}): ${lastError.message}`), {
    transient: lastError.transient === true,
  });
}

function formatError(page, detail) {
  // Não é temporário: o mesmo pedido amanhã dá o mesmo resultado.
  return Object.assign(new Error(`formato inesperado na página ${page} da API do TibiaData: ${detail}`), {
    transient: false,
  });
}

/**
 * Percorre os highscores de experiência do mundo até encontrar `name`, e pára
 * aí. Não aparecer em nenhuma página é um erro a sério: ou caiu do top 1000,
 * ou mudou de nome/mundo, ou o formato da API mudou.
 */
export async function findInHighscores(name, { world, fetchImpl = fetch, retryDelayMs, now = () => new Date() } = {}) {
  const wanted = name.toLowerCase();
  let totalPages = 1;
  let lastEntry;
  for (let page = 1; page <= totalPages; page++) {
    const body = await fetchHighscoresPage(world, page, { fetchImpl, retryDelayMs });
    const highscores = body?.highscores;
    const list = highscores?.highscore_list;
    if (!Array.isArray(list)) throw formatError(page, 'falta highscores.highscore_list');
    if (page === 1) {
      totalPages = Number(highscores?.highscore_page?.total_pages);
      if (!Number.isInteger(totalPages) || totalPages < 1) {
        throw formatError(page, 'falta highscores.highscore_page.total_pages');
      }
    }
    if (list.length > 0) lastEntry = list[list.length - 1];

    const entry = list.find((candidate) => String(candidate?.name).toLowerCase() === wanted);
    if (!entry) continue;

    const level = Number(entry.level);
    const experience = Number(entry.value);
    if (!Number.isInteger(level) || level <= 0 || !Number.isFinite(experience) || experience <= 0) {
      throw formatError(page, `entrada de "${name}" sem level/value válidos (${JSON.stringify(entry)})`);
    }

    // highscore_age: minutos desde que o tibia.com atualizou a lista. É a
    // hora da leitura que decide a que dia ela pertence, não a do pedido.
    const apiTime = Date.parse(body?.information?.timestamp);
    const ageMinutes = Number(highscores.highscore_age);
    const base = Number.isFinite(apiTime) ? apiTime : now().getTime();
    const snapshotAt = new Date(base - (Number.isFinite(ageMinutes) ? ageMinutes : 0) * 60_000);

    return { rank: entry.rank, page, totalPages, level, experience, snapshotAt };
  }

  const cutoff = lastEntry ? ` O último da lista (posto ${lastEntry.rank}) está no nível ${lastEntry.level}.` : '';
  throw Object.assign(
    new Error(
      `"${name}" não está em nenhuma das ${totalPages} página(s) dos highscores de ${world}.${cutoff} ` +
        'Caiu do top 1000, mudou de nome/mundo, ou o formato da API mudou.'
    ),
    { transient: false, notFound: true }
  );
}

/**
 * Lê um personagem dos highscores e acrescenta a linha do dia ao histórico,
 * se ainda não existir. Como o scraper do guildstats, nunca sobrescreve.
 */
export async function syncFromHighscores({ id, nick, world, dataDir, fetchImpl, retryDelayMs, now = () => new Date() }) {
  const found = await findInHighscores(nick, { world, fetchImpl, retryDelayMs, now });
  const where = `posto ${found.rank}, página ${found.page}/${found.totalPages}`;

  // Logo a seguir ao save a lista ainda pode ser a de antes dele. Gravá-la
  // dava ao dia de ontem a XP de anteontem — espera-se pela próxima corrida.
  if (tibiaDayOf(found.snapshotAt) !== tibiaDayOf(now())) {
    throw Object.assign(
      new Error(`os highscores ainda são de antes do server save (lidos às ${found.snapshotAt.toISOString()}) — tentar mais tarde`),
      { transient: true }
    );
  }

  const date = historyDateFor(found.snapshotAt);
  const history = loadExistingHistory(dataDir, id);
  if (history.some((entry) => entry.date === date)) {
    console.log(`[${id}] já está em dia (${date}; ${where}, ${found.experience} XP) — nada a fazer.`);
    return { added: 0, date, ...found };
  }

  const expectedLevel = levelForExperience(found.experience);
  if (expectedLevel !== found.level) {
    console.warn(
      `[${id}] aviso: nível dos highscores (${found.level}) difere do calculado pela fórmula (${expectedLevel}) para ${found.experience} XP.`
    );
  }

  history.push({ date, level: found.level, experience: found.experience, scrapedAt: now().toISOString() });
  history.sort((a, b) => a.date.localeCompare(b.date));
  saveHistory(dataDir, id, history);
  console.log(`[${id}] guardado ${date}: nível ${found.level}, ${found.experience} XP (${where}).`);
  return { added: 1, date, ...found };
}

/**
 * Recolhe quem tem fonte (`source: 'tibiadata'`) e diz, sem rodeios, quem
 * fica à espera (`waiting`). Quem está à espera é uma limitação conhecida e
 * aceite: não pinta a corrida de vermelho, mas aparece sempre no fim.
 * Qualquer falha num personagem coberto sai com código 1.
 */
export async function runCollection({ players, dataDir, fetchImpl, retryDelayMs, now = () => new Date(), force = false }) {
  if (!force && !isAfterLisbonServerSave()) {
    console.log('Ainda não passou o server save das 9h em Lisboa — a ignorar esta execução.');
    return { covered: [], waiting: [], failed: [] };
  }

  const covered = [];
  const waiting = [];
  const failed = [];

  for (const player of players) {
    if (player.source !== 'tibiadata') {
      waiting.push(player);
      continue;
    }
    try {
      await syncFromHighscores({ ...player, dataDir, fetchImpl, retryDelayMs, now });
      covered.push(player);
    } catch (error) {
      failed.push(player);
      console.error(`[${player.id}] falhou${error.transient ? ' (temporário)' : ''}: ${error.message}`);
    }
  }

  console.log('');
  console.log(`Cobertos (highscores oficiais via TibiaData): ${covered.map((p) => p.nick).join(', ') || 'nenhum'}`);
  for (const player of waiting) {
    console.log(`À ESPERA — ${player.nick} (${player.id}) NÃO está a ser recolhido: ${player.waiting}`);
  }
  if (failed.length > 0) {
    console.error(`Falharam: ${failed.map((p) => p.nick).join(', ')} — ver as linhas "falhou" acima.`);
    process.exitCode = 1;
  }
  return { covered, waiting, failed };
}
