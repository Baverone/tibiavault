import { useEffect, useImperativeHandle, useState, forwardRef } from 'react';
import { useCountdownTimer, type TimerAlert } from '../../hooks/useCountdownTimer';
import { announce, playBeep } from '../../domain/timers/alerts';
import { formatTimerMinutes, parseTimerMinutes } from '../../domain/timers/duration';

interface TimerCardProps {
  name: string;
  durationSeconds: number;
  color: string;
  /** Voice announcements at specific points during the countdown (e.g. "1 minute left"). Optional. */
  alerts?: readonly TimerAlert[];
  /** Spoken when the timer hits zero — defaults to "{name} terminado". */
  finishMessage?: string;
  /**
   * Tempo à escolha (o Boost): com isto o cartão ganha um campo de minutos e
   * um botão com o tempo pré-definido. Só se muda com o timer parado ou em
   * pausa — mudar reinicia-o, e a meio de um ciclo isso era perder a contagem
   * sem dar por isso.
   */
  durationChoice?: {
    presetMinutes: number;
    onChange: (minutes: number) => void;
  };
}

export interface TimerCardHandle {
  start: () => void;
}

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export const TimerCard = forwardRef<TimerCardHandle, TimerCardProps>(function TimerCard(
  { name, durationSeconds, color, alerts, finishMessage, durationChoice },
  ref
) {
  const timer = useCountdownTimer({
    durationSeconds,
    alerts,
    onFinish: () => {
      playBeep();
      announce(finishMessage ?? `${name} terminado`);
    },
    // Os avisos a meio (ex.: «faltam 30 segundos»): um por ciclo, mesmo com
    // tiques atrasados, e sem repetir ao retomar uma pausa — ver countdown.ts.
    onAlert: (alert) => announce(alert.message),
  });

  useImperativeHandle(ref, () => ({ start: timer.start }));

  const progress = timer.remainingMs / (durationSeconds * 1000);
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className="timer-card">
      <div className="timer-card__ring-wrap">
        <svg viewBox="0 0 120 120" className="timer-card__ring">
          <circle cx={60} cy={60} r={RADIUS} className="timer-card__ring-track" />
          <circle
            cx={60}
            cy={60}
            r={RADIUS}
            stroke={color}
            className="timer-card__ring-progress"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="timer-card__center">
          {timer.justFinished ? (
            <span className="timer-card__finished">Terminado!</span>
          ) : (
            <span className="timer-card__time">{formatClock(timer.remainingMs)}</span>
          )}
        </div>
      </div>
      <h4 style={{ color }}>{name}</h4>
      {durationChoice && (
        <DurationChoice
          name={name}
          minutes={durationSeconds / 60}
          presetMinutes={durationChoice.presetMinutes}
          locked={timer.isRunning || timer.justFinished}
          color={color}
          onChange={durationChoice.onChange}
        />
      )}
      <div className="timer-card__actions">
        <button type="button" style={{ borderColor: color, color }} onClick={timer.toggle} disabled={timer.justFinished}>
          {timer.isRunning ? 'Pausar' : 'Iniciar'}
        </button>
        <button type="button" className="timer-card__reset" onClick={timer.reset}>
          Reiniciar
        </button>
      </div>
    </div>
  );
});

function DurationChoice({
  name,
  minutes,
  presetMinutes,
  locked,
  color,
  onChange,
}: {
  name: string;
  minutes: number;
  presetMinutes: number;
  locked: boolean;
  color: string;
  onChange: (minutes: number) => void;
}) {
  const [text, setText] = useState(formatTimerMinutes(minutes));
  // Volta a mostrar a duração em vigor quando ela muda por outro lado (o
  // botão pré-definido) — e ao sair do campo com um valor que não serve.
  useEffect(() => setText(formatTimerMinutes(minutes)), [minutes]);

  function apply() {
    const parsed = parseTimerMinutes(text);
    if (parsed === null) setText(formatTimerMinutes(minutes));
    else if (parsed !== minutes) onChange(parsed);
  }

  const lockedTitle = locked ? 'Pausa ou reinicia o timer para mudar o tempo' : undefined;
  const invalid = text.trim() !== '' && parseTimerMinutes(text) === null;

  return (
    <div className="timer-card__duration" title={lockedTitle}>
      <input
        type="text"
        inputMode="numeric"
        aria-label={`Minutos do ${name} (ex.: 45 ou 1:30)`}
        className={invalid ? 'invalido' : undefined}
        value={text}
        disabled={locked}
        onChange={(event) => setText(event.target.value)}
        onBlur={apply}
        onKeyDown={(event) => {
          if (event.key === 'Enter') apply();
        }}
      />
      <span className="timer-card__unit">min</span>
      <button
        type="button"
        disabled={locked || minutes === presetMinutes}
        style={minutes === presetMinutes ? { borderColor: color, color } : undefined}
        onClick={() => onChange(presetMinutes)}
        aria-label={`${name}: ${presetMinutes} minutos`}
      >
        {presetMinutes}m
      </button>
    </div>
  );
}
