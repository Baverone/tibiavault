import { useEffect, useState } from 'react';
import {
  depleteStamina,
  formatDuration,
  formatStamina,
  GREEN_START_MIN,
  MAX_STAMINA_MIN,
  offlineMinutesToReach,
  parseDurationToMinutes,
  parseStaminaToMinutes,
  PENALTY_MIN,
  regenerateStamina,
  staminaZone,
} from '../../domain/stamina';

const clockFormatter = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' });
const dayTimeFormatter = new Intl.DateTimeFormat('pt-PT', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

/** 40h, 41h, 42h in minutes. */
const MILESTONES = [40 * 60, 41 * 60, 42 * 60];

/** Next occurrence of a clock time "HH:MM" at or after `now` (today, else tomorrow). */
function nextClockTime(raw: string, now: Date): Date | null {
  const trimmed = raw.trim();
  if (!/^\d{1,2}:\d{2}$/.test(trimmed)) return null;
  const [h, m] = trimmed.split(':').map(Number);
  if (h > 23 || m > 59) return null;
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target;
}

/** Formats a future instant: just "HH:MM" if it's still today, otherwise "seg, HH:MM". */
function formatWhen(instant: Date, now: Date): string {
  return instant.toDateString() === now.toDateString() ? clockFormatter.format(instant) : dayTimeFormatter.format(instant);
}

export function StaminaCalculator() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const [staminaInput, setStaminaInput] = useState('');
  const [huntTimeInput, setHuntTimeInput] = useState('');
  const [huntDurationInput, setHuntDurationInput] = useState('');

  const current = parseStaminaToMinutes(staminaInput);
  const staminaError = staminaInput.trim() !== '' && current === null;

  // A) stamina at a future hunt time (rest from now until then)
  const huntTime = nextClockTime(huntTimeInput, now);
  const restedMin = huntTime ? (huntTime.getTime() - now.getTime()) / 60000 : 0;
  const staminaAtHunt = current !== null && huntTime ? regenerateStamina(current, restedMin) : null;

  // B) times to reach 40h / 41h / 42h
  const milestones =
    current !== null
      ? MILESTONES.map((target) => {
          const offline = offlineMinutesToReach(current, target);
          return { target, offline, at: offline !== null ? new Date(now.getTime() + offline * 60000) : null };
        })
      : [];

  // C) stamina left after hunting for a given duration
  const huntDuration = parseDurationToMinutes(huntDurationInput);
  const staminaAfterHunt = current !== null && huntDuration !== null ? depleteStamina(current, huntDuration) : null;
  const lostGreen = current !== null && current >= GREEN_START_MIN && staminaAfterHunt !== null && staminaAfterHunt < GREEN_START_MIN;
  const entersPenalty =
    current !== null && current >= PENALTY_MIN && staminaAfterHunt !== null && staminaAfterHunt < PENALTY_MIN;

  return (
    <div className="card">
      <div className="hunt-form__field" style={{ maxWidth: 220 }}>
        <label htmlFor="stamina-current">Stamina atual (HH:MM)</label>
        <input
          id="stamina-current"
          type="text"
          placeholder="ex: 39:30"
          value={staminaInput}
          onChange={(e) => setStaminaInput(e.target.value)}
        />
      </div>
      {staminaError && <p className="field-error">Stamina inválida — usa HH:MM entre 0:00 e 42:00 (ex.: 39:30).</p>}
      {current !== null && (
        <p className="daily-simulation-note">
          {formatStamina(current)} — zona {staminaZone(current).label} ({staminaZone(current).xp} XP
          {current >= GREEN_START_MIN ? ', com Premium' : ''}).
        </p>
      )}

      {/* A) stamina at the next hunt's time */}
      <div className="saved-hunt-card" style={{ marginTop: 14 }}>
        <div className="saved-hunt-card__header">
          <h4>Stamina à hora da próxima hunt</h4>
        </div>
        <div className="hunt-form__field" style={{ maxWidth: 220, marginTop: 8 }}>
          <label htmlFor="stamina-hunt-time">Hora da hunt (HH:MM)</label>
          <input
            id="stamina-hunt-time"
            type="text"
            inputMode="numeric"
            placeholder="ex: 21:00"
            value={huntTimeInput}
            onChange={(e) => setHuntTimeInput(e.target.value)}
          />
        </div>
        {huntTimeInput.trim() !== '' && !huntTime && <p className="field-error">Hora inválida — usa HH:MM (00:00 a 23:59).</p>}
        {current === null && huntTimeInput.trim() !== '' && (
          <p className="daily-simulation-note">Indica primeiro a stamina atual.</p>
        )}
        {staminaAtHunt !== null && huntTime && (
          <p className="daily-simulation-summary">
            Às <strong>{formatWhen(huntTime, now)}</strong> terás <strong>{formatStamina(staminaAtHunt)}</strong> de stamina —
            descansaste {formatDuration(restedMin)}. Zona {staminaZone(staminaAtHunt).label} ({staminaZone(staminaAtHunt).xp} XP).
          </p>
        )}
      </div>

      {/* B) when you reach 40h / 41h / 42h */}
      <div className="saved-hunt-card" style={{ marginTop: 14 }}>
        <div className="saved-hunt-card__header">
          <h4>Quando chegas a 40h / 41h / 42h</h4>
        </div>
        {current === null ? (
          <p className="daily-simulation-note">Indica a stamina atual para veres as horas.</p>
        ) : (
          <table className="hunt-scenario-table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Objetivo</th>
                <th>A que horas</th>
                <th>Falta</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map(({ target, offline, at }) => (
                <tr key={target}>
                  <td>
                    {formatStamina(target)}
                    {target === MAX_STAMINA_MIN ? ' (full)' : ''}
                  </td>
                  <td>{at ? formatWhen(at, now) : 'já atingido'}</td>
                  <td>{offline !== null ? formatDuration(offline) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* C) stamina after hunting for a duration */}
      <div className="saved-hunt-card" style={{ marginTop: 14 }}>
        <div className="saved-hunt-card__header">
          <h4>Stamina depois de caçar</h4>
        </div>
        <div className="hunt-form__field" style={{ maxWidth: 220, marginTop: 8 }}>
          <label htmlFor="stamina-hunt-duration">Duração da caçada</label>
          <input
            id="stamina-hunt-duration"
            type="text"
            inputMode="decimal"
            placeholder="ex: 3 ou 3:30"
            value={huntDurationInput}
            onChange={(e) => setHuntDurationInput(e.target.value)}
          />
        </div>
        {huntDurationInput.trim() !== '' && huntDuration === null && (
          <p className="field-error">Duração inválida — usa horas (ex.: 3) ou HH:MM (ex.: 3:30).</p>
        )}
        {current === null && huntDurationInput.trim() !== '' && (
          <p className="daily-simulation-note">Indica primeiro a stamina atual.</p>
        )}
        {staminaAfterHunt !== null && huntDuration !== null && (
          <p className="daily-simulation-summary">
            Depois de <strong>{formatDuration(huntDuration)}</strong> de caçada terás{' '}
            <strong>{formatStamina(staminaAfterHunt)}</strong> de stamina — zona {staminaZone(staminaAfterHunt).label} (
            {staminaZone(staminaAfterHunt).xp} XP).
            {lostGreen && ' Perdes o bónus verde (39h) durante a caçada.'}
            {entersPenalty && ' Entras na zona de penalização (abaixo de 14h).'}
          </p>
        )}
      </div>

      {/* As regras do TibiaWiki (1 min por cada 3 até às 39h, por cada 6 entre
          as 39h e as 42h, 10 min de espera) passaram para o «Como ler esta
          página»: são quatro linhas que se leem uma vez e depois são só
          distância até ao fim. O que fica é o que muda — a hora do relógio. */}
      <p className="daily-simulation-note" style={{ marginTop: 14 }}>
        As horas usam o relógio do teu dispositivo — agora são {clockFormatter.format(now)}.
      </p>
    </div>
  );
}
