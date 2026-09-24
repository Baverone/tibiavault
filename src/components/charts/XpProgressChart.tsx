import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Rectangle, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RectangleProps } from 'recharts';
import type { HistoryEntry } from '../../domain/types';
import { computeDailyGains } from '../../domain/historyStats';
import { CHART_AXIS, CHART_GRID, CHART_NEGATIVE, CHART_TOOLTIP, CHART_ZERO, compactXp } from './chartTheme';

interface XpProgressChartProps {
  history: HistoryEntry[];
  accentColor: string;
}

/** `null` = o histórico todo. */
const PERIODS: { days: number | null; label: string }[] = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
  { days: null, label: 'Tudo' },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const dateFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit' });
const signedNumberFormatter = new Intl.NumberFormat('pt-PT', { signDisplay: 'exceptZero' });

/**
 * XP ganha em cada dia.
 *
 * Havia também um modo "Nível & XP" — XP acumulada, nível e três médias
 * móveis no mesmo par de eixos. Uma curva de XP total só sabe subir, por isso
 * dizia sempre a mesma coisa: que se anda para a frente. As barras por dia
 * mostram o que interessa mesmo, que é quais foram os dias bons e quais foram
 * os maus.
 */
export function XpProgressChart({ history, accentColor }: XpProgressChartProps) {
  const [periodDays, setPeriodDays] = useState<number | null>(30);

  // A janela é ancorada à leitura mais recente e não a "agora": se a recolha
  // falhar dois dias, "últimos 7 dias" continua a mostrar sete dias de dados
  // em vez de encolher para cinco.
  const visibleHistory = useMemo(() => {
    if (periodDays === null || history.length === 0) return history;
    const last = history[history.length - 1].timestamp;
    const from = last - periodDays * MS_PER_DAY;
    return history.filter((entry) => entry.timestamp >= from);
  }, [history, periodDays]);

  const dailyData = useMemo(() => computeDailyGains(visibleHistory), [visibleHistory]);

  const periodToggle = (
    <div className="seg" role="tablist" aria-label="Período">
      {PERIODS.map((period) => {
        const isActive = periodDays === period.days;
        return (
          <button
            key={period.label}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={isActive ? 'on' : undefined}
            onClick={() => setPeriodDays(period.days)}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="xp-progress-chart">
      <div className="chart-controls">{periodToggle}</div>

      {dailyData.length === 0 ? (
        <div className="vazio">
          {history.length < 2
            ? 'São precisas pelo menos 2 leituras de XP para desenhar a progressão.'
            : 'Não há leituras suficientes neste período. Experimenta um período maior.'}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dailyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
            <XAxis
              dataKey="dayTimestamp"
              tickFormatter={(ts) => dateFormatter.format(ts)}
              stroke={CHART_AXIS}
              fontSize={11}
              tickLine={false}
            />
            <YAxis tickFormatter={compactXp} stroke={CHART_AXIS} fontSize={11} width={52} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={CHART_TOOLTIP}
              labelFormatter={(ts) => dateFormatter.format(ts as number)}
              formatter={(value) => [signedNumberFormatter.format(Number(value)), 'XP nesse dia']}
            />
            <ReferenceLine y={0} stroke={CHART_ZERO} />
            <Bar
              dataKey="experienceGained"
              isAnimationActive={false}
              shape={(props: RectangleProps & { payload?: { experienceGained: number } }) => {
                const gained = props.payload?.experienceGained ?? 0;
                return (
                  <Rectangle {...props} radius={[3, 3, 0, 0]} fill={gained >= 0 ? accentColor : CHART_NEGATIVE} />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
