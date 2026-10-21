// Recolha diária da XP dos bonecos: acrescenta a linha do dia em
// data/scraped-history/<id>.json. Nunca apaga nem sobrescreve — por isso é
// seguro correr as vezes que forem precisas.
//
// Duas fontes, uma por boneco (ver `source` em lib/trackedPlayers.mjs):
// - o Baverone pelos highscores oficiais do Celesta (API do TibiaData);
// - desde 21/10/2026, o Bluey pela página de personagem do guildstats.eu
//   (lib/guildstatsCharacter.mjs), porque está abaixo do top 1000 e não
//   aparece nos highscores.
//
// Até 14/10/2026 a fonte de ambos era o histórico do guildstats (tab.php),
// que passou a exigir browser (challenge do Cloudflare). Nenhuma das fontes
// de agora guarda dias passados: um dia em que isto não corra fica perdido.
//
// Corre no PC pela tarefa tibia-xp do ai-pc, e no GitHub Actions como rede de
// segurança. Ver .github/workflows/scrape-experience.yml.
import { syncFromGuildstatsCharacter } from './lib/guildstatsCharacter.mjs';
import { runCollection, syncFromHighscores } from './lib/tibiaDataHighscores.mjs';
import { CHARACTERS, DATA_DIR } from './lib/trackedPlayers.mjs';

await runCollection({
  players: CHARACTERS,
  dataDir: DATA_DIR,
  syncers: { tibiadata: syncFromHighscores, guildstats: syncFromGuildstatsCharacter },
  force: process.env.FORCE_SCRAPE === 'true',
});
