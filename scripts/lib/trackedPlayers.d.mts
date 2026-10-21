// Tipos de trackedPlayers.mjs, para o src/navigation/pages.test.ts poder
// confrontar esta lista com src/constants/players.ts (20/10/2026).
export interface TrackedCharacter {
  id: string;
  nick: string;
  world: string;
  source: 'tibiadata' | 'chrome' | null;
  waiting?: string;
}

export const CHARACTERS: TrackedCharacter[];
export const DATA_DIR: string;
