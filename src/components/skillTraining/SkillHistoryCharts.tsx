import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SKILL_LABELS, type TrainableSkill } from '../../domain/skillTraining';
import {
  eventRange,
  rateInsideOutsideEvents,
  ratePerDay,
  skillSeries,
  type SkillEvent,
  type SkillReading,
} from '../../domain/skillsHistory';
import { CHART_AXIS, CHART_GRID, CHART_TOOLTIP } from '../charts/chartTheme';

interface SkillHistoryChartsProps {
  readings: SkillReading[];
  events: SkillEvent[];
  accentColor: string;
}

const PERIODS: { days: number | null; label: string }[] = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
  { days: null, label: 'Tudo' },
];

const SKILL_ORDER: TrainableSkill[] = ['magic', 'distance', 'fist', 'axe', 'sword', 'club', 'shielding'];
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EVENT_FILL = 'rgba(255, 196, 0, 0.14)';

const dateFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit' });
const fullFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const levelFormatter = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rateFormatter = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 3, signDisplay: 'exceptZero' });

function rateText(rate: number | null): string {
  return rate === null ? '—' : `${rateFormatter.format(rate)} níveis/dia`;
}

/**
 * A evolução de cada skill gravada (20/11/2026): uma linha por skill, com os
 * eventos sombreados. O nível é fracionário (80 com 25 % a faltar = 80,75).
 */
export function SkillHistoryCharts({ readings, events, accentColor }: SkillHistoryChartsProps) {
  const [periodDays, setPeriodDays] = useState<number | null>(30);

  // Como no gráfico do XP: a janela conta a partir da leitura mais recente.
  const visible = useMemo(() => {
    if (periodDays === null || readings.length === 0) return readings;
    const from = readings[readings.length - 1].timestamp - periodDays * MS_PER_DAY;
    return readings.filter((r) => r.timestamp >= from);
  }, [readings, periodDays]);

  const skills = SKILL_ORDER.filter((skill) => readings.some((r) => r.skills[skill]));

  return (
    <div>
      <div className="chart-controls">
        <div className="seg" role="tablist" aria-label="Período">
          {PERIODS.map((period) => (
            <button
              key={period.label}
              type="button"
              role="tab"
              aria-selected={periodDays === period.days}
              className={periodDays === period.days ? 'on' : undefined}
              onClick={() => setPeriodDays(period.days)}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {skills.map((skill) => {
        const series = skillSeries(visible, skill);
        const all = skillSeries(readings, skill);
        const { inside, outside } = rateInsideOutsideEvents(all, events);
        const first = series[0]?.timestamp ?? 0;
        const last = series[series.length - 1]?.timestamp ?? 0;
        const shown = events
          .map((event) => ({ event, range: eventRange(event) }))
          .filter(({ range }) => range[1] > first && range[0] < last);
        return (
          <div key={skill} className="skills-chart">
            <h3 style={{ color: accentColor }}>{SKILL_LABELS[skill]}</h3>
            <p className="nota">
              Neste período: <b>{rateText(ratePerDay(series))}</b>
              {events.length > 0 && (
                <>
                  {' '}
                  · em eventos: <b>{rateText(inside)}</b> · fora: <b>{rateText(outside)}</b> (todo o histórico)
                </>
              )}
            </p>
            {series.length < 2 ? (
              <p className="vazio">
                {series.length === 0
                  ? 'Sem leituras neste período. Experimenta um período maior.'
                  : 'Só há uma leitura neste período: a linha precisa de duas.'}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  {shown.map(({ event, range }) => (
                    <ReferenceArea
                      key={event.id}
                      x1={Math.max(range[0], first)}
                      x2={Math.min(range[1], last)}
                      fill={EVENT_FILL}
                      strokeOpacity={0}
                      ifOverflow="hidden"
                      label={{ value: event.name, position: 'insideTop', fill: CHART_AXIS, fontSize: 11 }}
                    />
                  ))}
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(ts) => dateFormatter.format(ts)}
                    stroke={CHART_AXIS}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(v) => levelFormatter.format(v)}
                    stroke={CHART_AXIS}
                    fontSize={11}
                    width={52}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP}
                    labelFormatter={(ts) => fullFormatter.format(ts as number)}
                    formatter={(value) => [levelFormatter.format(Number(value)), SKILL_LABELS[skill]]}
                  />
                  <Line type="monotone" dataKey="value" stroke={accentColor} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        );
      })}
    </div>
  );
}
