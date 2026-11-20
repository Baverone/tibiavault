import { useId, useState } from 'react';
import type { SkillEvent } from '../../domain/skillsHistory';
import type { SkillsHistoryState } from '../../hooks/useSkillsHistory';

interface SkillEventsEditorProps {
  history: SkillsHistoryState;
}

const dayFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

function dayText(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return dayFormatter.format(new Date(y, m - 1, d));
}

/**
 * Os eventos marcados pelo André (20/11/2026): nome e datas. São os mesmos
 * para as duas personagens. O tibia.com não tem uma lista que se leia sem
 * raspar a página, por isso escrevem-se aqui.
 */
export function SkillEventsEditor({ history }: SkillEventsEditorProps) {
  const id = useId();
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const invalid = name.trim() === '' || start === '' || end === '' || end < start;

  async function add() {
    const event: SkillEvent = { id: `${start}-${Date.now().toString(36)}`, name: name.trim(), start, end };
    setBusy(true);
    const error = await history.addEvent(event);
    setBusy(false);
    setMessage(error);
    if (!error) {
      setName('');
      setStart('');
      setEnd('');
    }
  }

  async function remove(eventId: string) {
    setBusy(true);
    setMessage(await history.removeEvent(eventId));
    setBusy(false);
  }

  return (
    <div className="skills-events">
      <h3>Eventos</h3>
      {history.events.length === 0 ? (
        <p className="vazio">Ainda não há eventos marcados.</p>
      ) : (
        <ul className="skills-events__list">
          {history.events.map((event) => (
            <li key={event.id}>
              <b>{event.name}</b> — {dayText(event.start)} a {dayText(event.end)}{' '}
              {history.hasToken && (
                <button type="button" className="btn sm" disabled={busy} onClick={() => void remove(event.id)}>
                  Tirar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {history.hasToken ? (
        <div className="hunt-form">
          <div className="hunt-form__field">
            <label htmlFor={`${id}-nome`}>Nome do evento</label>
            <input id={`${id}-nome`} type="text" placeholder="ex: Double Skill" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="hunt-form__field">
            <label htmlFor={`${id}-inicio`}>Início</label>
            <input id={`${id}-inicio`} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="hunt-form__field">
            <label htmlFor={`${id}-fim`}>Fim (inclusive)</label>
            <input id={`${id}-fim`} type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <p>
            <button type="button" className="btn sm" disabled={invalid || busy} onClick={() => void add()}>
              {busy ? 'A gravar…' : 'Marcar evento'}
            </button>
            {start !== '' && end !== '' && end < start && <span className="field-error"> O fim é antes do início.</span>}
          </p>
        </div>
      ) : (
        <p className="nota">Para marcar eventos, guarda a chave do GitHub na secção Varinhas de treino.</p>
      )}
      {message && <p className="field-error">Não gravou: {message}.</p>}
    </div>
  );
}
