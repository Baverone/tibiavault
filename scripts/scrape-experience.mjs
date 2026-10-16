// Recolha diária da XP dos bonecos: lê os highscores oficiais do Celesta (API
// do TibiaData) e acrescenta a linha do dia em data/scraped-history/<id>.json.
// Nunca apaga nem sobrescreve — por isso é seguro correr as vezes que forem
// precisas.
//
// Até 14/10/2026 a fonte era o guildstats.eu, que passou a exigir browser
// (challenge do Cloudflare). Os highscores só têm o top 1000, por isso quem
// estiver abaixo do corte fica à espera — ver `waiting` em
// lib/trackedPlayers.mjs. Ao contrário do guildstats, os highscores não
// guardam dias passados: um dia em que isto não corra fica perdido.
//
// Corre no PC pela tarefa tibia-xp do ai-pc, e no GitHub Actions como rede de
// segurança. Ver .github/workflows/scrape-experience.yml.
import { runCollection } from './lib/tibiaDataHighscores.mjs';
import { CHARACTERS, DATA_DIR } from './lib/trackedPlayers.mjs';

await runCollection({ players: CHARACTERS, dataDir: DATA_DIR, force: process.env.FORCE_SCRAPE === 'true' });
