// O tempo de um timer escrito à mão (o Boost, 02/11/2026): `45` são minutos,
// `1:30` são horas:minutos. Entre 1 minuto e 10 horas — mais do que isso não é
// um timer de hunt, é um engano a escrever.

export const TIMER_MAX_MINUTES = 600;

export function parseTimerMinutes(raw: string): number | null {
  const text = raw.trim();
  let minutes: number;
  if (/^\d+$/.test(text)) {
    minutes = Number(text);
  } else {
    const m = /^(\d+):([0-5]\d)$/.exec(text);
    if (!m) return null;
    minutes = Number(m[1]) * 60 + Number(m[2]);
  }
  return minutes >= 1 && minutes <= TIMER_MAX_MINUTES ? minutes : null;
}

/** Como o campo mostra a duração atual: sempre em minutos. */
export function formatTimerMinutes(minutes: number): string {
  return String(minutes);
}
