import type { CharacterId } from '../domain/types.ts';

export interface EntradaHunt {
  nivelAlvo: string;
  xpHora: string;
  horas: string;
  stamina: boolean;
  boost: boolean;
  boosts: string;
  dobro: boolean;
}

const PREFIXO = 'calculadora-hunt:';

export const ENTRADA_VAZIA: EntradaHunt = {
  nivelAlvo: '',
  xpHora: '',
  horas: '',
  // A stamina verde é o caso normal de quem planeia uma hunt — quem caça sem
  // ela raramente está a fazer contas para subir de nível.
  stamina: true,
  boost: false,
  boosts: '1',
  dobro: false,
};

/**
 * Cada campo só é aproveitado se for do tipo certo; o resto volta ao valor por
 * omissão. 11/11/2026 (auditoria com o Codex): um `{"nivelAlvo":null}` guardado
 * entrava tal e qual e o `.trim()` rebentava a calculadora a cada recarga.
 */
export function sanearEntrada(lido: Record<string, unknown>): EntradaHunt {
  const entrada: EntradaHunt = { ...ENTRADA_VAZIA };
  for (const chave of Object.keys(ENTRADA_VAZIA) as (keyof EntradaHunt)[]) {
    const valor = lido[chave];
    if (typeof valor === typeof ENTRADA_VAZIA[chave]) (entrada as unknown as Record<string, unknown>)[chave] = valor;
  }
  return entrada;
}

/** Guardado por personagem: a XP/h de uma hunt do Baverone não serve ao Bluey. */
export function carregarEntrada(personagem: CharacterId): EntradaHunt {
  try {
    const bruto = localStorage.getItem(`${PREFIXO}${personagem}`);
    if (!bruto) return ENTRADA_VAZIA;
    const lido = JSON.parse(bruto);
    if (typeof lido !== 'object' || lido === null) return ENTRADA_VAZIA;
    return sanearEntrada(lido as Record<string, unknown>);
  } catch {
    return ENTRADA_VAZIA;
  }
}

export function guardarEntrada(personagem: CharacterId, entrada: EntradaHunt): void {
  try {
    localStorage.setItem(`${PREFIXO}${personagem}`, JSON.stringify(entrada));
  } catch {
    // Janela privada ou armazenamento cheio — a calculadora continua a
    // funcionar, só não se lembra dos valores da próxima vez.
  }
}
