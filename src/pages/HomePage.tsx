import { Suspense, lazy } from 'react';
import { PLAYERS } from '../constants/players';
import { agoText, STALE_AFTER_DAYS, summarizeCharacter, WEEK_DAYS, type CharacterSummary } from '../domain/homeSummary';
import { getLevelProgress } from '../domain/levelProgress';
import type { HistoriesByCharacter } from '../hooks/useAllCharacters';
import { ATALHOS_INICIO, type PageId } from '../navigation/pages';
import { Icon } from '../components/shell/icons';
import { RecentHistoryList } from '../components/charts/RecentHistoryList';

/**
 * O gráfico arrasta o Recharts atrás dele — sozinho, dois terços do JavaScript
 * da app. Importado a direito, o Início punha-o outra vez no caminho crítico
 * de quem só quer ver os timers: 252 KB de arranque passaram a 637 KB.
 */
const DailyGainsChart = lazy(() =>
  import('../components/charts/DailyGainsChart').then((module) => ({ default: module.DailyGainsChart }))
);

const signed = new Intl.NumberFormat('pt-PT', { signDisplay: 'exceptZero' });
const plain = new Intl.NumberFormat('pt-PT');
const dayFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit' });
// `toFixed(1)` escrevia «99.9%» com ponto decimal no meio de uma app em
// português. O `Intl` põe a vírgula, como o resto dos números da app.
const percentFormatter = new Intl.NumberFormat('pt-PT', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function SummaryTiles({ summary, name, color }: { summary: CharacterSummary; name: string; color: string }) {
  const progress = summary.experience !== null ? getLevelProgress(summary.experience) : null;
  const average = summary.weekGain !== null && summary.weekDays > 0 ? summary.weekGain / summary.weekDays : null;
  const lastIsLoss = summary.lastDayGain !== null && summary.lastDayGain < 0;
  const weekIsLoss = summary.weekGain !== null && summary.weekGain < 0;

  return (
    <>
      <div className="stat">
        <span className="rotulo">
          <span style={{ color }}>{name}</span> · último dia
        </span>
        <span className="num" style={{ color: lastIsLoss ? 'var(--err)' : color }}>
          {summary.lastDayGain !== null ? `${signed.format(summary.lastDayGain)} XP` : '—'}
        </span>
        <span className="nota">
          {summary.lastDay !== null ? `dia ${dayFormatter.format(summary.lastDay)}` : 'sem leituras'}
          {progress &&
            ` · nível ${progress.currentLevel}, ${percentFormatter.format(
              progress.progressPercent / 100
            )} para o ${progress.nextLevel}`}
        </span>
      </div>

      <div className="stat">
        <span className="rotulo">
          <span style={{ color }}>{name}</span> · {WEEK_DAYS} dias
        </span>
        <span className="num" style={{ color: weekIsLoss ? 'var(--err)' : color }}>
          {summary.weekGain !== null ? `${signed.format(summary.weekGain)} XP` : '—'}
        </span>
        <span className="nota">
          {average !== null
            ? `média de ${plain.format(Math.round(average))} XP por dia, de ${summary.weekDays} ${
                summary.weekDays === 1 ? 'dia' : 'dias'
              } com leitura`
            : 'ainda não há dias suficientes'}
        </span>
      </div>
    </>
  );
}

interface HomePageProps {
  histories: HistoriesByCharacter;
  loading: boolean;
  onNavigate: (id: PageId) => void;
}

/**
 * O painel de hoje.
 *
 * A app não tinha nenhum: abria no painel de um boneco e a pergunta que se faz
 * a abrir isto — quanto é que os dois fizeram ontem, e como correu a semana —
 * obrigava a abrir os dois separadores e a comparar de cabeça.
 */
export function HomePage({ histories, loading, onNavigate }: HomePageProps) {
  const now = Date.now();
  const summaries = PLAYERS.map((player) => ({
    player,
    summary: summarizeCharacter(histories[player.id] ?? [], now),
  }));

  const stale = summaries.filter(
    ({ summary }) => summary.daysSinceLastReading !== null && summary.daysSinceLastReading >= STALE_AFTER_DAYS
  );

  if (loading) return <p className="vazio">A carregar o histórico dos dois bonecos…</p>;

  return (
    <>
      {stale.length > 0 && (
        <p className="aviso warn">
          <Icon name="aviso" size={17} />
          <span>
            A recolha de XP pode estar parada:{' '}
            {stale
              .map(
                ({ player, summary }) =>
                  `${player.name} sem dados novos ${agoText(summary.daysSinceLastReading as number)}`
              )
              .join(' · ')}
            . Vê a tarefa <b>tibia-xp</b> no PC.
          </span>
        </p>
      )}

      <div className="stats">
        {summaries.map(({ player, summary }) => (
          <SummaryTiles key={player.id} summary={summary} name={player.name} color={player.accentColor} />
        ))}
      </div>

      <h2 className="rotulo secao-rotulo">Onde vais mais vezes</h2>
      <div className="atalhos">
        {PLAYERS.map((player) => (
          <a
            key={player.id}
            className="atalho"
            href={`#${player.slug}`}
            onClick={(event) => {
              event.preventDefault();
              onNavigate(player.slug as PageId);
            }}
          >
            <span className="ic">
              <Icon name={player.icon} />
            </span>
            <span>
              <b>{player.name}</b>
              <small>{player.vocation}</small>
            </span>
          </a>
        ))}
        {ATALHOS_INICIO.map((atalho) => (
          <a
            key={atalho.page}
            className="atalho"
            href={`#${atalho.page}`}
            onClick={(event) => {
              event.preventDefault();
              onNavigate(atalho.page);
            }}
          >
            <span className="ic">
              <Icon name={atalho.icon} />
            </span>
            <span>
              <b>{atalho.label}</b>
              <small>{atalho.note}</small>
            </span>
          </a>
        ))}
      </div>

      <div className="card espaco">
        <Suspense fallback={<p className="vazio">A carregar o gráfico…</p>}>
          <DailyGainsChart histories={histories} />
        </Suspense>
      </div>

      <div className="duplo">
        {PLAYERS.map((player) => (
          <div className="card" key={player.id}>
            <div className="cardh">
              <h2>
                <Icon name={player.icon} size={16} />
                <span style={{ color: player.accentColor }}>{player.name}</span>
              </h2>
              <span className="nota">últimas leituras</span>
            </div>
            {(histories[player.id]?.length ?? 0) === 0 ? (
              <p className="vazio">
                Ainda não há histórico. A recolha corre no PC e publica em{' '}
                <code>data/scraped-history/{player.id}.json</code>.
              </p>
            ) : (
              <RecentHistoryList history={histories[player.id] ?? []} />
            )}
          </div>
        ))}
      </div>
    </>
  );
}
