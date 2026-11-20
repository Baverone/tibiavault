import { useRotationClock } from '../../hooks/useRotationClock';
import { ROTATION_ANCHOR } from '../../data/tibiadrome/rotationAnchor';
import { formatDuration, formatRotationDate } from '../../domain/tibiadrome/rotation';
import type { PageId } from '../../navigation/pages';
import { Icon } from './icons';

/**
 * A contagem do Tibiadrome no topo de todas as páginas, ao lado do «Início»
 * (pedido do André a 20/11/2026). Vive num componente à parte porque o relógio
 * bate de segundo a segundo: dentro da casca, cada segundo redesenhava a
 * página inteira.
 */
export function TibiadromeBadge({ onNavigate }: { onNavigate: (id: PageId) => void }) {
  const state = useRotationClock(ROTATION_ANCHOR);
  const fim = formatRotationDate(state.endAt);

  return (
    <a
      className="tdbadge"
      href="#mundo"
      title={`Rotação #${state.number} do Tibiadrome — acaba a ${fim}`}
      onClick={(event) => {
        event.preventDefault();
        onNavigate('mundo');
      }}
    >
      <Icon name="mundo" size={14} />
      <span>Tibiadrome</span>
      <b>{formatDuration(state.endAt - Date.now())}</b>
    </a>
  );
}
