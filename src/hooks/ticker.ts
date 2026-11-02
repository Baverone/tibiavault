/**
 * Um relógio de tiques partilhado pelos timers.
 *
 * 02/11/2026: os tiques vinham de um `setInterval` na página, e o Chrome
 * atrasa esses timers numa página escondida — com o browser minimizado há mais
 * de 5 minutos, um tique por minuto. Os timers de um Web Worker não entram nesse
 * travão, por isso o tique vem de um worker minúsculo (criado de um Blob, sem
 * ficheiro à parte). Sem Workers, volta ao `setInterval` — a conta em
 * `domain/timers/countdown.ts` aguenta tiques atrasados na mesma, só que os
 * avisos saem mais tarde.
 *
 * Também se dá um tique quando a página volta a ficar visível ou ganha o foco,
 * para o relógio não mostrar um valor velho no primeiro instante.
 *
 * Só corre enquanto há quem ouça: com todos os timers parados não há worker.
 */
const TICK_MS = 250;

type Listener = () => void;

const listeners = new Set<Listener>();
let stopSource: (() => void) | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function startSource(): () => void {
  let stopTicks: () => void;
  try {
    const url = URL.createObjectURL(
      new Blob([`setInterval(function () { postMessage(0); }, ${TICK_MS});`], { type: 'text/javascript' })
    );
    const worker = new Worker(url);
    worker.onmessage = emit;
    stopTicks = () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    };
  } catch {
    const id = setInterval(emit, TICK_MS);
    stopTicks = () => clearInterval(id);
  }

  document.addEventListener('visibilitychange', emit);
  window.addEventListener('focus', emit);
  return () => {
    stopTicks();
    document.removeEventListener('visibilitychange', emit);
    window.removeEventListener('focus', emit);
  };
}

/** Passa a receber tiques; devolve a função que deixa de os receber. */
export function subscribeTicks(listener: Listener): () => void {
  listeners.add(listener);
  if (!stopSource) stopSource = startSource();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && stopSource) {
      stopSource();
      stopSource = null;
    }
  };
}
