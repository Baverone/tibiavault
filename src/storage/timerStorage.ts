// O tempo do timer Boost, escolhido por quem o usa (02/11/2026). Fica no
// browser de cada um: é uma preferência de quem caça, não um dado da app. Uma
// leitura que falhe (janela privada, armazenamento bloqueado) volta aos 60 min.
import { parseTimerMinutes } from '../domain/timers/duration';

const BOOST_KEY = 'tibia-xp-calc:timers:boost-minutes';

export const BOOST_DEFAULT_MINUTES = 60;

export function getBoostMinutes(): number {
  try {
    return parseTimerMinutes(localStorage.getItem(BOOST_KEY) ?? '') ?? BOOST_DEFAULT_MINUTES;
  } catch {
    return BOOST_DEFAULT_MINUTES;
  }
}

export function saveBoostMinutes(minutes: number): void {
  try {
    localStorage.setItem(BOOST_KEY, String(minutes));
  } catch {
    // Sem armazenamento: vale para esta visita e volta aos 60 min na próxima.
  }
}
