const STORAGE_KEY = 'celesta-spot-filter';
const LISBON_KEY = 'celesta-show-lisbon';

/**
 * Que spots do Celesta mostrar. Guarda-se a lista dos escolhidos, e não a dos
 * escondidos, por uma razão prática: o bot pode passar a mandar spots novos, e
 * um spot novo deve aparecer sozinho só enquanto não houver escolha nenhuma
 * feita. Depois de escolheres, o painel é teu — nada entra sem tu meteres.
 *
 * `null` = nunca escolheste nada, mostra-se tudo.
 */
export function loadSelectedSpots(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((s) => typeof s === 'string') ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSelectedSpots(names: string[] | null): void {
  try {
    if (names === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch {
    // localStorage cheio ou bloqueado (janela privada) — o filtro fica só
    // nesta sessão, o painel continua a funcionar.
  }
}

/**
 * Os spots que passam o filtro, pela ordem em que vêm nos dados.
 *
 * Nomes guardados que já não existem nos dados (o bot mudou-lhes o nome ou
 * deixou de os mandar) não fazem nada: não aparecem nem dão erro. Se só
 * restarem esses, a lista fica vazia — e é o estado vazio do painel que
 * oferece o «Mostrar todos».
 */
export function applySpotFilter<T extends { name: string }>(spots: T[], selected: string[] | null): T[] {
  if (selected === null) return spots;
  return spots.filter((spot) => selected.includes(spot.name));
}

/**
 * Mostrar também a hora de Lisboa nas janelas.
 *
 * Guarda-se pela mesma razão que o filtro: quem joga daqui quer a hora de
 * Lisboa sempre, e tinha de voltar a picar a caixa a cada abertura da app.
 */
export function loadShowLisbon(): boolean {
  try {
    return localStorage.getItem(LISBON_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveShowLisbon(value: boolean): void {
  try {
    if (value) localStorage.setItem(LISBON_KEY, '1');
    else localStorage.removeItem(LISBON_KEY);
  } catch {
    // Ver acima: sem localStorage a preferência vive só nesta sessão.
  }
}
