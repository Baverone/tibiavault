import type { CharacterId } from '../domain/types.ts';
import type { TrainableSkill } from '../domain/skillTraining.ts';

// Persists the Skill Training Calculator's inputs per character, so the
// draft survives reloads and tab switches (this panel is always mounted,
// never unmounted, like the rest of the app). Vocation is NOT stored here —
// see useCharacterVocation/vocationLookup — it's auto-detected instead.

export interface SkillEntryInput {
  level: string;
  /** % still missing to reach the next level (i.e. 100 - % complete). */
  percent: string;
  /** Optional goal the user is training towards. Older saved drafts don't
   *  have it, so every read has to tolerate it being undefined. */
  target?: string;
}

export interface SkillTrainingConfig {
  knightWeapons: ('axe' | 'sword' | 'club')[];
  skills: Partial<Record<TrainableSkill, SkillEntryInput>>;
  specialDummy: boolean;
  /** Account's Loyalty bonus (0, 5, 10, ... 50), since it inflates the displayed skill level. */
  loyaltyBonusPercent: number;
}

const STORAGE_PREFIX = 'tibia-xp-calc:skill-training:';

const DEFAULT_CONFIG: SkillTrainingConfig = {
  knightWeapons: [],
  skills: {},
  specialDummy: false,
  loyaltyBonusPercent: 0,
};

function storageKey(characterId: CharacterId): string {
  return `${STORAGE_PREFIX}${characterId}`;
}

const KNIGHT_WEAPONS = ['axe', 'sword', 'club'] as const;
const SKILLS: readonly TrainableSkill[] = ['magic', 'axe', 'sword', 'club', 'distance', 'shielding', 'fist'];

function sanitizeEntry(value: unknown): SkillEntryInput | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.level !== 'string' || typeof v.percent !== 'string') return null;
  return { level: v.level, percent: v.percent, ...(typeof v.target === 'string' ? { target: v.target } : {}) };
}

/**
 * Só aproveita o que tiver a forma certa (11/11/2026, auditoria com o Codex):
 * um `{"skills":null}` guardado entrava tal e qual e a calculadora rebentava a
 * cada recarga, sem forma de sair disso a não ser limpar o browser.
 */
export function sanitizeSkillTrainingConfig(parsed: unknown): SkillTrainingConfig {
  if (typeof parsed !== 'object' || parsed === null) return DEFAULT_CONFIG;
  const p = parsed as Record<string, unknown>;
  const skills: SkillTrainingConfig['skills'] = {};
  if (typeof p.skills === 'object' && p.skills !== null) {
    for (const skill of SKILLS) {
      const entry = sanitizeEntry((p.skills as Record<string, unknown>)[skill]);
      if (entry) skills[skill] = entry;
    }
  }
  const loyalty = p.loyaltyBonusPercent;
  return {
    knightWeapons: Array.isArray(p.knightWeapons)
      ? KNIGHT_WEAPONS.filter((w) => (p.knightWeapons as unknown[]).includes(w))
      : [],
    skills,
    specialDummy: typeof p.specialDummy === 'boolean' ? p.specialDummy : false,
    loyaltyBonusPercent:
      typeof loyalty === 'number' && Number.isInteger(loyalty) && loyalty >= 0 && loyalty <= 50 && loyalty % 5 === 0
        ? loyalty
        : 0,
  };
}

export function getSkillTrainingConfig(characterId: CharacterId): SkillTrainingConfig {
  try {
    const raw = localStorage.getItem(storageKey(characterId));
    if (!raw) return DEFAULT_CONFIG;
    return sanitizeSkillTrainingConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveSkillTrainingConfig(characterId: CharacterId, config: SkillTrainingConfig): SkillTrainingConfig {
  try {
    localStorage.setItem(storageKey(characterId), JSON.stringify(config));
  } catch {
    // Janela privada ou armazenamento cheio — como em huntPlannerStorage, a
    // calculadora continua a funcionar, só não se lembra dos valores da
    // próxima vez. Sem isto a excepção subia de dentro do updater do
    // useState e tirava a app inteira do ar a meio de escrever um nível.
  }
  return config;
}
