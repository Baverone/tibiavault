import type { HoldEnv } from './holdSection';

/** O `HoldEnv` do browser: a altura que conta é a do `#conteudo` da casca. */
export function browserHoldEnv(): HoldEnv {
  return {
    observeHeight(onHeight) {
      const content = document.getElementById('conteudo');
      if (!content) return () => {};
      const observer = new ResizeObserver(() => onHeight(content.getBoundingClientRect().height));
      observer.observe(content);
      return () => observer.disconnect();
    },
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (id) => window.clearTimeout(id),
    addEventListener: (name, fn) => window.addEventListener(name, fn, { passive: true }),
    removeEventListener: (name, fn) => window.removeEventListener(name, fn),
  };
}
