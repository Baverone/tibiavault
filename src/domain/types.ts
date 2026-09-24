// Tipos partilhados do domínio. Sem nada de React/UI aqui.

/**
 * Chave de armazenamento e nome do ficheiro de histórico de um boneco.
 *
 * Foi uma união estreita, depois `string` quando a app teve roster dinâmico,
 * e voltou a ser uma união agora que são só os dois bonecos do André. Estreitar
 * outra vez é de propósito: o TypeScript passa a apanhar um id errado em vez de
 * o deixar chegar a um fetch que devolve 404 em silêncio.
 *
 * Os ids ficam exatamente como estavam ('royal-paladin', 'exalted-monk') —
 * são os nomes dos ficheiros em data/scraped-history/ e as chaves do
 * localStorage que já lá estão.
 */
export type CharacterId = 'royal-paladin' | 'exalted-monk';

// Os separadores (`AppTabId`, `UTILITY_TAB_IDS`) saíram daqui a 24/09/2026:
// a app deixou de ter duas filas de separadores e passou a ter páginas com
// endereço. Quem manda na navegação é agora `src/navigation/pages.ts`.

export interface ExperienceTableEntry {
  level: number;
  experience: number;
}

/**
 * Uma leitura de XP num dia. Desde que o input manual saiu, vem sempre da
 * recolha do guildstats — o campo `source` fica porque o histórico gravado
 * antes disso ainda o traz, e a lista de dias recentes distingue-os.
 */
export interface HistoryEntry {
  /** Unix epoch ms */
  timestamp: number;
  experience: number;
  source?: 'manual' | 'guildstats';
}

export interface LevelProgress {
  currentLevel: number;
  nextLevel: number;
  experienceAtCurrentLevel: number;
  experienceAtNextLevel: number;
  experienceIntoLevel: number;
  experienceToNextLevel: number;
  /** 0-100 */
  progressPercent: number;
}
