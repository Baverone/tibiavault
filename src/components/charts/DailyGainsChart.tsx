import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PLAYERS } from '../../constants/players';
import { combineDailyGains } from '../../domain/homeSummary';
import type { HistoriesByCharacter } from '../../hooks/useAllCharacters';
import { CHART_AXIS, CHART_GRID, CHART_TOOLTIP, compactXp } from './chartTheme';

interface DailyGainsChartProps {
  histories: HistoriesByCharacter;
}

const PERIODS = [
  { days: 14, label: '14 dias' },
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
];

const dateFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit' });
const signedFormatter = new Intl.NumberFormat('pt-PT', { signDisplay: 'exceptZero' });

/**
 * A XP feita por dia pelos dois bonecos, lado a lado.
 *
 * Cada um já tinha o seu gráfico na sua página; o que faltava era a pergunta do
 * Início — quem fez o quê nesta semana — que só se respondia abrindo duas
 * páginas e comparando de cabeça. As barras são agrupadas por dia e não
 * empilhadas: empilhadas, a soma dos dois dizia uma coisa que ninguém perguntou
 * e escondia o dia mau de um por trás do dia bom do outro.
 *
 * Um dia de XP PERDIDA (uma morte) fica com a cor da personagem e não a
 * vermelho, ao contrário do gráfico de uma personagem só: aqui a cor é o que
 * diz de quem é a barra, e pintá-la de vermelho tirava-lhe o dono. O sinal já
 * vem da direção da barra e do valor no tooltip.
 */
export function DailyGainsChart({ histories }: DailyGainsChartProps) {
  const [days, setDays] = useState(30);

  const data = useMemo(() => {
    const points = combineDailyGains(histories, days);
    return points.map((point) => ({ dayTimestamp: point.dayTimestamp, ...point.gains }));
  }, [histories, days]);

  return (
    <div>
      <div className="cardh">
        <h2>XP por dia</h2>
        <div className="seg" role="tablist" aria-label="Período do gráfico">
          {PERIODS.map((period) => (
            <button
              key={period.days}
              type="button"
              role="tab"
              aria-selected={days === period.days}
              className={days === period.days ? 'on' : undefined}
              onClick={() => setDays(period.days)}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="vazio">Ainda não há leituras suficientes para desenhar o gráfico.</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
            <XAxis
              dataKey="dayTimestamp"
              tickFormatter={(ts) => dateFormatter.format(ts)}
              stroke={CHART_AXIS}
              fontSize={11}
              tickLine={false}
              minTickGap={26}
            />
            <YAxis tickFormatter={compactXp} stroke={CHART_AXIS} fontSize={11} width={52} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={CHART_TOOLTIP}
              labelFormatter={(ts) => dateFormatter.format(ts as number)}
              formatter={(value, name) => [signedFormatter.format(Number(value)), String(name)]}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: CHART_AXIS, paddingTop: 8 }} />
            {PLAYERS.map((player) => (
              <Bar
                key={player.id}
                dataKey={player.id}
                name={player.name}
                fill={player.accentColor}
                isAnimationActive={false}
                radius={[3, 3, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
