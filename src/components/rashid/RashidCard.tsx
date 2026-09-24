import { useRashidClock } from '../../hooks/useRashidClock';
import { formatDuration } from '../../domain/tibiadrome/rotation';

export function RashidCard() {
  const state = useRashidClock();
  const remainingMs = state.nextChangeAt - Date.now();

  return (
    <div className="rashid-card">
      <img src="/rashid.png" alt="Rashid" className="rashid-card__icon" width={48} height={48} />
      <div className="rashid-card__info">
        <span className="rashid-card__city">{state.location.city}</span>
        <span className="rashid-card__location">{state.location.location}</span>
        {/* «muda às 9:00» já está na nota do cartão, na página. Aqui fica só o
            que conta ao segundo. */}
        <span className="rashid-card__countdown">muda dentro de {formatDuration(remainingMs)}</span>
      </div>
    </div>
  );
}
