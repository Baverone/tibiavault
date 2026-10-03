import { experienceForLevel, levelForExperience } from './experienceTable.ts';
import type { LevelProgress } from './types.ts';

/**
 * Given the total experience a character has, works out the current level,
 * the next level, and how far into that level the character is.
 */
export function getLevelProgress(experience: number): LevelProgress {
  const currentLevel = levelForExperience(experience);
  const nextLevel = currentLevel + 1;

  const experienceAtCurrentLevel = experienceForLevel(currentLevel);
  const experienceAtNextLevel = experienceForLevel(nextLevel);

  const experienceIntoLevel = experience - experienceAtCurrentLevel;
  const levelSpan = experienceAtNextLevel - experienceAtCurrentLevel;
  const experienceToNextLevel = experienceAtNextLevel - experience;

  const progressPercent = levelSpan > 0 ? (experienceIntoLevel / levelSpan) * 100 : 0;

  return {
    currentLevel,
    nextLevel,
    experienceAtCurrentLevel,
    experienceAtNextLevel,
    experienceIntoLevel,
    experienceToNextLevel,
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
  };
}
