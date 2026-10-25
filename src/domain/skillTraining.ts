/**
 * Skill training math, sourced from TibiaWiki's official formulas (Formulae
 * and Exercise Weapons pages), verified against the wiki's own worked
 * examples (a Lasting Exercise Wand/Rod — 8,640,000 mana — takes a
 * Sorcerer/Druid to ~level 66 and a Paladin to ~level 22.8; both match this
 * implementation within rounding).
 *
 * Skill points needed for the next level: P = A * b^(level - c)
 *   A = skill constant (fixed per skill, all vocations)
 *   b = vocation constant (varies per vocation AND skill)
 *   c = skill offset — 0 for Magic Level, 10 for every other skill
 *
 * Exercise/Training weapons convert real charges into skill points at a
 * fixed rate per skill type (also from TibiaWiki): every charge is worth
 * 7.2 hits for a melee weapon (Sword/Axe/Club/Fist), 4.32 hits for a Bow
 * (Distance), 14.4 blocks for a Shield, or 600 burned mana for a Wand/Rod
 * (Magic Level). "Regular training" here means a standard Exercise Dummy —
 * Monk/Demon/Ferumbras Exercise Dummies are 10% more efficient.
 */

export type Vocation = 'knight' | 'paladin' | 'sorcerer' | 'druid' | 'monk';
export type TrainableSkill = 'magic' | 'axe' | 'sword' | 'club' | 'distance' | 'shielding' | 'fist';

interface SkillFormulaConfig {
  a: number;
  c: number;
  pointsPerCharge: number;
}

const SKILL_CONFIG: Record<TrainableSkill, SkillFormulaConfig> = {
  magic: { a: 1600, c: 0, pointsPerCharge: 600 },
  axe: { a: 50, c: 10, pointsPerCharge: 7.2 },
  sword: { a: 50, c: 10, pointsPerCharge: 7.2 },
  club: { a: 50, c: 10, pointsPerCharge: 7.2 },
  fist: { a: 50, c: 10, pointsPerCharge: 7.2 },
  distance: { a: 30, c: 10, pointsPerCharge: 4.32 },
  shielding: { a: 100, c: 10, pointsPerCharge: 14.4 },
};

const VOCATION_B: Record<Vocation, Partial<Record<TrainableSkill, number>>> = {
  knight: { magic: 3.0, axe: 1.1, sword: 1.1, club: 1.1, shielding: 1.1 },
  paladin: { magic: 1.4, distance: 1.1 },
  sorcerer: { magic: 1.1 },
  druid: { magic: 1.1 },
  monk: { magic: 1.25, fist: 1.1 },
};

export const VOCATION_SKILLS: Record<Vocation, TrainableSkill[]> = {
  knight: ['axe', 'sword', 'club', 'magic', 'shielding'],
  paladin: ['distance', 'magic'],
  sorcerer: ['magic'],
  druid: ['magic'],
  monk: ['magic', 'fist'],
};

export const VOCATION_LABELS: Record<Vocation, string> = {
  knight: 'Knight',
  paladin: 'Paladin',
  sorcerer: 'Sorcerer',
  druid: 'Druid',
  monk: 'Monk',
};

export const SKILL_LABELS: Record<TrainableSkill, string> = {
  magic: 'Magic Level',
  axe: 'Axe Fighting',
  sword: 'Sword Fighting',
  club: 'Club Fighting',
  distance: 'Distance Fighting',
  shielding: 'Shielding',
  fist: 'Fist Fighting',
};

/** Minimum valid skill level — combat skills start at 10, Magic Level starts at 0. */
export function minSkillLevel(skill: TrainableSkill): number {
  return SKILL_CONFIG[skill].c;
}

export function skillTrainableBy(vocation: Vocation, skill: TrainableSkill): boolean {
  return VOCATION_B[vocation][skill] !== undefined;
}

function vocationB(skill: TrainableSkill, vocation: Vocation): number {
  const b = VOCATION_B[vocation][skill];
  if (b === undefined) {
    throw new Error(`${skill} não é treinável por ${vocation}.`);
  }
  return b;
}

/** Points (hits, or mana for Magic Level) needed to go from currentLevel to currentLevel + 1. */
export function pointsForNextLevel(skill: TrainableSkill, vocation: Vocation, currentLevel: number): number {
  const config = SKILL_CONFIG[skill];
  const b = vocationB(skill, vocation);
  return config.a * Math.pow(b, currentLevel - config.c);
}

/** Total points spent to reach `level` starting from the skill's base level. */
function totalPointsAtLevel(skill: TrainableSkill, vocation: Vocation, level: number): number {
  const config = SKILL_CONFIG[skill];
  const b = vocationB(skill, vocation);
  return (config.a * (Math.pow(b, level - config.c) - 1)) / (b - 1);
}

/** Inverse of totalPointsAtLevel: turns a raw point total back into a level + % into that level. */
function levelPercentFromPoints(skill: TrainableSkill, vocation: Vocation, points: number): { level: number; percent: number } {
  const config = SKILL_CONFIG[skill];
  const b = vocationB(skill, vocation);

  const exactLevel = Math.log((points * (b - 1)) / config.a + 1) / Math.log(b) + config.c;
  // 25/10/2026: o logaritmo, mesmo em cima de um nível certo, sai às vezes
  // 49,9999999 e o `floor` dava 49 — Magic Level 50 sem Loyalty aparecia como
  // «base 49, 99,99 %» e «0 Lasting Exercise». Acerta-se com a soma exata dos
  // pontos, com uma folga relativa para o erro de vírgula flutuante.
  const tolerance = 1e-9 * Math.max(1, points);
  let level = Math.max(config.c, Math.floor(exactLevel));
  while (totalPointsAtLevel(skill, vocation, level + 1) <= points + tolerance) level++;
  while (level > config.c && totalPointsAtLevel(skill, vocation, level) > points + tolerance) level--;
  const pointsAtLevel = totalPointsAtLevel(skill, vocation, level);
  const pointsForThisLevel = pointsForNextLevel(skill, vocation, level);
  const percent = pointsForThisLevel > 0 ? ((points - pointsAtLevel) / pointsForThisLevel) * 100 : 0;

  return { level, percent: Math.min(99.99, Math.max(0, percent)) };
}

/**
 * Loyalty bonus: 5% per 360 Loyalty Points, capped at 50% at 3600 points.
 * It does NOT speed up point gain per hit — per TibiaWiki, "characters with
 * a loyalty skill bonus will accrue skills as if they did not have the
 * bonus". It only inflates the *displayed* skill level: displayedPoints =
 * basePoints * (1 + bonus). So a level/percent typed in from the in-game
 * skills window is already loyalty-inflated and has to be converted back to
 * real (base) points before working out how many real hits are needed.
 */
export const LOYALTY_BONUS_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

export interface SkillTrainingResult {
  /** The real (non-inflated) skill level/%, derived from the displayed level/% and the Loyalty bonus. */
  baseLevel: number;
  basePercent: number;
  // --- Reaching the next IN-GAME level (the displayed, Loyalty-inflated one): displayedCurrentLevel + 1 ---
  /** Points (hits or mana) still needed to reach the next in-game level, with no Double Skill Event. */
  pointsRemaining: number;
  /** Exercise/Training weapon charges needed under normal conditions. */
  chargesNormal: number;
  /** Exercise/Training weapon charges needed with an active Double Skill Event (2x point gain). */
  chargesDoubleEvent: number;
  // --- Reaching the next REAL/base level (baseLevel + 1): a smaller milestone, unaffected by Loyalty ---
  /** Points still needed to reach the next base level, with no Double Skill Event. */
  pointsRemainingBase: number;
  chargesNormalBase: number;
  chargesDoubleEventBase: number;
}

const SPECIAL_DUMMY_EFFICIENCY = 1.1;

export function calculateSkillTraining(
  skill: TrainableSkill,
  vocation: Vocation,
  displayedCurrentLevel: number,
  displayedCurrentPercent: number,
  useSpecialDummy: boolean,
  loyaltyBonusPercent: number
): SkillTrainingResult {
  const loyaltyMultiplier = 1 + loyaltyBonusPercent / 100;

  const pointsForNextDisplayedLevel = pointsForNextLevel(skill, vocation, displayedCurrentLevel);
  const displayedPointsAtCurrent =
    totalPointsAtLevel(skill, vocation, displayedCurrentLevel) + (displayedCurrentPercent / 100) * pointsForNextDisplayedLevel;
  const displayedPointsAtNextLevel = totalPointsAtLevel(skill, vocation, displayedCurrentLevel + 1);

  const basePointsAtCurrent = displayedPointsAtCurrent / loyaltyMultiplier;
  const basePointsNeededForNextLevel = displayedPointsAtNextLevel / loyaltyMultiplier;

  const pointsRemaining = basePointsNeededForNextLevel - basePointsAtCurrent;
  const { level: baseLevel, percent: basePercent } = levelPercentFromPoints(skill, vocation, basePointsAtCurrent);

  const perCharge = SKILL_CONFIG[skill].pointsPerCharge * (useSpecialDummy ? SPECIAL_DUMMY_EFFICIENCY : 1);

  // Points to reach the next WHOLE base level (baseLevel + 1) — the real
  // training milestone. With no Loyalty this equals pointsRemaining; with
  // Loyalty it's smaller, because the in-game level is inflated ahead of the
  // real one.
  const pointsRemainingBase = Math.max(0, totalPointsAtLevel(skill, vocation, baseLevel + 1) - basePointsAtCurrent);

  return {
    baseLevel,
    basePercent,
    pointsRemaining,
    chargesNormal: Math.ceil(pointsRemaining / perCharge),
    chargesDoubleEvent: Math.ceil(pointsRemaining / perCharge / 2),
    pointsRemainingBase,
    chargesNormalBase: Math.ceil(pointsRemainingBase / perCharge),
    chargesDoubleEventBase: Math.ceil(pointsRemainingBase / perCharge / 2),
  };
}

/** A Lasting Exercise weapon (the largest purchasable tier) has this many charges. */
export const LASTING_EXERCISE_CHARGES = 14400;

export interface SkillTargetResult {
  /** Nível-alvo, em nível BASE (skill real, sem a inflação da Loyalty). */
  targetLevel: number;
  /** Nível base atual, calculado a partir do nível/% do jogo. */
  baseLevel: number;
  /** Pontos (hits, ou mana no Magic Level) que faltam até lá. */
  pointsRemaining: number;
  chargesNormal: number;
  chargesDoubleEvent: number;
  lastingNormal: number;
  lastingDoubleEvent: number;
}

/**
 * Quantas Lasting Exercise faltam para chegar a um nível-alvo, em vez de só
 * ao nível seguinte.
 *
 * O alvo é um nível BASE — o skill real, sem a inflação da Loyalty. É assim
 * que se pensa num objetivo de treino ("quero ter magic 100 a sério"), e é
 * também o único número que não muda quando a Loyalty da conta sobe.
 *
 * Por isso só o lado ESQUERDO da subtração leva conversão: o nível atual vem
 * do jogo e está inflacionado, portanto divide-se pelo multiplicador para o
 * trazer para pontos reais; o alvo já é base e entra tal como está.
 *
 * Devolve null quando o alvo não está à frente do nível base atual — não há
 * nada para calcular, e mostrar zero varinhas seria enganador.
 */
export function calculateTrainingToTarget(
  skill: TrainableSkill,
  vocation: Vocation,
  displayedCurrentLevel: number,
  displayedCurrentPercent: number,
  targetLevel: number,
  useSpecialDummy: boolean,
  loyaltyBonusPercent: number
): SkillTargetResult | null {
  const loyaltyMultiplier = 1 + loyaltyBonusPercent / 100;

  const pointsForNextDisplayedLevel = pointsForNextLevel(skill, vocation, displayedCurrentLevel);
  const displayedPointsAtCurrent =
    totalPointsAtLevel(skill, vocation, displayedCurrentLevel) + (displayedCurrentPercent / 100) * pointsForNextDisplayedLevel;

  const basePointsAtCurrent = displayedPointsAtCurrent / loyaltyMultiplier;
  const { level: baseLevel } = levelPercentFromPoints(skill, vocation, basePointsAtCurrent);

  if (targetLevel <= baseLevel) return null;

  const basePointsAtTarget = totalPointsAtLevel(skill, vocation, targetLevel);
  const pointsRemaining = Math.max(0, basePointsAtTarget - basePointsAtCurrent);

  const perCharge = SKILL_CONFIG[skill].pointsPerCharge * (useSpecialDummy ? SPECIAL_DUMMY_EFFICIENCY : 1);
  const chargesNormal = Math.ceil(pointsRemaining / perCharge);
  const chargesDoubleEvent = Math.ceil(pointsRemaining / perCharge / 2);

  return {
    targetLevel,
    baseLevel,
    pointsRemaining,
    chargesNormal,
    chargesDoubleEvent,
    lastingNormal: Math.ceil(chargesNormal / LASTING_EXERCISE_CHARGES),
    lastingDoubleEvent: Math.ceil(chargesDoubleEvent / LASTING_EXERCISE_CHARGES),
  };
}

