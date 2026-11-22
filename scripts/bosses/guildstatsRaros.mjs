// Os bosses raros do Celesta segundo o GuildStats (22/11/2026).
//
// O André não quer que se contem cooldowns na página Bosses, a não ser nos
// bosses raros de aparecer, e só se houver uma página que os siga. Essa página
// é a «Spawn Tracker & Predictions» do GuildStats: para cada boss raro diz a
// chance de aparecer hoje («9.4%», «Low», ou «No» com os dias até a janela
// abrir) e o último dia em que foi visto. Lê-se no PC (tarefa tibia-raros do
// ai-pc), porque o GuildStats recusa os pedidos do GitHub, e grava-se em
// data/bosses-raros/celesta.json só quando muda.
import * as cheerio from 'cheerio';
import { isDeepStrictEqual } from 'node:util';

export const URL_RAROS = 'https://guildstats.eu/bosses?world=Celesta';

const COLUNAS = {
  nome: 'Boss name',
  ontem: 'Yesterday killed',
  ultimoVisto: 'Last seen',
  tipo: 'Type',
  previsao: 'Possibility',
  emDias: 'Expected in',
};

const texto = ($, el) => $(el).text().replace(/\s+/g, ' ').trim();

function lerPrevisao(celula, emDias) {
  if (/^no$/i.test(celula)) {
    const dias = Number.parseInt(emDias, 10);
    return { tipo: 'nao', emDias: Number.isFinite(dias) ? dias : null };
  }
  if (/^low$/i.test(celula)) return { tipo: 'baixa' };
  const pct = /^(\d+(?:\.\d+)?)\s*%$/.exec(celula);
  return pct ? { tipo: 'pct', valor: Number(pct[1]) } : null;
}

const txt = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

/**
 * As linhas em texto, tal como a página as mostra ({nome, tipo, possibilidade,
 * emDias, ultimoVisto, ontem}), convertidas. Vêm do HTML (lerTabelaRaros) ou do
 * JavaScript que a tarefa tibia-raros-chrome corre na página. Só ficam as que
 * têm previsão (as outras são bosses sem spawn aleatório).
 */
export function normalizarLinhas(cruas) {
  const bosses = [];
  for (const c of Array.isArray(cruas) ? cruas : []) {
    if (typeof c !== 'object' || c === null) continue;
    const nome = txt(c.nome);
    const previsao = lerPrevisao(txt(c.possibilidade), txt(c.emDias));
    if (!nome || !previsao) continue;
    const visto = txt(c.ultimoVisto);
    const ontem = Number.parseInt(txt(c.ontem).replace(/,/g, ''), 10);
    bosses.push({
      nome,
      tipo: txt(c.tipo) || null,
      previsao,
      ultimoVisto: /^\d{4}-\d{2}-\d{2}$/.test(visto) ? visto : null,
      ontem: Number.isFinite(ontem) ? ontem : 0,
    });
  }
  return bosses.sort((a, b) => a.nome.localeCompare(b.nome, 'en'));
}

/**
 * As linhas da tabela que têm previsão. Rebenta se a tabela ou as colunas não
 * estiverem lá: o layout mudou, ou veio a página do desafio do Cloudflare.
 */
export function lerTabelaRaros(html) {
  const $ = cheerio.load(html);
  const tabela = $('table').filter((_, t) => $(t).find('thead th').length > 0).first();
  if (tabela.length === 0) throw new Error('nenhuma tabela de bosses (o layout pode ter mudado)');
  const cabecalho = tabela.find('thead th').toArray().map((th) => texto($, th));
  const indice = {};
  for (const [chave, titulo] of Object.entries(COLUNAS)) {
    const i = cabecalho.indexOf(titulo);
    if (i < 0) throw new Error(`falta a coluna «${titulo}» (o layout pode ter mudado)`);
    indice[chave] = i;
  }
  const cruas = tabela.find('tbody tr').toArray().map((tr) => {
    const td = $(tr).find('td').toArray().map((c) => texto($, c));
    return {
      nome: td[indice.nome],
      // O tipo vem num tooltip ao lado das imagens: o alt da primeira imagem.
      tipo: $(tr).find('td').eq(indice.tipo).find('img').first().attr('alt') ?? '',
      possibilidade: td[indice.previsao],
      emDias: td[indice.emDias],
      ultimoVisto: td[indice.ultimoVisto],
      ontem: td[indice.ontem],
    };
  });
  const bosses = normalizarLinhas(cruas);
  if (bosses.length === 0) throw new Error('nenhuma linha com previsão (o layout pode ter mudado)');
  return bosses;
}

/**
 * O que fica no ficheiro. Com as mesmas previsões, o ficheiro não muda (e não
 * há commit): o `lidoEm` é a hora a que chegaram estas previsões.
 */
export function juntarLeitura(anterior, bosses, agora) {
  if (anterior && isDeepStrictEqual(anterior.bosses, bosses)) return { mudou: false, ficheiro: anterior };
  return { mudou: true, ficheiro: { lidoEm: agora.toISOString(), fonte: URL_RAROS, bosses } };
}
