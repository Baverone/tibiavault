import { useId, useState } from 'react';
import { chargesTimeLeft } from '../../domain/skillTraining';
import { parseNonNegativeInteger } from '../../domain/validation';

const horaFmt = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' });

/**
 * Cargas → tempo que sobra (pedido do André a 21/11/2026): escreve as cargas
 * que a varinha ainda tem e vê quantas horas, minutos e segundos de treino
 * faltam, e a que horas acaba se começar agora.
 */
export function ChargesTimeLeft({ accentColor }: { accentColor: string }) {
  const fieldId = useId();
  const [raw, setRaw] = useState('');
  const vazio = raw.trim() === '';
  const parsed = parseNonNegativeInteger(raw, 'as cargas');
  const time = !vazio && parsed.ok ? chargesTimeLeft(parsed.value) : null;

  return (
    <div className="charges-left">
      <div className="hunt-form">
        <div className="hunt-form__field">
          <label htmlFor={`${fieldId}-charges`}>Cargas que sobram na varinha</label>
          <input
            id={`${fieldId}-charges`}
            type="text"
            inputMode="numeric"
            placeholder="ex: 14400"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
        </div>
      </div>
      <p className="charges-left__out" aria-live="polite">
        {vazio ? (
          <span className="vazio">Cada carga são 2 segundos: uma Lasting Exercise inteira (14 400) dá 8 horas.</span>
        ) : !parsed.ok ? (
          <span className="field-error">{parsed.error}</span>
        ) : (
          time && (
            <>
              Sobram{' '}
              <strong style={{ color: accentColor }}>
                {time.hours} h {time.minutes} min {time.seconds} s
              </strong>
              {time.totalSeconds > 0 &&
                ` — se começares agora, acaba às ${horaFmt.format(new Date(Date.now() + time.totalSeconds * 1000))}`}
              .
            </>
          )
        )}
      </p>
    </div>
  );
}
