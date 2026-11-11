/**
 * Anúncio «emoldurado» por bips (pedido do André a 11/11/2026, para o Pot
 * Skills): bips durante N segundos, depois a voz, e mais N segundos de bips
 * quando a voz acaba. A sequência vive aqui, sem `window`, para ter testes; o
 * som e a voz a sério estão em `alerts.ts`.
 */

/** Intervalo entre o início de dois bips seguidos, em segundos. */
export const BEEP_INTERVAL_SECONDS = 0.25;

/** Os momentos (em segundos, a contar do início) de cada bip de uma rajada. */
export function beepOffsets(seconds: number): number[] {
  const count = Math.max(1, Math.round(seconds / BEEP_INTERVAL_SECONDS));
  return Array.from({ length: count }, (_, i) => Number((i * BEEP_INTERVAL_SECONDS).toFixed(2)));
}

export interface FramedAlertDeps {
  /** Toca bips durante `seconds` segundos. */
  beep: (seconds: number) => void;
  /** Fala `text` e chama `onDone` uma vez quando acabar (ou falhar). */
  speak: (text: string, onDone: () => void) => void;
  /** Chama `fn` daqui a `ms` milissegundos. */
  wait: (ms: number, fn: () => void) => void;
}

export function framedAnnouncement(text: string, seconds: number, deps: FramedAlertDeps): void {
  deps.beep(seconds);
  deps.wait(seconds * 1000, () => deps.speak(text, () => deps.beep(seconds)));
}

/**
 * Quanto se espera pelo fim da voz antes de desistir dele. O Chrome às vezes
 * não manda o `onend` (voz bloqueada, separador em segundo plano); sem isto os
 * bips do fim nunca tocavam. ~0,12 s por letra cobre o pt-PT a velocidade
 * normal, com 2 s de folga.
 */
export function speechFallbackMs(text: string): number {
  return Math.max(3000, text.length * 120) + 2000;
}

/** Devolve uma função que só corre `fn` na primeira chamada. */
export function once(fn: () => void): () => void {
  let done = false;
  return () => {
    if (done) return;
    done = true;
    fn();
  };
}
