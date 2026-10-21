// Quem é recolhido automaticamente, e para onde vai.
//
// Vivia espalhado pelos scripts de recolha; está aqui porque o
// check-history-freshness.mjs também precisa da lista — sem isso ele olhava
// para *todos* os ficheiros na pasta e queixava-se de jogadores que ninguém
// rastreia. Um alarme que está sempre a tocar é um alarme que se ignora, e
// era exatamente esse o problema a resolver.
//
// Manter igual a src/constants/players.ts: se os ids não baterem certo, a
// app pede um ficheiro que o robô nunca escreve e mostra um painel vazio sem
// dizer porquê.
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Os dois bonecos do André → data/scraped-history/<id>.json
 *
 * `source: 'tibiadata'` = recolhido pelos highscores oficiais
 * (lib/tibiaDataHighscores.mjs); `source: 'chrome'` = pela tabela Experience
 * do guildstats, lida no Chrome do André pela tarefa tibia-xp-chrome do ai-pc
 * (lib/chromeReading.mjs — a recolha daqui não faz pedido nenhum). Sem fonte
 * (`source: null`), `waiting` diz porquê — e é esse texto que a recolha e o
 * alarme de frescura imprimem, para que a falta fique à vista em vez de
 * escondida num verde.
 */
export const CHARACTERS = [
  { id: 'royal-paladin', nick: 'Baverone', world: 'Celesta', source: 'tibiadata' },
  // 21/10/2026: volta a ser recolhido. Esteve à espera de 14/10 a 20/10
  // (fora do top 1000, nível 600 com o corte no ~670; o histórico do
  // guildstats atrás do Cloudflare). Os dias 14/10 a 19/10 foram preenchidos
  // a 21/10 com a tabela Experience do guildstats lida à mão no browser.
  // 21/10/2026, mais tarde: de 'guildstats' (fetch à página de personagem) para
  // 'chrome' — decisão do André, o guildstats só pelo Chrome dele.
  { id: 'exalted-monk', nick: 'Bluey The Cat', world: 'Celesta', source: 'chrome' },
];

export const DATA_DIR = join(ROOT, 'data', 'scraped-history');
