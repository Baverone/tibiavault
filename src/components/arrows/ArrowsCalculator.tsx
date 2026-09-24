import { useState } from 'react';
import {
  ARROW_RATES,
  buildArrowRateTable,
  calculateArrowsPerMinute,
  closestArrowRate,
  closestTableMinute,
} from '../../domain/arrows/arrowsCalculator';

const TABLE = buildArrowRateTable();

export function ArrowsCalculator() {
  const [arrowsInput, setArrowsInput] = useState('');
  const [minutesInput, setMinutesInput] = useState('');

  const arrows = arrowsInput.trim() === '' ? null : Number(arrowsInput);
  const minutes = minutesInput.trim() === '' ? null : Number(minutesInput);
  const rate = arrows !== null && minutes !== null ? calculateArrowsPerMinute(arrows, minutes) : null;

  const highlightMinute = rate !== null ? closestTableMinute(minutes as number) : null;
  const highlightRate = rate !== null ? closestArrowRate(rate) : null;

  return (
    <div className="card">
      <div className="hunt-form">
        <div className="hunt-form__field">
          <label htmlFor="arrows-total">Número de flechas</label>
          <input
            id="arrows-total"
            type="number"
            min="0"
            placeholder="ex: 850"
            value={arrowsInput}
            onChange={(e) => setArrowsInput(e.target.value)}
          />
        </div>
        <div className="hunt-form__field">
          <label htmlFor="arrows-minutes">Número de minutos</label>
          <input
            id="arrows-minutes"
            type="number"
            min="0"
            placeholder="ex: 32"
            value={minutesInput}
            onChange={(e) => setMinutesInput(e.target.value)}
          />
        </div>
      </div>

      {rate !== null ? (
        <p className="daily-simulation-summary">
          Consumo: <strong>{rate}</strong> flechas/minuto.
        </p>
      ) : (
        (arrowsInput.trim() !== '' || minutesInput.trim() !== '') && (
          <p className="daily-simulation-note">Indica o número de flechas e de minutos (maior que zero).</p>
        )
      )}

      <table className="hunt-scenario-table" style={{ marginTop: 14 }}>
        <thead>
          <tr>
            <th>Minutos</th>
            {ARROW_RATES.map((r) => (
              <th key={r}>{r}/min</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TABLE.map((row) => (
            <tr key={row.minute} className={row.minute === highlightMinute ? 'is-highlighted' : undefined}>
              <td>{row.minute}</td>
              {ARROW_RATES.map((r) => (
                <td
                  key={r}
                  className={row.minute === highlightMinute && r === highlightRate ? 'is-highlighted-cell' : undefined}
                >
                  {row.totals[r]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
