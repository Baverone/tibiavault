import { useId } from 'react';
import {
  calculateSkillTraining,
  calculateTrainingToTarget,
  LASTING_EXERCISE_CHARGES,
  minSkillLevel,
  SKILL_LABELS,
  type TrainableSkill,
  type Vocation,
} from '../../domain/skillTraining';
import { parseNonNegativeInteger, parsePercentMissing } from '../../domain/validation';
import type { SkillEntryInput } from '../../storage/skillTrainingStorage';
import '../../styles/skillTraining.css';

interface SkillTrainingRowProps {
  skill: TrainableSkill;
  vocation: Vocation;
  entry: SkillEntryInput;
  specialDummy: boolean;
  loyaltyBonusPercent: number;
  onChange: (entry: SkillEntryInput) => void;
  accentColor: string;
}

const lastingFormatter = new Intl.NumberFormat('pt-PT');
const pointsFormatter = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0 });

export function SkillTrainingRow({
  skill,
  vocation,
  entry,
  specialDummy,
  loyaltyBonusPercent,
  onChange,
  accentColor,
}: SkillTrainingRowProps) {
  const minLevel = minSkillLevel(skill);
  // 20/10/2026: os <label> não estavam ligados aos <input> e um leitor de ecrã
  // lia só «ex: 10». O `useId` dá ids únicos com as duas personagens e as
  // várias skills na mesma página.
  const fieldId = useId();

  const levelResult = parseNonNegativeInteger(entry.level, 'o nível');
  const percentMissingResult = parsePercentMissing(entry.percent);

  const levelError =
    entry.level.trim() !== '' && levelResult.ok && levelResult.value < minLevel
      ? `${SKILL_LABELS[skill]} começa no nível ${minLevel}.`
      : null;

  const canCalculate = levelResult.ok && percentMissingResult.ok && !levelError;

  const result =
    canCalculate && levelResult.ok && percentMissingResult.ok
      ? calculateSkillTraining(
          skill,
          vocation,
          levelResult.value,
          100 - percentMissingResult.value,
          specialDummy,
          loyaltyBonusPercent
        )
      : null;

  const lastingNormal = result ? Math.ceil(result.chargesNormal / LASTING_EXERCISE_CHARGES) : 0;
  const lastingDoubleEvent = result ? Math.ceil(result.chargesDoubleEvent / LASTING_EXERCISE_CHARGES) : 0;
  const lastingNormalBase = result ? Math.ceil(result.chargesNormalBase / LASTING_EXERCISE_CHARGES) : 0;
  const lastingDoubleEventBase = result ? Math.ceil(result.chargesDoubleEventBase / LASTING_EXERCISE_CHARGES) : 0;

  const targetResult = parseNonNegativeInteger(entry.target ?? '', 'o nível objetivo');
  const targetTyped = (entry.target ?? '').trim() !== '';

  // O objetivo é comparado com o nível BASE, não com o que aparece no jogo:
  // com Loyalty, o número do jogo vai à frente do skill real.
  const targetTooLow = targetTyped && targetResult.ok && result !== null && targetResult.value <= result.baseLevel;

  const toTarget =
    canCalculate && levelResult.ok && percentMissingResult.ok && targetTyped && targetResult.ok && !targetTooLow
      ? calculateTrainingToTarget(
          skill,
          vocation,
          levelResult.value,
          100 - percentMissingResult.value,
          targetResult.value,
          specialDummy,
          loyaltyBonusPercent
        )
      : null;

  // A primeira mensagem que houver, por ordem de importância. Estava escrito
  // como uma cadeia de `??` sobre ternários que devolviam '' — e como '' não é
  // nullish, o `??` parava aí: um nível válido com uma percentagem inválida
  // mostrava uma caixa de erro vermelha vazia, sem dizer o que estava mal.
  const mensagemErro =
    levelError ??
    (entry.level.trim() !== '' && !levelResult.ok ? levelResult.error : null) ??
    (entry.percent.trim() !== '' && !percentMissingResult.ok ? percentMissingResult.error : null);

  const hasLoyalty = loyaltyBonusPercent > 0;
  const displayedLevel = levelResult.ok ? levelResult.value : 0;
  const displayedMissing = percentMissingResult.ok ? percentMissingResult.value : 0;

  return (
    <div className="saved-hunt-card">
      <div className="saved-hunt-card__header">
        <h4 style={{ color: accentColor }}>{SKILL_LABELS[skill]}</h4>
      </div>

      <div className="hunt-form" style={{ marginTop: 10 }}>
        <div className="hunt-form__field">
          <label htmlFor={`${fieldId}-level`}>Nível atual</label>
          <input
            id={`${fieldId}-level`}
            type="text"
            inputMode="numeric"
            placeholder={`ex: ${minLevel}`}
            value={entry.level}
            onChange={(e) => onChange({ ...entry, level: e.target.value })}
          />
        </div>
        <div className="hunt-form__field">
          <label htmlFor={`${fieldId}-percent`}>% que falta para o próximo nível</label>
          <input
            id={`${fieldId}-percent`}
            type="text"
            inputMode="decimal"
            placeholder="ex: 67.5"
            value={entry.percent}
            onChange={(e) => onChange({ ...entry, percent: e.target.value })}
          />
        </div>
        <div className="hunt-form__field">
          <label htmlFor={`${fieldId}-target`}>Nível objetivo — base, sem Loyalty (opcional)</label>
          <input
            id={`${fieldId}-target`}
            type="text"
            inputMode="numeric"
            placeholder={result ? `ex: ${result.baseLevel + 10}` : 'ex: 100'}
            value={entry.target ?? ''}
            onChange={(e) => onChange({ ...entry, target: e.target.value })}
          />
        </div>
      </div>

      {mensagemErro && <p className="field-error">{mensagemErro}</p>}

      {result && hasLoyalty && (
        <p className="skill-training-base-hint">
          <strong>No jogo (com Loyalty):</strong> nível {displayedLevel}, faltam {displayedMissing}% para {displayedLevel + 1}.
          <br />
          <strong>Nível base real (sem Loyalty):</strong> {result.baseLevel}, faltam {(100 - result.basePercent).toFixed(2)}% para{' '}
          {result.baseLevel + 1} — é a partir daqui que o treino conta; a Loyalty só infla o número mostrado, não acelera o treino real.
        </p>
      )}

      {targetTooLow && result && (
        <p className="field-error">
          O objetivo tem de ser maior do que o nível base atual ({result.baseLevel})
          {hasLoyalty ? ` — no jogo vês ${displayedLevel}, mas o skill real é ${result.baseLevel}.` : '.'}
        </p>
      )}
      {targetTyped && !targetResult.ok && <p className="field-error">{!targetResult.ok ? targetResult.error : ''}</p>}

      {toTarget && (
        <div className="skill-training-target">
          <span className="skill-training-target__label">
            Do nível base {toTarget.baseLevel} até ao {toTarget.targetLevel}
          </span>
          <span className="skill-training-target__value" style={{ color: accentColor }}>
            {lastingFormatter.format(toTarget.lastingNormal)} Lasting Exercise
          </span>
          <span className="skill-training-target__detail">
            {lastingFormatter.format(toTarget.lastingDoubleEvent)} com Double Skill Event ·{' '}
            {pointsFormatter.format(Math.ceil(toTarget.pointsRemaining))}{' '}
            {skill === 'magic' ? 'de mana' : 'hits'} · {lastingFormatter.format(toTarget.chargesNormal)} cargas
          </span>
        </div>
      )}

      {result && (
        <table className="hunt-scenario-table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Lasting Exercise necessárias</th>
              <th>Sem evento</th>
              <th>Com Double Skill Event</th>
            </tr>
          </thead>
          <tbody>
            {hasLoyalty && (
              <tr>
                <td>
                  No jogo, com Loyalty ({displayedLevel}→{displayedLevel + 1})
                </td>
                <td>{lastingFormatter.format(lastingNormal)}</td>
                <td>{lastingFormatter.format(lastingDoubleEvent)}</td>
              </tr>
            )}
            <tr>
              <td>
                {hasLoyalty
                  ? `Nível base, sem Loyalty (${result.baseLevel}→${result.baseLevel + 1})`
                  : `Nível ${displayedLevel}→${displayedLevel + 1}`}
              </td>
              <td>{lastingFormatter.format(hasLoyalty ? lastingNormalBase : lastingNormal)}</td>
              <td>{lastingFormatter.format(hasLoyalty ? lastingDoubleEventBase : lastingDoubleEvent)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
