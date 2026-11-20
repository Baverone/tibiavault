import { Suspense, lazy } from 'react';
import { SKILL_LABELS, type TrainableSkill } from '../../domain/skillTraining';
import type { SkillsHistoryState } from '../../hooks/useSkillsHistory';
import { HistoryErrorNote } from '../shell/HistoryErrorNote';
import { SkillEventsEditor } from './SkillEventsEditor';

/** Os gráficos arrastam o Recharts: carregam à parte, como o do XP. */
const SkillHistoryCharts = lazy(() =>
  import('./SkillHistoryCharts').then((module) => ({ default: module.SkillHistoryCharts }))
);

interface SkillHistoryPanelProps {
  history: SkillsHistoryState;
  accentColor: string;
}

const fullFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const RECENT = 8;

/** A secção «Evolução dos skills» da página de uma personagem (20/11/2026). */
export function SkillHistoryPanel({ history, accentColor }: SkillHistoryPanelProps) {
  if (history.loading) return <p className="vazio">A carregar as leituras dos skills…</p>;

  const recent = history.readings.slice(-RECENT).reverse();

  return (
    <div>
      {history.error && <HistoryErrorNote error={history.error} onRetry={history.reload} />}

      {history.readings.length === 0 ? (
        <p className="vazio">
          Ainda não há leituras gravadas. Escreve os skills nas Varinhas de treino e carrega em «Gravar leitura».
        </p>
      ) : (
        <>
          <Suspense fallback={<div className="vazio">A carregar o gráfico…</div>}>
            <SkillHistoryCharts readings={history.readings} events={history.events} accentColor={accentColor} />
          </Suspense>

          <h3>Últimas leituras</h3>
          <table className="hunt-scenario-table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Skills (nível · % que falta)</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((reading) => (
                <tr key={reading.timestamp}>
                  <td>{fullFormatter.format(reading.timestamp)}</td>
                  <td>
                    {(Object.entries(reading.skills) as [TrainableSkill, { level: number; percentMissing: number }][])
                      .map(([skill, v]) => `${SKILL_LABELS[skill]} ${v.level} · ${v.percentMissing}%`)
                      .join(' — ')}
                    {reading.loyaltyBonusPercent > 0 && ` (Loyalty ${reading.loyaltyBonusPercent}%)`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <SkillEventsEditor history={history} />
    </div>
  );
}
