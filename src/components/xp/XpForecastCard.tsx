import { useMemo, useState } from 'react';
import type { HistoryEntry } from '../../domain/types';
import {
  computeRateOverWindow,
  DEFAULT_HORIZON_DAYS,
  FORECAST_HORIZONS,
  forecastNextLevels,
  projectAtHorizon,
} from '../../domain/xpForecast';

interface XpForecastCardProps {
  history: HistoryEntry[];
  currentExperience: number;
  accentColor: string;
}

const numberFormatter = new Intl.NumberFormat('pt-PT');
const dateFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

function formatDays(days: number): string {
  if (days < 1) return 'menos de 1 dia';
  const rounded = Math.round(days);
  return rounded === 1 ? '1 dia' : `${rounded} dias`;
}

/**
 * Uma previsão só, com janela simétrica: para saber onde estarás daqui a N
 * dias, usa-se a média dos últimos N dias.
 *
 * Eram dois cartões — "próximos níveis" (média fixa de 7 dias) e "projeção por
 * segunda-feira" — que respondiam à mesma pergunta com números diferentes,
 * porque uma semana boa a multiplicar por oito dava uma previsão a 60 dias que
 * nunca acontecia. Escolher o horizonte escolhe também o quanto se olha para
 * trás, e é isso que faz a previsão longa ser lenta a mudar de ideias.
 */
export function XpForecastCard({ history, currentExperience, accentColor }: XpForecastCardProps) {
  const [horizon, setHorizon] = useState<number>(DEFAULT_HORIZON_DAYS);
  const [customInput, setCustomInput] = useState('');

  const rate = useMemo(() => computeRateOverWindow(history, horizon), [history, horizon]);
  const projection = useMemo(
    () => (rate ? projectAtHorizon(currentExperience, rate) : null),
    [rate, currentExperience]
  );
  const nextLevels = useMemo(
    () => (rate ? forecastNextLevels(currentExperience, rate.averageDailyXp, 5) : []),
    [rate, currentExperience]
  );

  function applyCustom() {
    const parsed = Number(customInput.trim());
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 3650) setHorizon(Math.round(parsed));
  }

  // Só cobre menos do que se pediu quando o histórico ainda não chega lá —
  // vale a pena dizê-lo, senão uma previsão a 90 dias feita com 20 dias de
  // dados parece tão firme como qualquer outra.
  const shortOfWindow = rate !== null && rate.daysCovered < rate.windowDays - 1;

  return (
    <div className="xp-forecast">
      <div className="seg" role="tablist" aria-label="Horizonte da previsão">
        {FORECAST_HORIZONS.map((days) => {
          const isActive = horizon === days;
          return (
            <button
              key={days}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={isActive ? 'on' : undefined}
              onClick={() => setHorizon(days)}
            >
              {days} dias
            </button>
          );
        })}
        <input
          type="number"
          min={1}
          max={3650}
          className="xp-forecast__custom"
          placeholder="outro"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onBlur={applyCustom}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applyCustom();
          }}
          aria-label="Horizonte em dias"
        />
      </div>

      {!rate || !projection ? (
        <p className="vazio">
          Ainda não há leituras suficientes nos últimos {horizon} dias para calcular um ritmo.
        </p>
      ) : (
        <>
          <p className="xp-forecast__headline">
            Daqui a {formatDays(horizon)} ({dateFormatter.format(projection.date)}) estarás no nível{' '}
            <strong style={{ color: accentColor }}>{projection.level}</strong>
            {projection.levelsGained > 0 && ` — mais ${projection.levelsGained} ${projection.levelsGained === 1 ? 'nível' : 'níveis'}`}.
          </p>

          <p className="xp-forecast__basis">
            Ao ritmo dos últimos {formatDays(rate.daysCovered)}: {numberFormatter.format(Math.round(rate.averageDailyXp))} XP
            por dia, de {rate.readingsUsed} leituras.
            {shortOfWindow && ` Só tens ${formatDays(rate.daysCovered)} de histórico, menos do que os ${horizon} dias pedidos.`}
          </p>

          {rate.averageDailyXp <= 0 ? (
            <p className="vazio">
              O ritmo nesta janela é nulo ou negativo — não há previsão de níveis para mostrar.
            </p>
          ) : (
            <table className="xp-forecast__table">
              <thead>
                <tr>
                  <th>Nível</th>
                  <th>Falta</th>
                  <th>Quando</th>
                </tr>
              </thead>
              <tbody>
                {nextLevels.map((forecast) => (
                  <tr key={forecast.level}>
                    <td style={{ color: accentColor }}>{forecast.level}</td>
                    <td>{numberFormatter.format(Math.round(forecast.experienceNeeded))} XP</td>
                    <td>
                      {dateFormatter.format(forecast.estimatedDate)}
                      <span className="xp-forecast__eta"> ({formatDays(forecast.daysToReach)})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
