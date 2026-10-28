/**
 * Descer até uma secção e MANTÊ-LA no topo enquanto o conteúdo muda de altura.
 *
 * O gráfico de Progressão é carregado à parte e chega depois do resto: a
 * secção dele cresce ~270 px e empurra tudo o que está por baixo. Quem vem pelo
 * endereço (`#baverone/treino`) ou pelo índice «Nesta página» já ia a caminho
 * de uma posição calculada ANTES do salto. No Safari/WebKit é pior: o salto a
 * meio do scroll suave cancela-o, e o índice no telemóvel deixava a pessoa na
 * Calculadora de hunt com o `<select>` a dizer «Varinhas de treino» (e2e de
 * 25/10/2026, iPhone).
 *
 * Por isso, durante uns segundos, cada mudança de altura do conteúdo volta a
 * alinhar a secção — e pára logo que a pessoa mexa na página.
 */

export interface ScrollOptions {
  behavior?: 'smooth';
  block: 'start';
}

export interface Scrollable {
  scrollIntoView(options: ScrollOptions): void;
}

/**
 * O que a função precisa do browser — à parte, para se testar sem um (os
 * testes compilam sem o `lib` do DOM). O de verdade está em `browserHoldEnv.ts`.
 */
export interface HoldEnv {
  /** A altura do conteúdo neste instante (medida já, não no próximo frame). */
  contentHeight(): number;
  /** Chama `onHeight` com a altura do conteúdo agora e sempre que mudar; devolve o desligar. */
  observeHeight(onHeight: (height: number) => void): () => void;
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
  addEventListener(name: string, fn: () => void): void;
  removeEventListener(name: string, fn: () => void): void;
}

/** Os gestos de quem lê: a partir daqui a página é dela, não se volta a alinhar. */
export const USER_INPUT_EVENTS = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;

export const HOLD_MS = 3000;

export function holdSectionInView(
  target: Scrollable,
  env: HoldEnv,
  { smooth = false, ms = HOLD_MS }: { smooth?: boolean; ms?: number } = {}
): () => void {
  target.scrollIntoView(smooth ? { behavior: 'smooth', block: 'start' } : { block: 'start' });

  // O ResizeObserver avisa logo ao começar: com a altura de quando o scroll
  // arrancou isso não é uma mudança, e realinhar ali cortava o scroll suave.
  // A altura de referência mede-se AGORA e não no primeiro aviso: esse só
  // chega no frame seguinte, e se o gráfico entrar pelo meio já traz a altura
  // nova — passava por «altura de agora», nada realinhava e o WebKit deixava
  // a pessoa na Previsão (e2e de 28/10/2026, iPhone, 1 em 25 corridas).
  let lastHeight = env.contentHeight();
  const unobserve = env.observeHeight((height) => {
    const changed = height !== lastHeight;
    lastHeight = height;
    if (changed) target.scrollIntoView({ block: 'start' });
  });

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    unobserve();
    env.clearTimeout(timer);
    for (const name of USER_INPUT_EVENTS) env.removeEventListener(name, stop);
  };
  const timer = env.setTimeout(stop, ms);
  for (const name of USER_INPUT_EVENTS) env.addEventListener(name, stop);
  return stop;
}
