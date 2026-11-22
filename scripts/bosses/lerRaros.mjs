// Lê as previsões dos bosses raros do Celesta no GuildStats e grava
// data/bosses-raros/celesta.json quando mudam (22/11/2026). Corre no PC, na
// tarefa tibia-raros do ai-pc (10:10, 13:10, 20:10), que commita sem push; o
// tibia-push envia. Escreve uma linha de JSON no stdout:
//
//   {"estado": "atualizado" | "igual" | "falhou", "n": 69, "lidoEm": "...",
//    "ficheiro": "data/bosses-raros/celesta.json", "semFicha": [...], "erro": "..."}
//
// `semFicha` são raros que o GuildStats segue e que data/bosses-fontes/raros.json
// ainda não tem: correr scripts/bosses/fontesRaros.mjs e gerar o catálogo.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { USER_AGENT, httpErrorFor } from '../lib/guildstatsHistory.mjs';
import { URL_RAROS, juntarLeitura, lerTabelaRaros } from './guildstatsRaros.mjs';

export const FICHEIRO = 'data/bosses-raros/celesta.json';
/** A 22/11/2026 vinham 74; muito menos do que isto é a página cortada ou mudada. */
const MINIMO = 30;

const CABECALHOS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://guildstats.eu/',
};

function lerJson(url) {
  try {
    return JSON.parse(readFileSync(url, 'utf8'));
  } catch {
    return null;
  }
}

export async function executar({ fetchFn = fetch, raiz = new URL('../../', import.meta.url), agora = new Date(), minimo = MINIMO } = {}) {
  let r;
  try {
    r = await fetchFn(URL_RAROS, { headers: CABECALHOS, signal: AbortSignal.timeout(30_000) });
  } catch (e) {
    throw new Error(`sem ligação ao GuildStats: ${e.message}`);
  }
  if (!r.ok) throw httpErrorFor(r);
  const bosses = lerTabelaRaros(await r.text());
  if (bosses.length < minimo) throw new Error(`só ${bosses.length} bosses com previsão (esperava ${minimo}+): a página veio cortada ou mudou`);

  const destino = new URL(FICHEIRO, raiz);
  const { mudou, ficheiro } = juntarLeitura(lerJson(destino), bosses, agora);
  if (mudou) {
    mkdirSync(new URL('./', destino), { recursive: true });
    const tmp = new URL(`${FICHEIRO}.tmp`, raiz);
    writeFileSync(tmp, `${JSON.stringify(ficheiro, null, 1)}\n`);
    renameSync(tmp, destino);
  }
  const fichas = lerJson(new URL('data/bosses-fontes/raros.json', raiz)) ?? [];
  const conhecidos = new Set(fichas.map((f) => String(f.nomeGuildstats).toLowerCase()));
  return {
    estado: mudou ? 'atualizado' : 'igual',
    n: bosses.length,
    lidoEm: ficheiro.lidoEm,
    ficheiro: FICHEIRO,
    semFicha: bosses.filter((b) => !conhecidos.has(b.nome.toLowerCase())).map((b) => b.nome),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href && existsSync(fileURLToPath(import.meta.url))) {
  executar()
    .then((r) => console.log(JSON.stringify(r)))
    .catch((e) => {
      console.log(JSON.stringify({ estado: 'falhou', erro: e.message, ficheiro: FICHEIRO }));
      process.exit(1);
    });
}
