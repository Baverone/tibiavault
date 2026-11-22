// Junta uma leitura das previsões dos bosses raros do Celesta (22/11/2026):
//
//   node scripts/bosses/lerRaros.mjs <página guardada do GuildStats.html>
//   node scripts/bosses/lerRaros.mjs --linhas <linhas.json>   (as da tibia-raros-chrome)
//
// A página (https://guildstats.eu/bosses?world=Celesta) é lida no Chrome do
// André: o GuildStats NUNCA se pede por fetch, headless ou com cabeçalhos
// falsos (regra de 21/10/2026 do ai-pc, REGRAS.md). Este script só lê o
// ficheiro, grava data/bosses-raros/celesta.json quando as previsões mudam, e
// escreve uma linha de JSON no stdout:
//
//   {"estado": "atualizado" | "igual" | "falhou", "n": 74, "lidoEm": "...",
//    "ficheiro": "data/bosses-raros/celesta.json", "semFicha": [...], "erro": "..."}
//
// `semFicha` são raros que o GuildStats segue e que data/bosses-fontes/raros.json
// ainda não tem: correr scripts/bosses/fontesRaros.mjs e gerar o catálogo.
import { mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { juntarLeitura, lerTabelaRaros, normalizarLinhas } from './guildstatsRaros.mjs';

export const FICHEIRO = 'data/bosses-raros/celesta.json';
/** A 22/11/2026 vinham 74; muito menos do que isto é a página cortada ou mudada. */
const MINIMO = 30;

function lerJson(url) {
  try {
    return JSON.parse(readFileSync(url, 'utf8'));
  } catch {
    return null;
  }
}

/** `html` (a página guardada) ou `linhas` (o texto que o JavaScript da tibia-raros-chrome tira da página). */
export function executar({ html, linhas, raiz = new URL('../../', import.meta.url), agora = new Date(), minimo = MINIMO }) {
  if (linhas !== undefined && !Array.isArray(linhas)) throw new Error('as linhas não são uma lista');
  const bosses = linhas !== undefined ? normalizarLinhas(linhas) : lerTabelaRaros(html);
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

// Chamado directamente? Compara-se pelo caminho verdadeiro: o PC corre o
// tibiavault pela junção C:\Users\Catarina\tibiavault e o Node dá ao módulo o
// caminho resolvido (22/11/2026: sem isto saía com 0 sem fazer nada).
const chamadoDirecto = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (chamadoDirecto) {
  try {
    const [a, b] = process.argv.slice(2);
    if (!a) throw new Error('uso: node scripts/bosses/lerRaros.mjs <página.html> | --linhas <linhas.json>');
    const entrada = a === '--linhas' ? { linhas: JSON.parse(readFileSync(b, 'utf8')) } : { html: readFileSync(a, 'utf8') };
    console.log(JSON.stringify(executar(entrada)));
  } catch (e) {
    console.log(JSON.stringify({ estado: 'falhou', erro: e.message, ficheiro: FICHEIRO }));
    process.exit(1);
  }
}
