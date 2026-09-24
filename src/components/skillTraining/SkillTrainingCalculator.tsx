import {
  calculateSkillTraining,
  LASTING_EXERCISE_CHARGES,
  LOYALTY_BONUS_OPTIONS,
  minSkillLevel,
  SKILL_LABELS,
  VOCATION_LABELS,
  VOCATION_SKILLS,
  type TrainableSkill,
  type Vocation,
} from '../../domain/skillTraining';
import { parseNonNegativeInteger, parsePercentMissing } from '../../domain/validation';
import type { PlayerMeta } from '../../constants/players';
import { useCharacterVocation } from '../../hooks/useCharacterVocation';
import { useSkillTrainingConfig } from '../../hooks/useSkillTrainingConfig';
import type { SkillEntryInput } from '../../storage/skillTrainingStorage';
import { Icon } from '../shell/icons';
import { SkillTrainingRow } from './SkillTrainingRow';

interface SkillTrainingCalculatorProps {
  player: PlayerMeta;
}

const VOCATIONS: Vocation[] = ['knight', 'paladin', 'sorcerer', 'druid', 'monk'];
const KNIGHT_WEAPONS: ('axe' | 'sword' | 'club')[] = ['axe', 'sword', 'club'];
const EMPTY_ENTRY: SkillEntryInput = { level: '', percent: '' };

/** Which skills should get a row, given the vocation and (for Knight) chosen weapons.
 * Knights only train weapon + Magic Level here — Shielding is intentionally left out. */
function activeSkills(vocation: Vocation, knightWeapons: ('axe' | 'sword' | 'club')[]): TrainableSkill[] {
  if (vocation !== 'knight') return VOCATION_SKILLS[vocation];
  return [...knightWeapons, 'magic'];
}

export function SkillTrainingCalculator({ player }: SkillTrainingCalculatorProps) {
  const accentColor = player.accentColor;
  const { vocation, loading, detect, setManualVocation } = useCharacterVocation(player.id, player.name);
  const { config, updateConfig } = useSkillTrainingConfig(player.id);

  function toggleKnightWeapon(weapon: 'axe' | 'sword' | 'club') {
    updateConfig((current) => {
      const has = current.knightWeapons.includes(weapon);
      return {
        ...current,
        knightWeapons: has ? current.knightWeapons.filter((w) => w !== weapon) : [...current.knightWeapons, weapon],
      };
    });
  }

  function toggleSpecialDummy() {
    updateConfig((current) => ({ ...current, specialDummy: !current.specialDummy }));
  }

  function setLoyaltyBonus(loyaltyBonusPercent: number) {
    updateConfig((current) => ({ ...current, loyaltyBonusPercent }));
  }

  function setSkillEntry(skill: TrainableSkill, entry: SkillEntryInput) {
    updateConfig((current) => ({ ...current, skills: { ...current.skills, [skill]: entry } }));
  }

  const skills = vocation ? activeSkills(vocation, config.knightWeapons) : [];

  // Cheapest skill to gain its next REAL (base) level — the quick win the user
  // should train first. Only skills with valid input count; needs ≥2 to compare.
  const cheapestBase = vocation
    ? skills
        .map((skill) => {
          const entry = config.skills[skill] ?? EMPTY_ENTRY;
          const level = parseNonNegativeInteger(entry.level, 'o nível');
          const percent = parsePercentMissing(entry.percent);
          if (!level.ok || !percent.ok || level.value < minSkillLevel(skill)) return null;
          const result = calculateSkillTraining(
            skill,
            vocation,
            level.value,
            100 - percent.value,
            config.specialDummy,
            config.loyaltyBonusPercent
          );
          return { skill, wands: Math.ceil(result.chargesNormalBase / LASTING_EXERCISE_CHARGES) };
        })
        .filter((row): row is { skill: TrainableSkill; wands: number } => row !== null)
        .sort((a, b) => a.wands - b.wands)
    : [];

  return (
    <div>
      <div className="hunt-form__field" style={{ marginBottom: 14 }}>
        <label>Vocação</label>
        {loading && <p className="vazio">A detetar a vocação do {player.name}…</p>}

        {!loading && vocation && (
          <p className="skill-training-vocation">
            <span style={{ color: accentColor, fontWeight: 'bold' }}>{VOCATION_LABELS[vocation]}</span>
            <button
              type="button"
              className="btn sm skill-training-vocation__refresh"
              onClick={() => detect()}
              title="Voltar a detetar"
            >
              <Icon name="atualizar" size={14} />
              <span>Detetar</span>
            </button>
          </p>
        )}

        {!loading && !vocation && (
          <>
            <p className="field-error">
              Não foi possível detetar a vocação do {player.name} automaticamente. Escolhe manualmente:
            </p>
            <div className="seg">
              {VOCATIONS.map((v) => (
                <button key={v} type="button" onClick={() => setManualVocation(v)}>
                  {VOCATION_LABELS[v]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {vocation === 'knight' && (
        <div className="hunt-form__field" style={{ marginBottom: 14 }}>
          <label>Arma(s) a treinar</label>
          <div className="seg">
            {KNIGHT_WEAPONS.map((weapon) => (
              <button
                key={weapon}
                type="button"
                aria-pressed={config.knightWeapons.includes(weapon)}
                className={config.knightWeapons.includes(weapon) ? 'on' : undefined}
                onClick={() => toggleKnightWeapon(weapon)}
              >
                {weapon === 'axe' ? 'Axe' : weapon === 'sword' ? 'Sword' : 'Club'}
              </button>
            ))}
          </div>
        </div>
      )}

      {vocation && (
        <>
          <label className="skill-training-dummy-toggle">
            <input type="checkbox" checked={config.specialDummy} onChange={toggleSpecialDummy} />
            Dummy especial (Monk/Demon/Ferumbras Exercise Dummy, +10% eficiência)
          </label>

          {/* Onze botões numa fila que dava três linhas. Um seletor curto diz a
              mesma coisa numa linha — é o que a identidade comum pede em vez
              de filas de botões. */}
          <div className="hunt-form__field" style={{ marginBottom: 14, maxWidth: 260 }}>
            <label htmlFor={`loyalty-${player.id}`}>Loyalty da conta</label>
            <select
              id={`loyalty-${player.id}`}
              className="selc"
              value={config.loyaltyBonusPercent}
              onChange={(event) => setLoyaltyBonus(Number(event.target.value))}
            >
              {LOYALTY_BONUS_OPTIONS.map((bonus) => (
                <option key={bonus} value={bonus}>
                  {bonus}%
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {vocation === 'knight' && skills.length === 0 && (
        <p className="vazio">Seleciona pelo menos uma arma para o Knight treinar.</p>
      )}

      {vocation && skills.length > 0 && (
        <div className="saved-hunts-list">
          {skills.map((skill) => (
            <SkillTrainingRow
              key={skill}
              skill={skill}
              vocation={vocation}
              entry={config.skills[skill] ?? EMPTY_ENTRY}
              specialDummy={config.specialDummy}
              loyaltyBonusPercent={config.loyaltyBonusPercent}
              onChange={(entry) => setSkillEntry(skill, entry)}
              accentColor={accentColor}
            />
          ))}
        </div>
      )}

      {cheapestBase.length >= 2 && (
        <p className="skill-training-cheapest">
          <Icon name="dica" size={16} />
          Mais barato de subir primeiro (o nível base, sem Loyalty):{' '}
          <strong style={{ color: accentColor }}>{SKILL_LABELS[cheapestBase[0].skill]}</strong> —{' '}
          {cheapestBase[0].wands} Lasting Exercise ({cheapestBase
            .slice(1)
            .map((row) => `${SKILL_LABELS[row.skill]}: ${row.wands}`)
            .join(', ')}
          ).
        </p>
      )}
    </div>
  );
}
