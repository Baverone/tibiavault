import { formatDuration, formatRotationDate, type RotationState } from '../../domain/tibiadrome/rotation';

interface RotationCardProps {
  state: RotationState;
  now: number;
}

export function RotationCard({ state, now }: RotationCardProps) {
  const remainingMs = state.endAt - now;

  return (
    <div className="rotation-card">
      <div className="rotation-card__column">
        <span className="rotulo">Rotação</span>
        <span className="rotation-card__number">#{state.number}</span>
      </div>
      <div className="rotation-card__column">
        <span className="rotulo">Acaba a</span>
        <span className="rotation-card__date">{formatRotationDate(state.endAt)}</span>
        <span className="rotation-card__relative">dentro de {formatDuration(remainingMs)}</span>
      </div>
    </div>
  );
}
