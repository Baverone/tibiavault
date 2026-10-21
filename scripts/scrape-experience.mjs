// Recolha diária da XP dos bonecos: acrescenta a linha do dia em
// data/scraped-history/<id>.json. Nunca apaga nem sobrescreve — por isso é
// seguro correr as vezes que forem precisas.
//
// Duas fontes, uma por boneco (ver `source` em lib/trackedPlayers.mjs):
// - o Baverone pelos highscores oficiais do Celesta (API do TibiaData);
// - o Bluey (abaixo do top 1000, não aparece nos highscores) pela tabela
//   Experience do guildstats.eu, lida no Chrome do André pela tarefa
//   tibia-xp-chrome do ai-pc (lib/chromeReading.mjs: aqui não se faz pedido
//   nenhum). De manhã de 21/10/2026 foi por fetch à página de personagem
//   (lib/guildstatsCharacter.mjs); nesse mesmo dia o André decidiu que o
//   guildstats só se lê pelo Chrome dele, 2 páginas por dia.
//
// Até 14/10/2026 a fonte de ambos era o histórico do guildstats (tab.php),
// que passou a exigir browser (challenge do Cloudflare). Nenhuma das fontes
// de agora guarda dias passados: um dia em que isto não corra fica perdido.
//
// Corre no PC pela tarefa tibia-xp do ai-pc, e no GitHub Actions como rede de
// segurança. Ver .github/workflows/scrape-experience.yml.
import { syncFromChromeTask } from './lib/chromeReading.mjs';
import { runCollection, syncFromHighscores } from './lib/tibiaDataHighscores.mjs';
import { CHARACTERS, DATA_DIR } from './lib/trackedPlayers.mjs';

await runCollection({
  players: CHARACTERS,
  dataDir: DATA_DIR,
  syncers: { tibiadata: syncFromHighscores, chrome: syncFromChromeTask },
  force: process.env.FORCE_SCRAPE === 'true',
});
