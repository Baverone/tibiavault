// A conta dos timers em ciclo, sem React e sem relógio: tudo recebe o `now`.
//
// 02/11/2026: os timers falhavam com o browser minimizado. O Chrome acorda
// uma página escondida há mais de 5 minutos só uma vez por minuto, e o hook
// antigo (a) recomeçava o ciclo a contar de QUANDO o tique atrasado corria —
// cada ciclo do Plasma ficava ~77 s mais atrasado, ~7 min ao fim de 3 h — e
// (b) só via o aviso dos 30 s se um tique caísse dentro dos últimos 10 s, o
// que a um tique por minuto quase nunca acontecia. Aqui o ciclo é uma função
// do fim real (`endsAt`) e os avisos são momentos por onde se passou entre dois
// tiques, por mais espaçados que eles venham.

export interface TimerConfig {
  durationMs: number;
  /** Quanto tempo fica «Terminado!» antes de o ciclo seguinte começar. */
  finishedMs: number;
  /** Avisos a meio, em ms que faltam para o fim (ex.: 10 000 = a 10 s do fim). */
  alertsAtMs: readonly number[];
}

export type TimerState =
  | { kind: 'stopped' }
  | { kind: 'paused'; remainingMs: number }
  /** `endsAt`: o fim do PRIMEIRO ciclo desde que arrancou; os seguintes saem dele. */
  | { kind: 'running'; endsAt: number };

export interface TimerView {
  remainingMs: number;
  justFinished: boolean;
}

export interface TimerEvent {
  kind: 'alert' | 'finish';
  /** O momento em que devia ter acontecido (pode ser antes do tique que o viu). */
  at: number;
  /** Só nos avisos: qual dos `alertsAtMs`. */
  alertAtMs?: number;
}

function period(config: TimerConfig): number {
  return config.durationMs + config.finishedMs;
}

/** Arranca do zero, ou retoma uma pausa com o que faltava. */
export function runningState(config: TimerConfig, now: number, from?: TimerState): TimerState {
  const remaining = from?.kind === 'paused' && from.remainingMs > 0 ? from.remainingMs : config.durationMs;
  return { kind: 'running', endsAt: now + remaining };
}

/** Pausa um timer a correr, guardando o que falta. Outro estado fica como está. */
export function pausedState(config: TimerConfig, state: TimerState, now: number): TimerState {
  if (state.kind !== 'running') return state;
  return { kind: 'paused', remainingMs: viewAt(config, state, now).remainingMs };
}

/** O que o cartão mostra num dado instante. */
export function viewAt(config: TimerConfig, state: TimerState, now: number): TimerView {
  if (state.kind === 'stopped') return { remainingMs: config.durationMs, justFinished: false };
  if (state.kind === 'paused') return { remainingMs: state.remainingMs, justFinished: false };

  if (now < state.endsAt) return { remainingMs: state.endsAt - now, justFinished: false };
  const lastFinish = state.endsAt + Math.floor((now - state.endsAt) / period(config)) * period(config);
  if (now < lastFinish + config.finishedMs) return { remainingMs: 0, justFinished: true };
  return { remainingMs: lastFinish + period(config) - now, justFinished: false };
}

/**
 * O último momento da série `first + k·período` (k ≥ 0) que cai em
 * `(from, to]`, ou `null`.
 */
function lastInWindow(first: number, step: number, from: number, to: number): number | null {
  if (to < first) return null;
  const last = first + Math.floor((to - first) / step) * step;
  return last > from ? last : null;
}

/**
 * Os eventos por onde se passou entre dois tiques, `(from, to]`.
 *
 * - Se o fim passou, só o fim — e um só, mesmo que tenham passado vários
 *   ciclos (o portátil a dormir): um aviso «faltam 30 s» depois do fim já não
 *   serve a ninguém, e dez «terminado» seguidos também não.
 * - Senão, cada aviso por onde se passou, uma vez, mesmo que atrasado.
 */
export function dueEvents(config: TimerConfig, state: TimerState, from: number, to: number): TimerEvent[] {
  if (state.kind !== 'running' || to <= from) return [];
  const step = period(config);

  const finish = lastInWindow(state.endsAt, step, from, to);
  if (finish !== null) return [{ kind: 'finish', at: finish }];

  const alerts: TimerEvent[] = [];
  for (const alertAtMs of config.alertsAtMs) {
    if (alertAtMs <= 0 || alertAtMs >= config.durationMs) continue;
    const at = lastInWindow(state.endsAt - alertAtMs, step, from, to);
    if (at !== null) alerts.push({ kind: 'alert', at, alertAtMs });
  }
  return alerts.sort((a, b) => a.at - b.at);
}
