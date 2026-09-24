import { useEffect, useState, type ReactNode } from 'react';
import { CASA, pageById, sections, type PageId } from '../../navigation/pages';
import { Icon } from './icons';

interface AppShellProps {
  page: PageId;
  onNavigate: (id: PageId) => void;
  /** O subtítulo vivo do cabeçalho (números do dia); cai no fixo de `pages.ts`. */
  subtitle?: ReactNode;
  /** Botões à direita do título. */
  actions?: ReactNode;
  /** A barra dos timers — vive na casca para não perder a contagem ao mudar de página. */
  timers?: ReactNode;
  /** O «Como ler esta página», fechado por omissão. */
  help?: ReactNode;
  children: ReactNode;
}

/**
 * A CASCA de todas as páginas: barra lateral, barra de topo, cabeçalho, rodapé.
 *
 * O que estava mal e isto vem fechar: a app era **uma** página com uma fila de
 * três separadores no topo e uma segunda fila dentro do terceiro. Navegar era
 * adivinhar o que estava dentro de «Utilitários», nenhuma das vistas tinha URL
 * próprio, e os timers, o Rashid e o Tibiadrome estavam empilhados por cima de
 * tudo — 450 px antes de se ver a XP de quem quer que fosse.
 *
 * Agora há **um** sítio onde a navegação vive (`navigation/pages.ts`), a barra
 * lateral é a mesma no PC e no painel do telemóvel, e cada página tem endereço.
 */
export function AppShell({ page, onNavigate, subtitle, actions, timers, help, children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = pageById(page);

  // A classe vive no `<body>` (e não num `<div>`) porque é ela que trava o
  // scroll da página por trás do painel.
  useEffect(() => {
    document.body.classList.toggle('menu-on', menuOpen);
    return () => document.body.classList.remove('menu-on');
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  function go(id: PageId) {
    onNavigate(id);
    // Um toque num link do menu fecha o painel — senão, no telemóvel, ele
    // ficava por cima da página a que acabou de chegar.
    setMenuOpen(false);
  }

  const subtitleNode = subtitle ?? meta.subtitle;

  return (
    <>
      <a className="salta" href="#conteudo">
        Saltar para o conteúdo
      </a>

      <div className="shell">
        <aside className="side" id="side" aria-label="Navegação do site">
          <div className="sidetop">
            <a className="casa" href={CASA.href}>
              ← {CASA.label}
            </a>
            <button className="marca" type="button" onClick={() => go('inicio')}>
              <span className="mk" aria-hidden="true">
                T
              </span>
              <span>
                <b>tibiavault</b>
                <small>Ferramentas do Tibia</small>
              </span>
            </button>
          </div>

          <nav className="sidenav" aria-label="Páginas">
            {sections().map((section) => (
              <div className="sgrp" key={section.name || '_'}>
                {section.name && <div className="sgh">{section.name}</div>}
                {section.pages.map((item) => {
                  const current = item.id === page;
                  return (
                    <a
                      key={item.id}
                      className={current ? 'sli cur' : 'sli'}
                      href={`#${item.id}`}
                      aria-current={current ? 'page' : undefined}
                      onClick={(event) => {
                        event.preventDefault();
                        go(item.id);
                      }}
                    >
                      <span className="ic">
                        <Icon name={item.icon} />
                      </span>
                      <span className="tx">
                        {item.label}
                        {item.note && <small>{item.note}</small>}
                      </span>
                    </a>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="sidept">
            A XP entra sozinha todos os dias ·{' '}
            <a href="https://github.com/Baverone/tibiavault">repositório</a>
          </div>
        </aside>

        {menuOpen && (
          <button className="veu" type="button" aria-label="Fechar o menu" onClick={() => setMenuOpen(false)} />
        )}

        <div className="mainc">
          <header className="topbar">
            <button
              className="menub"
              type="button"
              aria-expanded={menuOpen}
              aria-controls="side"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Icon name="menu" size={17} />
              <span>Menu</span>
            </button>
            <span className="tbt">{meta.label}</span>
          </header>

          <div className="pgh">
            <div className="pghin">
              <nav className="crumbs" aria-label="Migalhas">
                {page === 'inicio' ? (
                  <b>{meta.label}</b>
                ) : (
                  <>
                    <a
                      href="#inicio"
                      onClick={(event) => {
                        event.preventDefault();
                        go('inicio');
                      }}
                    >
                      Início
                    </a>
                    {meta.section && (
                      <>
                        <i>›</i>
                        <span>{meta.section}</span>
                      </>
                    )}
                    <i>›</i>
                    <b>{meta.label}</b>
                  </>
                )}
              </nav>

              <div className="pgtop">
                <div className="pgtit">
                  <h1 className="pgt">{meta.label}</h1>
                  {subtitleNode && <p className="pgsub">{subtitleNode}</p>}
                </div>
                {actions && <div className="pgacts">{actions}</div>}
              </div>
            </div>
          </div>

          {timers}

          <main id="conteudo">
            <div className="wrap">{children}</div>
          </main>

          {help && (
            <footer className="pgft">
              <div className="pghin">
                <details className="comoler">
                  <summary>
                    <Icon name="ajuda" size={16} />
                    <span>Como ler esta página</span>
                  </summary>
                  <div className="cltx">{help}</div>
                </details>
              </div>
            </footer>
          )}
        </div>
      </div>
    </>
  );
}
