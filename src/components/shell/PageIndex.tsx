import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './icons';
import { sectionHref } from '../../navigation/pages';
import { holdSectionInView } from '../../navigation/holdSection';
import { browserHoldEnv } from '../../navigation/browserHoldEnv';

export interface IndexEntry {
  /** O `id` do elemento na página. */
  id: string;
  label: string;
  icon: IconName;
}

interface PageIndexProps {
  entries: readonly IndexEntry[];
  /** O título da coluna. */
  title?: string;
  /**
   * A página dona das secções. Com ela, o href é `#<página>/<secção>` e o link
   * aberto num separador novo vai dar à secção — sem ela, `#progressao` não
   * dizia de quem era e caía no Início (20/10/2026).
   */
  page?: string;
}

/**
 * O ÍNDICE VERTICAL de uma página comprida.
 *
 * É a alternativa às filas de botões que corriam para o lado: em ecrã largo
 * fica numa coluna à esquerda do conteúdo, no telemóvel vira um `<select>`.
 * A página da personagem tem cinco blocos e ~2 800 px de altura — sem isto,
 * chegar à «Calculadora de hunt» era rolar até lá e esperar reconhecê-la.
 */
export function PageIndex({ entries, title = 'Nesta página', page }: PageIndexProps) {
  const [active, setActive] = useState(entries[0]?.id ?? '');

  // Qual o bloco que está a ser lido. O `rootMargin` de cima empurra a linha de
  // decisão para ~um quinto do ecrã: senão, o bloco só ficava ativo quando já
  // tinha passado o topo, e a coluna apontava sempre para o anterior.
  useEffect(() => {
    const seen = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) seen.set(record.target.id, record.isIntersecting);
        const first = entries.find((entry) => seen.get(entry.id));
        if (first) setActive(first.id);
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: 0 }
    );
    for (const entry of entries) {
      const element = document.getElementById(entry.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [entries]);

  // A ida em curso: escolher outra secção a meio, ou sair da página, desliga-a.
  const stopHold = useRef<(() => void) | null>(null);
  useEffect(() => () => stopHold.current?.(), []);

  // Suave, mas segura no sítio se o gráfico chegar a meio do caminho: no iPhone
  // o salto cancelava o scroll e a pessoa ficava na Calculadora de hunt
  // (25/10/2026).
  function goTo(id: string) {
    const element = document.getElementById(id);
    if (!element) return;
    stopHold.current?.();
    stopHold.current = holdSectionInView(element, browserHoldEnv(), { smooth: true });
    setActive(id);
  }

  return (
    <>
      <div className="vidxsel">
        <label className="vlbl" htmlFor="vidx-sel">
          {title}
        </label>
        <select
          id="vidx-sel"
          className="selc"
          value={active}
          onChange={(event) => goTo(event.target.value)}
        >
          {entries.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>

      <nav className="vidx" aria-label={title}>
        <div className="vgh">{title}</div>
        {entries.map((entry) => (
          <a
            key={entry.id}
            href={page ? sectionHref(page, entry.id) : `#${entry.id}`}
            className={entry.id === active ? 'on' : undefined}
            onClick={(event) => {
              event.preventDefault();
              goTo(entry.id);
            }}
          >
            <span className="ic">
              <Icon name={entry.icon} size={16} />
            </span>
            <span>{entry.label}</span>
          </a>
        ))}
      </nav>
    </>
  );
}
