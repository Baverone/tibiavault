// Junta uma leitura das previsões dos bosses raros do Celesta (22/11/2026):
//
//   node scripts/bosses/lerRaros.mjs <página guardada do GuildStats.html>
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
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { juntarLeitura, lerTabelaRaros } from './guildstatsRaros.mjs';

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

export function executar({ html, raiz = new URL('../../', import.meta.url), agora = new Date(), minimo = MINIMO }) {
  const bosses = lerTabelaRaros(html);
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const caminho = process.argv[2];
    if (!caminho) throw new Error('falta a página guardada: node scripts/bosses/lerRaros.mjs <ficheiro.html>');
    console.log(JSON.stringify(executar({ html: readFileSync(caminho, 'utf8') })));
  } catch (e) {
    console.log(JSON.stringify({ estado: 'falhou', erro: e.message, ficheiro: FICHEIRO }));
    process.exit(1);
  }
}
