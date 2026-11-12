// Shared input-validation helpers. Every user-facing numeric field in the app
// should go through one of these so error messages stay consistent.

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * `Number('')` é 0, não NaN — e como estes parsers limpam espaços, pontos de
 * milhar e o símbolo de percentagem antes de converter, um input feito só
 * desses caracteres ("...", ",", "%") ficava vazio e passava como um zero
 * perfeitamente válido. Um zero que ninguém escreveu é pior do que um erro.
 */
function ficouVazio(normalized: string): boolean {
  return normalized === '';
}

/**
 * 12/11/2026 (proposta 4 da auditoria, decisão do André): o ponto só é aceite
 * como separador de milhares, em grupos de três ("1.500", "3.581.151.352").
 * Até aqui todos os pontos eram apagados, e "85.5" (quem quis dizer 85,5)
 * passava como 855 sem aviso nenhum.
 */
const PONTOS_DE_MILHAR = /^-?\d{1,3}(\.\d{3})+(,\d*)?$/;

/** Tira os espaços e, se os pontos estiverem nos milhares, deixa o número pronto para o `Number`. */
function normalizar(trimmed: string, fieldLabel: string): ValidationResult<string> {
  const semEspacos = trimmed.replace(/\s/g, '');
  if (semEspacos.includes('.') && !PONTOS_DE_MILHAR.test(semEspacos)) {
    return {
      ok: false,
      error: `${fieldLabel} tem um ponto fora do sítio: o ponto só separa milhares (1.500); para decimais usa a vírgula (2,5).`,
    };
  }
  return { ok: true, value: semEspacos.replace(/\./g, '').replace(',', '.') };
}

export function parseNonNegativeInteger(raw: string, fieldLabel: string): ValidationResult<number> {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { ok: false, error: `Introduz ${fieldLabel}.` };
  }

  const normalizado = normalizar(trimmed, fieldLabel);
  if (!normalizado.ok) return normalizado;
  const normalized = normalizado.value;
  const value = Number(normalized);

  if (ficouVazio(normalized) || !Number.isFinite(value)) {
    return { ok: false, error: `${fieldLabel} tem de ser um número válido.` };
  }
  if (value < 0) {
    return { ok: false, error: `${fieldLabel} não pode ser negativo.` };
  }
  if (!Number.isInteger(value)) {
    return { ok: false, error: `${fieldLabel} tem de ser um número inteiro.` };
  }

  return { ok: true, value };
}

export function parsePositiveNumber(raw: string, fieldLabel: string): ValidationResult<number> {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { ok: false, error: `Introduz ${fieldLabel}.` };
  }

  const normalizado = normalizar(trimmed, fieldLabel);
  if (!normalizado.ok) return normalizado;
  const normalized = normalizado.value;
  const value = Number(normalized);

  if (ficouVazio(normalized) || !Number.isFinite(value)) {
    return { ok: false, error: `${fieldLabel} tem de ser um número válido.` };
  }
  if (value <= 0) {
    return { ok: false, error: `${fieldLabel} tem de ser maior que zero.` };
  }

  return { ok: true, value };
}

/** Like parsePositiveNumber, but allows zero (e.g. "0 hours with boost" is valid). */
export function parseNonNegativeNumber(raw: string, fieldLabel: string): ValidationResult<number> {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { ok: false, error: `Introduz ${fieldLabel}.` };
  }

  const normalizado = normalizar(trimmed, fieldLabel);
  if (!normalizado.ok) return normalizado;
  const normalized = normalizado.value;
  const value = Number(normalized);

  if (ficouVazio(normalized) || !Number.isFinite(value)) {
    return { ok: false, error: `${fieldLabel} tem de ser um número válido.` };
  }
  if (value < 0) {
    return { ok: false, error: `${fieldLabel} não pode ser negativo.` };
  }

  return { ok: true, value };
}

/** Validates a skill "% into this level" value, as shown in-game (0 up to, but not including, 100). */
/** % still missing to reach the next level (100 = just started this level, 0 = about to level up). */
export function parsePercentMissing(raw: string): ValidationResult<number> {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { ok: false, error: 'Introduz a percentagem que falta.' };
  }

  const normalized = trimmed.replace(',', '.').replace('%', '');
  const value = Number(normalized);

  if (ficouVazio(normalized) || !Number.isFinite(value)) {
    return { ok: false, error: 'Percentagem tem de ser um número válido.' };
  }
  if (value < 0 || value > 100) {
    return { ok: false, error: 'Percentagem tem de estar entre 0 e 100.' };
  }

  return { ok: true, value };
}

export function validateLevelInRange(level: number, maxLevel: number): ValidationResult<number> {
  if (!Number.isInteger(level) || level < 1) {
    return { ok: false, error: 'Nível tem de ser um número inteiro >= 1.' };
  }
  if (level > maxLevel) {
    return { ok: false, error: `Nível não pode exceder ${maxLevel}.` };
  }
  return { ok: true, value: level };
}

/** Parses a free-form "1350, 1400 1500" list of goal levels into a sorted, deduplicated array. */
export function parseLevelList(raw: string, maxLevel: number): ValidationResult<number[]> {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { ok: false, error: 'Introduz pelo menos um nível objetivo.' };
  }

  const parts = trimmed.split(/[,;\s]+/).filter(Boolean);
  const levels: number[] = [];

  for (const part of parts) {
    const numberResult = parseNonNegativeInteger(part, 'cada nível objetivo');
    if (!numberResult.ok) return numberResult;

    const rangeResult = validateLevelInRange(numberResult.value, maxLevel);
    if (!rangeResult.ok) return rangeResult;

    levels.push(rangeResult.value);
  }

  return { ok: true, value: [...new Set(levels)].sort((a, b) => a - b) };
}

/** Caps the level-by-level plan table so it never renders an unreasonable number of rows. */
export const MAX_LEVEL_PLAN_STEPS = 500;

export function validateLevelPlanTarget(targetLevel: number, currentLevel: number, maxLevel: number): ValidationResult<number> {
  const rangeResult = validateLevelInRange(targetLevel, maxLevel);
  if (!rangeResult.ok) return rangeResult;

  if (targetLevel <= currentLevel) {
    return { ok: false, error: `O nível objetivo tem de ser maior que o nível atual (${currentLevel}).` };
  }
  if (targetLevel - currentLevel > MAX_LEVEL_PLAN_STEPS) {
    return {
      ok: false,
      error: `Diferença entre o nível atual e o objetivo é demasiado grande para a tabela nível-a-nível (máx. ${MAX_LEVEL_PLAN_STEPS} níveis). Escolhe um objetivo mais próximo.`,
    };
  }

  return { ok: true, value: targetLevel };
}

export function parseFutureDate(raw: string, fromDate: Date = new Date()): ValidationResult<Date> {
  if (raw.trim() === '') {
    return { ok: false, error: 'Escolhe uma data.' };
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: 'Data inválida.' };
  }

  const startOfToday = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  if (date.getTime() < startOfToday.getTime()) {
    return { ok: false, error: 'A data tem de ser hoje ou no futuro.' };
  }

  return { ok: true, value: date };
}
