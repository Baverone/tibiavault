// Quem é recolhido automaticamente, e para onde vai.
//
// Vivia espalhado pelos scripts de recolha; está aqui porque o
// check-history-freshness.mjs também precisa da lista — sem isso ele olhava
// para *todos* os ficheiros na pasta e queixava-se de jogadores que ninguém
// rastreia. Um alarme que está sempre a tocar é um alarme que se ignora, e
// era exatamente esse o problema a resolver.
//
// Manter igual a src/constants/players.tsx: se os ids não baterem certo, a
// app pede um ficheiro que o robô nunca escreve e mostra um painel vazio sem
// dizer porquê.
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Os dois bonecos do André → data/scraped-history/<id>.json
 *
 * `source: 'tibiadata'` = recolhido pelos highscores oficiais
 * (lib/tibiaDataHighscores.mjs). Sem fonte, `waiting` diz porquê — e é esse
 * texto que a recolha e o alarme de frescura imprimem, para que a falta fique
 * à vista em vez de escondida num verde.
 */
export const CHARACTERS = [
  { id: 'royal-paladin', nick: 'Baverone', world: 'Celesta', source: 'tibiadata' },
  {
    id: 'exalted-monk',
    nick: 'Bluey The Cat',
    world: 'Celesta',
    source: null,
    // 16/10/2026: nível 600, e o top 1000 do Celesta corta no 670. O
    // guildstats (a fonte antiga) está atrás do Cloudflare desde 14/10.
    waiting:
      'fora do top 1000 dos highscores do Celesta (nível ~600, corte ~670) e o guildstats exige browser ' +
      'desde 14/10/2026 — fica à espera da recolha por browser, que ainda não existe.',
  },
];

export const DATA_DIR = join(ROOT, 'data', 'scraped-history');
