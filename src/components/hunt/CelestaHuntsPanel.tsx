import { useEffect, useMemo, useState } from 'react';
import { useCelestaHunts } from '../../hooks/useCelestaHunts';
import { loadSelectedSpots, loadShowLisbon, saveSelectedSpots, saveShowLisbon } from '../../storage/spotFilter';
import {
  formatAge,
  formatGeneratedStamp,
  formatLength,
  formatWindow,
  isCollectionStalled,
  isStale,
  spotAvailability,
  toLisbon,
  totalFreeMinutes,
  type HuntSpotStatus,
  type SpotAvailability,
} from '../../domain/celestaHunts';
import { Icon } from '../shell/icons';
import '../../styles/celestaHunts.css';

/** "livre agora, até às 17:00" / "ocupado, livre às 20:00" — em texto curto. */
function availabilityText(availability: SpotAvailability): string {
  if (availability.state === 'free') {
    if (!availability.changesAt) return 'livre agora';
    return `livre agora, até às ${availability.changesAt}`;
  }
  if (!availability.changesAt) return 'ocupado o resto do dia';
  return `ocupado, livre às ${availability.changesAt}`;
}

function SpotRow({
  spot,
  showLisbon,
  availability,
}: {
  spot: HuntSpotStatus;
  showLisbon: boolean;
  availability: SpotAvailability | null;
}) {
  const free = totalFreeMinutes(spot);
  const packed = !spot.noBookings && free < 90;
  const openNow = availability?.state === 'free';

  return (
    <div className={openNow ? 'hunts-spot hunts-spot--open' : 'hunts-spot'}>
      <div className="hunts-spot__header">
        <span className="hunts-spot__name">{spot.name}</span>
        {spot.noBookings ? (
          <span className="hunts-spot__badge hunts-spot__badge--free">livre o dia todo</span>
        ) : (
          <span className={packed ? 'hunts-spot__badge hunts-spot__badge--packed' : 'hunts-spot__badge'}>
            {formatLength(free)} livres
          </span>
        )}
      </div>

      {/* A resposta à pergunta que se faz a abrir isto no telemóvel, antes de
          se ler janela nenhuma. Só aparece quando dá para a dar com certeza —
          ver spotAvailability. */}
      {availability && !spot.noBookings && (
        <p className={openNow ? 'hunts-spot__now hunts-spot__now--open' : 'hunts-spot__now'}>
          {availabilityText(availability)}
          {availability.minutesUntilChange !== null && ` (${formatLength(availability.minutesUntilChange)})`}
        </p>
      )}

      {!spot.noBookings && (
        spot.free.length > 0 ? (
          <div className="hunts-spot__windows">
            {spot.free.map((window) => {
              const isCurrent = openNow && availability?.window === window;
              return (
                <span
                  key={`${window.start}-${window.end}`}
                  className={isCurrent ? 'hunts-spot__window hunts-spot__window--current' : 'hunts-spot__window'}
                >
                  {formatWindow(window)}
                  {showLisbon && (
                    <em className="hunts-spot__window-alt">
                      {toLisbon(window.start)} - {toLisbon(window.end)}
                    </em>
                  )}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="hunts-spot__none">sem janelas de 30min — está cheio</p>
        )
      )}
    </div>
  );
}

interface SpotWithNow {
  spot: HuntSpotStatus;
  availability: SpotAvailability | null;
}

/**
 * A linha do topo: que spots dão para entrar já.
 *
 * O bloco "Melhores janelas" que vinha do ficheiro responde a outra pergunta —
 * qual é a melhor janela da noite — e às nove da manhã não serve de nada a
 * quem só quer saber onde pode ir agora.
 */
function FreeNowStrip({ entries }: { entries: SpotWithNow[] }) {
  // Sem estados fiáveis (ficheiro velho ou sem data) não se diz nada — o
  // painel continua a mostrar as janelas, que essas não dependem do relógio.
  if (entries.length === 0 || entries.every((entry) => entry.availability === null)) return null;

  const open = entries.filter((entry) => entry.availability?.state === 'free');

  if (open.length > 0) {
    return (
      <div className="hunts-panel__now">
        <span className="hunts-panel__label">Livres agora ({open.length})</span>
        <p className="hunts-panel__now-list">
          {open.map((entry, index) => (
            <span key={entry.spot.name}>
              {index > 0 && ' · '}
              <strong>{entry.spot.name}</strong>
              {entry.availability?.changesAt ? ` até às ${entry.availability.changesAt}` : ' (dia todo)'}
            </span>
          ))}
        </p>
      </div>
    );
  }

  const next = entries
    .filter((entry) => entry.availability?.minutesUntilChange != null)
    .sort((a, b) => a.availability!.minutesUntilChange! - b.availability!.minutesUntilChange!)[0];

  return (
    <div className="hunts-panel__now">
      <span className="hunts-panel__label">Livres agora</span>
      <p className="hunts-panel__now-list">
        {next ? `Nenhum. O primeiro a abrir é ${next.spot.name}, às ${next.availability!.changesAt}.` : 'Nenhum.'}
      </p>
    </div>
  );
}

const OUTCOME_TEXT: Record<string, string> = {
  updated: '✓ Dados novos',
  unchanged: 'Sem novidades — é o summary mais recente que existe',
  failed: '✗ Não consegui chegar aos dados',
};

interface CelestaHuntsPanelProps {
  /**
   * A recolha está desligada por ordem, não avariada.
   *
   * Cala o vermelho de «a recolha do Discord pode ter parado» — a página já diz,
   * com calma, que está desligada. Ver `pages/CelestaPage.tsx`.
   */
  collectionOff?: boolean;
}

export function CelestaHuntsPanel({ collectionOff = false }: CelestaHuntsPanelProps) {
  const { data, status, refreshing, outcome, reload } = useCelestaHunts();
  const [showLisbon, setShowLisbon] = useState(() => loadShowLisbon());
  const [now, setNow] = useState(() => Date.now());
  const [selected, setSelected] = useState<string[] | null>(() => loadSelectedSpots());
  const [choosing, setChoosing] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const allSpotNames = useMemo(() => data?.spots.map((spot) => spot.name) ?? [], [data]);

  // Sem escolha feita, mostra-se tudo — é o estado de quem abre a app pela
  // primeira vez, e ver spots a menos sem perceber porquê era pior do que ver
  // spots a mais.
  const visibleSpots = useMemo(() => {
    if (!data) return [];
    if (selected === null) return data.spots;
    return data.spots.filter((spot) => selected.includes(spot.name));
  }, [data, selected]);

  // Estado de cada spot neste minuto. Recalcula-se quando o `now` avança, e é
  // por isso que o relógio do painel bate de minuto a minuto e não só para
  // envelhecer o cabeçalho.
  const entries = useMemo<SpotWithNow[]>(
    () => (data ? visibleSpots.map((spot) => ({ spot, availability: spotAvailability(spot, data, now) })) : []),
    [visibleSpots, data, now]
  );

  function changeShowLisbon(value: boolean) {
    setShowLisbon(value);
    saveShowLisbon(value);
  }

  function toggleSpot(name: string) {
    const base = selected ?? allSpotNames;
    const next = base.includes(name) ? base.filter((n) => n !== name) : [...base, name];
    setSelected(next);
    saveSelectedSpots(next);
  }

  function showAllSpots() {
    setSelected(null);
    saveSelectedSpots(null);
  }

  return (
    <div className="hunts-panel">
      <div className="cardh">
        <h2>Spots</h2>
        <div className="hunts-panel__actions">
          {status === 'ready' && (
            <button
              className={choosing ? 'btn sm on' : 'btn sm'}
              onClick={() => setChoosing((open) => !open)}
              type="button"
              aria-expanded={choosing}
            >
              {choosing ? 'Fechar' : 'Escolher spots'}
            </button>
          )}
          <button className="btn sm" onClick={reload} type="button" disabled={refreshing}>
            {refreshing ? 'A verificar…' : 'Atualizar'}
          </button>
        </div>
      </div>

      {status === 'loading' && <p className="hunts-panel__note">A carregar…</p>}

      {status === 'empty' && (
        <p className="hunts-panel__note">
          Ainda não há dados. A tarefa agendada corre de hora a hora entre as 08:03 e as 23:03,
          mais uma vez às 00:03, e escreve <code>data/celesta-hunts.json</code> no repo.
        </p>
      )}

      {status === 'ready' && data && (
        <>
          <div className="hunts-panel__meta">
            <span className={isStale(data, now) ? 'hunts-panel__age hunts-panel__age--stale' : 'hunts-panel__age'}>
              Summary das {data.referenceTime} ({formatAge(data, now)})
            </span>
            {outcome && (
              <span className={outcome === 'updated' ? 'hunts-panel__outcome hunts-panel__outcome--ok' : 'hunts-panel__outcome'}>
                {OUTCOME_TEXT[outcome]}
              </span>
            )}
            <label className="hunts-panel__toggle">
              <input type="checkbox" checked={showLisbon} onChange={(e) => changeShowLisbon(e.target.checked)} />
              mostrar hora de Lisboa
            </label>
          </div>

          {/* Dois avisos, e só um de cada vez. "Mais de hora e meia" é um
              cuidado a ter; "parados há Xh" é uma avaria do outro lado, e
              dizer as duas coisas ao mesmo tempo escondia a segunda.
              Com a recolha desligada por ordem não há avaria nenhuma: quem o
              diz é a página, uma vez, com calma. */}
          {collectionOff ? null : isCollectionStalled(data, now) ? (
            <p className="aviso err">
              <Icon name="aviso" size={17} />
              <span>
                <b>Dados parados {formatAge(data, now)}</b> — a recolha do Discord pode ter parado.
              </span>
            </p>
          ) : (
            isStale(data, now) && (
              <p className="aviso warn">
                <Icon name="aviso" size={17} />
                <span>Estes dados já têm mais de hora e meia — pode haver reservas novas desde então.</span>
              </p>
            )
          )}

          <FreeNowStrip entries={entries} />

          {/* "da noite" e a data não são enfeite: o bloco é calculado uma vez,
              quando o ficheiro é escrito, e só olha para as 17:00–01:00. Às
              10 da manhã fala da noite de hoje; às 00:30 já é a seguinte, e
              sem o carimbo não havia como saber de qual das duas se trata. */}
          {data.highlights && data.highlights.length > 0 && (
            <div className="hunts-panel__highlights">
              <span className="hunts-panel__label">
                Melhores janelas da noite
                {formatGeneratedStamp(data) && (
                  <em className="hunts-panel__label-note"> · calculadas a {formatGeneratedStamp(data)}</em>
                )}
              </span>
              <ul>
                {data.highlights.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          {choosing && (
            <fieldset className="hunts-panel__chooser">
              <legend>Spots a mostrar</legend>
              {allSpotNames.map((name) => (
                <label key={name} className="hunts-panel__chooser-item">
                  <input
                    type="checkbox"
                    checked={selected === null || selected.includes(name)}
                    onChange={() => toggleSpot(name)}
                  />
                  {name}
                </label>
              ))}
              <button type="button" className="btn sm hunts-panel__chooser-reset" onClick={showAllSpots}>
                Mostrar todos
              </button>
            </fieldset>
          )}

          <div className="hunts-panel__spots">
            {entries.length === 0 ? (
              <p className="hunts-panel__note">
                Escondeste todos os spots. Carrega em "Escolher spots" para voltar a mostrar algum.
              </p>
            ) : (
              entries.map(({ spot, availability }) => (
                <SpotRow key={spot.name} spot={spot} showLisbon={showLisbon} availability={availability} />
              ))
            )}
          </div>

          <p className="hunts-panel__footnote">
            Horas em {data.timezone.replace('Europe/', '')}. Janela mínima: {data.minWindowMinutes}min.
          </p>
        </>
      )}
    </div>
  );
}
