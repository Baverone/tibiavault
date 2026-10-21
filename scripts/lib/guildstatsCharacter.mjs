// Recolha da XP pela página de personagem do guildstats.eu
// (https://guildstats.eu/character?nick=...). Desde 21/10/2026 é a fonte do
// Bluey The Cat, que está abaixo do corte do top 1000 dos highscores (nível
// 600, corte ~670) e por isso não aparece na API do TibiaData.
//
// Porque esta página e não o tab.php: o tab.php (o histórico) continua atrás
// do challenge do Cloudflare. Esta página responde 200 — mas só com um
// User-Agent honesto: a 21/10/2026 o mesmo pedido com o UA de Chrome levou
// 403 + cf-mitigated: challenge, e sem UA levou 403. O robots.txt do
// guildstats permite /character (só proíbe followName, unfollow e set).
//
// Só serve para o Bluey. A página do Baverone tem outro aspecto ("Level up!",
// sem progresso nem total) e ele fica nos highscores oficiais.
//
// O que se lê do cabeçalho da personagem: o nível, o progresso para o nível
// seguinte ("16,981,552 / 17,910,200 exp — to level 601") e o total
// ("(3,581,151,352 exp)"). Os três têm de bater certo com a fórmula do Tibia
// (src/domain/experienceTable.ts) — expDoNivel(nível) + progresso == total —
// e se não baterem a recolha FALHA, com os números na mensagem. Um parser que
// começa a ler mal e grava lixo em silêncio é pior do que não recolher nada.
//
// Limite que a conta não apanha: o total é o que o guildstats tem guardado
// (na página do Baverone eles próprios escrevem "stored exp"), e o nível vem
// do tibia.com. Se o guardado ficar velho mas dentro do mesmo nível, a conta
// bate na mesma. Se o personagem mudar de nível, a página muda de aspecto e o
// parser falha — isso sim, apanha-se.
import * as cheerio from 'cheerio';
import { experienceForLevel } from '../../src/domain/experienceTable.ts';
import { historyDateFor } from './tibiaDataHighscores.mjs';
import { loadExistingHistory, saveHistory } from './guildstatsHistory.mjs';

export const SOURCE = 'guildstats';

// 21/10/2026: o único que passa o Cloudflare nesta página. Não trocar por um
// UA de browser — esse leva o challenge.
export const USER_AGENT = 'TibiaVault/1.0 (+https://github.com/Baverone/tibiavault)';

export function characterUrl(nick) {
  return `https://guildstats.eu/character?nick=${encodeURIComponent(nick).replace(/%20/g, '+')}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function layoutError(detail) {
  // Não é temporário: a mesma página amanhã dá o mesmo resultado.
  return Object.assign(new Error(`a página de personagem do guildstats mudou de aspecto: ${detail}`), {
    transient: false,
    layout: true,
  });
}

/** "3,581,151,352" → 3581151352. Só aceita o formato com vírgulas de milhares. */
function parseGrouped(text, what) {
  const clean = text.trim();
  if (!/^\d{1,3}(,\d{3})*$/.test(clean)) throw layoutError(`${what} não é um número ("${clean}")`);
  return Number(clean.replace(/,/g, ''));
}

/**
 * Tira o nome, o nível, o progresso e o total do HTML da página. Não valida a
 * aritmética — isso é o `checkExperience`, à parte para se poder testar.
 */
export function parseCharacterPage(html) {
  const $ = cheerio.load(html);
  const name = $('h1').first().text().trim();
  if (!name) throw layoutError('sem <h1> com o nome');
  const world = ($('title').text().match(/\(([^)]+)\)\s*\|/) || [])[1] ?? null;

  const label = $('span').filter((_, el) => $(el).text().trim() === 'Level').first();
  if (label.length === 0) throw layoutError('não encontrei o rótulo "Level"');
  const level = parseGrouped(label.next('span').text(), 'o nível');
  const header = label.parent();

  const toLevel = header.find('p').filter((_, el) => /to level/.test($(el).text())).first();
  const nextLevelMatch = toLevel.text().match(/to level\s+([\d,]+)/);
  if (!nextLevelMatch) throw layoutError('sem o "to level N" (progresso para o nível seguinte)');
  const nextLevel = parseGrouped(nextLevelMatch[1], 'o nível seguinte');

  const progressSpans = toLevel.prev('p').find('span.font-mono');
  if (progressSpans.length !== 2) {
    throw layoutError(`o progresso devia ter 2 números ("X / Y exp"), tem ${progressSpans.length}`);
  }
  const progress = parseGrouped(progressSpans.eq(0).text(), 'o progresso');
  const levelSpan = parseGrouped(progressSpans.eq(1).text(), 'o salto para o nível seguinte');

  const totalMatch = header
    .find('p')
    .filter((_, el) => /^\([\d,]+ exp\)$/.test($(el).text().trim()))
    .first()
    .text()
    .trim()
    .match(/^\(([\d,]+) exp\)$/);
  if (!totalMatch) throw layoutError('sem o total "(N exp)"');
  const experience = parseGrouped(totalMatch[1], 'o total');

  return { name, world, level, nextLevel, progress, levelSpan, experience };
}

/**
 * A guarda: os números da página têm de bater com a fórmula do Tibia. Lança
 * com os números todos na mensagem se não baterem.
 */
export function checkExperience({ level, nextLevel, progress, levelSpan, experience }) {
  const base = experienceForLevel(level);
  const problems = [];
  if (base + progress !== experience) {
    problems.push(
      `expDoNivel(${level}) = ${base} + progresso ${progress} = ${base + progress}, mas o total na página é ${experience}`
    );
  }
  if (nextLevel !== level + 1) problems.push(`o nível seguinte é ${nextLevel}, devia ser ${level + 1}`);
  const span = experienceForLevel(level + 1) - base;
  if (levelSpan !== span) problems.push(`o salto ${level}→${level + 1} na página é ${levelSpan}, pela fórmula é ${span}`);
  if (problems.length > 0) {
    throw Object.assign(new Error(`os números do guildstats não batem com a tabela de experiência: ${problems.join('; ')}`), {
      transient: false,
      mismatch: true,
    });
  }
}

/**
 * A página, com repetição. Rede em baixo, 429 e 5xx são temporários e
 * repetem-se; o challenge do Cloudflare não (só um browser o resolve).
 */
export async function fetchCharacterPage(nick, { fetchImpl = fetch, attempts = 3, retryDelayMs = 4000 } = {}) {
  const url = characterUrl(nick);
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      let response;
      try {
        response = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' } });
      } catch (networkError) {
        throw Object.assign(new Error(`sem ligação (${networkError.message})`), { transient: true });
      }
      if (response.status === 403 && response.headers.get('cf-mitigated') === 'challenge') {
        throw Object.assign(
          new Error('HTTP 403 — challenge do Cloudflare: o guildstats passou a exigir browser nesta página'),
          { transient: false }
        );
      }
      if (!response.ok) {
        const transient = response.status === 429 || response.status >= 500;
        throw Object.assign(new Error(`HTTP ${response.status}`), { transient });
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (!error.transient) break;
      if (attempt < attempts) await sleep(retryDelayMs * attempt);
    }
  }
  const tried = lastError.transient ? `${attempts} tentativas` : '1 tentativa';
  throw Object.assign(new Error(`guildstats, ${url} (${tried}): ${lastError.message}`), {
    transient: lastError.transient === true,
  });
}

/** Lê, valida e devolve a leitura de um personagem. */
export async function readCharacter(nick, { world, fetchImpl, retryDelayMs } = {}) {
  const page = parseCharacterPage(await fetchCharacterPage(nick, { fetchImpl, retryDelayMs }));
  // Um nick com o espaço trocado ou um redirect para outra personagem não pode
  // entrar no ficheiro de outra.
  if (page.name.toLowerCase() !== nick.toLowerCase()) {
    throw layoutError(`a página é de "${page.name}", pedi "${nick}"`);
  }
  if (world && page.world !== world) {
    throw layoutError(`o mundo na página é ${page.world ?? '(nenhum)'}, esperava ${world}`);
  }
  checkExperience(page);
  return page;
}

/**
 * Lê a página e acrescenta a linha do dia ao histórico, se ainda não existir.
 * A data segue a convenção do resto do ficheiro (historyDateFor): depois do
 * server save de D+1, a leitura é a linha de D. Nunca sobrescreve.
 */
export async function syncFromGuildstatsCharacter({ id, nick, world, dataDir, fetchImpl, retryDelayMs, now = () => new Date() }) {
  const page = await readCharacter(nick, { world, fetchImpl, retryDelayMs });
  const date = historyDateFor(now());
  const history = loadExistingHistory(dataDir, id);
  if (history.some((entry) => entry.date === date)) {
    console.log(`[${id}] já está em dia (${date}; guildstats, ${page.experience} XP) — nada a fazer.`);
    return { added: 0, date, ...page };
  }
  history.push({ date, level: page.level, experience: page.experience, scrapedAt: now().toISOString(), source: SOURCE });
  history.sort((a, b) => a.date.localeCompare(b.date));
  saveHistory(dataDir, id, history);
  console.log(
    `[${id}] guardado ${date}: nível ${page.level}, ${page.experience} XP ` +
      `(guildstats; ${experienceForLevel(page.level)} + ${page.progress} confere com a fórmula).`
  );
  return { added: 1, date, ...page };
}
