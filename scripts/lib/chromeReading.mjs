// A fonte `chrome`: a XP lida pela tarefa tibia-xp-chrome do ai-pc, no Chrome
// do André, na tabela Experience de https://guildstats.eu/character/<nome>.
//
// 21/10/2026, decisão do André («Sim, pelo meu Chrome»): o guildstats só se lê
// pelo Chrome dele, no máximo 2 páginas por dia, e pára em qualquer desafio do
// Cloudflare. Por isso este recolhedor NÃO faz pedido nenhum — a recolha diária
// (scrape-experience.mjs, aqui e no GitHub Actions) só diz em que dia está o
// ficheiro. Quem escreve as linhas é a tarefa do ai-pc, com o mergeRows de
// guildstatsHistory.mjs (só dias em falta, nunca reescreve).
//
// O lib/guildstatsCharacter.mjs (o fetch com User-Agent honesto, de manhã de
// 21/10) fica no repositório com os testes do parser, mas já não é chamado.
import { historyDateFor } from './tibiaDataHighscores.mjs';
import { loadExistingHistory } from './guildstatsHistory.mjs';

export const CHROME_TASK = 'tibia-xp-chrome';

export async function syncFromChromeTask({ id, dataDir, now = () => new Date() }) {
  const wanted = historyDateFor(now());
  const dates = loadExistingHistory(dataDir, id)
    .map((entry) => entry.date)
    .filter(Boolean)
    .sort();
  const latest = dates.at(-1) ?? '(nenhum)';
  const state = dates.includes(wanted) ? 'já tem' : 'ainda não tem';
  console.log(
    `[${id}] lido pelo Chrome do André (tarefa ${CHROME_TASK} do ai-pc) — aqui não se faz pedido nenhum. ` +
      `O ficheiro ${state} ${wanted} (último dia: ${latest}).`
  );
  return { added: 0, date: wanted };
}
