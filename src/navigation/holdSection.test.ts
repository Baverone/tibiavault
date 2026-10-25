// `holdSectionInView` (25/10/2026): no iPhone, o índice «Nesta página» ficava
// a meio caminho das Varinhas de treino porque o gráfico de Progressão chegava
// durante o scroll suave e o WebKit cancelava-o. Testado com um browser de
// faz-de-conta: um alvo que regista os scrolls e um conteúdo cuja altura se muda
// à mão.
import test from 'node:test';
import assert from 'node:assert/strict';
import { HOLD_MS, USER_INPUT_EVENTS, holdSectionInView, type HoldEnv, type ScrollOptions } from './holdSection.ts';

function fakeBrowser(initialHeight = 2800) {
  const scrolls: ScrollOptions[] = [];
  const target = { scrollIntoView: (options: ScrollOptions) => void scrolls.push(options) };
  let onHeight: ((height: number) => void) | null = null;
  let timer: (() => void) | null = null;
  const listeners = new Map<string, Set<() => void>>();
  const env: HoldEnv = {
    observeHeight(callback) {
      onHeight = callback;
      callback(initialHeight); // como o ResizeObserver: avisa logo ao começar
      return () => {
        onHeight = null;
      };
    },
    setTimeout(fn, ms) {
      assert.equal(ms, HOLD_MS);
      timer = fn;
      return 1;
    },
    clearTimeout() {
      timer = null;
    },
    addEventListener(name, fn) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(fn);
    },
    removeEventListener(name, fn) {
      listeners.get(name)?.delete(fn);
    },
  };
  return {
    target,
    env,
    scrolls,
    resize: (height: number) => onHeight?.(height),
    expire: () => timer?.(),
    fire: (name: string) => [...(listeners.get(name) ?? [])].forEach((fn) => fn()),
    listening: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
  };
}

test('o índice desce suave e, se o gráfico chegar a meio, volta a alinhar a secção', () => {
  const b = fakeBrowser();
  holdSectionInView(b.target, b.env, { smooth: true });
  // o aviso inicial do ResizeObserver NÃO pode realinhar: cortava o scroll suave
  assert.deepEqual(b.scrolls, [{ behavior: 'smooth', block: 'start' }]);
  b.resize(2800 + 267); // o gráfico de Progressão chega
  assert.deepEqual(b.scrolls.at(-1), { block: 'start' });
  assert.equal(b.scrolls.length, 2);
  b.resize(2800 + 267); // a mesma altura não é mudança
  assert.equal(b.scrolls.length, 2);
});

test('o endereço com secção desce logo, sem animação', () => {
  const b = fakeBrowser();
  holdSectionInView(b.target, b.env);
  assert.deepEqual(b.scrolls, [{ block: 'start' }]);
});

test('a pessoa mexer na página desliga o realinhar', () => {
  for (const name of USER_INPUT_EVENTS) {
    const b = fakeBrowser();
    holdSectionInView(b.target, b.env, { smooth: true });
    b.fire(name);
    b.resize(3500);
    assert.equal(b.scrolls.length, 1, `${name} não desligou`);
    assert.equal(b.listening(), 0, `${name}: ficaram ouvidos pendurados`);
  }
});

test('passados uns segundos deixa de realinhar e larga os ouvidos', () => {
  const b = fakeBrowser();
  holdSectionInView(b.target, b.env, { smooth: true });
  b.expire();
  b.resize(3500);
  assert.equal(b.scrolls.length, 1);
  assert.equal(b.listening(), 0);
});

test('o desligar devolvido pára tudo, e chamá-lo duas vezes não estraga nada', () => {
  const b = fakeBrowser();
  const stop = holdSectionInView(b.target, b.env, { smooth: true });
  stop();
  stop();
  b.resize(3500);
  assert.equal(b.scrolls.length, 1);
  assert.equal(b.listening(), 0);
});
