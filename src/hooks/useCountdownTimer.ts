import { useEffect, useMemo, useRef, useState } from 'react';
import { dueEvents, pauseWithEvents, runningState, viewAt, type TimerConfig, type TimerState } from '../domain/timers/countdown';
import { subscribeTicks } from './ticker';

const FINISHED_DISPLAY_MS = 3000;

export interface TimerAlert {
  /** Fires once per cycle, when the remaining time passes this many seconds. */
  atSeconds: number;
  message: string;
}

const NO_ALERTS: readonly TimerAlert[] = [];

interface CountdownOptions {
  durationSeconds: number;
  alerts?: readonly TimerAlert[];
  onFinish: () => void;
  onAlert?: (alert: TimerAlert) => void;
}

export interface CountdownTimer {
  remainingMs: number;
  isRunning: boolean;
  justFinished: boolean;
  start: () => void;
  toggle: () => void;
  reset: () => void;
}

/**
 * A countdown that runs in a continuous loop: on reaching zero it fires
 * onFinish, shows «Terminado!» for a few seconds, then starts the next cycle
 * on its own until paused.
 *
 * 02/11/2026: the cycle maths moved to `domain/timers/countdown.ts` (anchored
 * to the real end time, alerts detected as moments passed between ticks) and
 * the ticks to a Web Worker (`ticker.ts`) — with the browser minimised the old
 * page interval woke once a minute, the Plasma drifted ~77 s per cycle and the
 * 30-second warning was almost never spoken. This hook only keeps the state and
 * turns the events between two ticks into callbacks.
 */
export function useCountdownTimer({
  durationSeconds,
  alerts = NO_ALERTS,
  onFinish,
  onAlert,
}: CountdownOptions): CountdownTimer {
  const config = useMemo<TimerConfig>(
    () => ({
      durationMs: durationSeconds * 1000,
      finishedMs: FINISHED_DISPLAY_MS,
      alertsAtMs: alerts.map((alert) => alert.atSeconds * 1000),
    }),
    [durationSeconds, alerts]
  );
  const [state, setState] = useState<TimerState>({ kind: 'stopped' });
  const [now, setNow] = useState(() => Date.now());
  const lastTickRef = useRef(0);
  const callbacksRef = useRef({ onFinish, onAlert, alerts });
  callbacksRef.current = { onFinish, onAlert, alerts };

  useEffect(() => {
    if (state.kind !== 'running') return;
    return subscribeTicks(() => {
      const t = Date.now();
      const { onFinish: finish, onAlert: alert, alerts: list } = callbacksRef.current;
      for (const event of dueEvents(config, state, lastTickRef.current, t)) {
        if (event.kind === 'finish') finish();
        else {
          const which = list.find((a) => a.atSeconds * 1000 === event.alertAtMs);
          if (which) alert?.(which);
        }
      }
      lastTickRef.current = t;
      setNow(t);
    });
  }, [state, config]);

  // A duração mudou (o Boost tem tempo à escolha): o ciclo em curso foi
  // contado com a antiga, por isso o timer volta ao início com a nova.
  const durationRef = useRef(durationSeconds);
  useEffect(() => {
    if (durationRef.current === durationSeconds) return;
    durationRef.current = durationSeconds;
    setState({ kind: 'stopped' });
  }, [durationSeconds]);

  const view = viewAt(config, state, now);

  function start() {
    if (state.kind === 'running') return;
    const t = Date.now();
    lastTickRef.current = t;
    setNow(t);
    setState(runningState(config, t, state));
  }

  function toggle() {
    if (state.kind === 'running') {
      if (view.justFinished) return;
      const t = Date.now();
      const paused = pauseWithEvents(config, state, lastTickRef.current, t);
      lastTickRef.current = t;
      const { onFinish: finish, onAlert: alert, alerts: list } = callbacksRef.current;
      for (const event of paused.events) {
        if (event.kind === 'finish') finish();
        else {
          const which = list.find((a) => a.atSeconds * 1000 === event.alertAtMs);
          if (which) alert?.(which);
        }
      }
      setNow(t);
      setState(paused.state);
    } else {
      start();
    }
  }

  function reset() {
    setState({ kind: 'stopped' });
  }

  return {
    remainingMs: view.remainingMs,
    isRunning: state.kind === 'running' && !view.justFinished,
    justFinished: view.justFinished,
    start,
    toggle,
    reset,
  };
}
