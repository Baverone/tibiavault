import { Suspense, lazy } from 'react';
import type { PlayerMeta } from '../constants/players';
import { getLevelProgress } from '../domain/levelProgress';
import { agoText, STALE_AFTER_DAYS, summarizeCharacter } from '../domain/homeSummary';
import { useCharacterState } from '../hooks/useCharacterState';
import { CHARACTER_SECTIONS } from '../navigation/pages';
import { Icon } from '../components/shell/icons';
import { PageIndex } from '../components/shell/PageIndex';
import { LevelProgressCard } from '../components/xp/LevelProgressCard';
import { XpForecastCard } from '../components/xp/XpForecastCard';
import { HuntPlannerCard } from '../components/xp/HuntPlannerCard';
import { RecentHistoryList } from '../components/charts/RecentHistoryList';
import { SkillTrainingCalculator } from '../components/skillTraining/SkillTrainingCalculator';

/**
 * O gráfico arrasta o Recharts atrás dele — sozinho, dois terços do JavaScript
 * da app. Carregado à parte, o resto da página aparece sem esperar por ele.
 */
const XpProgressChart = lazy(() =>
  import('../components/charts/XpProgressChart').then((module) => ({ default: module.XpProgressChart }))
);

/** Os blocos, por ordem. A lista está em `navigation/pages.ts` para o índice
 *  vertical e as âncoras das secções não poderem discordar. */
const [NIVEL, PROGRESSAO, PREVISAO, HUNT, TREINO] = CHARACTER_SECTIONS;

interface CharacterPageProps {
  player: PlayerMeta;
}

/**
 * A página de um boneco: nível, progressão, previsão, calculadora de hunt e
 * varinhas de treino.
 *
 * Era o `PlayerPanel`, um `<section>` escondido com `display:none` quando o
 * separador não estava ativo. É o mesmo conteúdo, com endereço próprio e com um
 * índice vertical — a página tem ~2 800 px e chegar à calculadora de hunt era
 * rolar até lá e esperar reconhecê-la.
 */
export function CharacterPage({ player }: CharacterPageProps) {
  const { history, loading } = useCharacterState(player.id);
  const summary = summarizeCharacter(history, Date.now());
  const progress = summary.experience !== null ? getLevelProgress(summary.experience) : null;
  const isStale = summary.daysSinceLastReading !== null && summary.daysSinceLastReading >= STALE_AFTER_DAYS;

  if (loading) return <p className="vazio">A carregar o histórico do {player.name}…</p>;

  if (!progress) {
    return (
      <p className="vazio">
        Ainda não há histórico para o {player.name}. A recolha corre no PC e publica em{' '}
        <code>data/scraped-history/{player.id}.json</code>.
      </p>
    );
  }

  return (
    <div className="comidx">
      <PageIndex entries={CHARACTER_SECTIONS} />

      <div>
        {isStale && (
          <p className="aviso warn">
            <Icon name="aviso" size={17} />
            <span>
              A leitura mais recente é de {agoText(summary.daysSinceLastReading as number)}. A recolha diária pode
              estar parada — vê a tarefa <b>tibia-xp</b> no PC.
            </span>
          </p>
        )}

        <section className="card secao" id={NIVEL.id}>
          <div className="cardh">
            <h2>
              <Icon name={NIVEL.icon} size={16} />
              {NIVEL.label}
            </h2>
            <span className="nota">
              {summary.lastDay !== null && `última leitura ${agoText(summary.daysSinceLastReading as number)}`}
            </span>
          </div>
          <LevelProgressCard progress={progress} accentColor={player.accentColor} />
        </section>

        <section className="card secao" id={PROGRESSAO.id}>
          <div className="cardh">
            <h2>
              <Icon name={PROGRESSAO.icon} size={16} />
              {PROGRESSAO.label}
            </h2>
          </div>
          <Suspense fallback={<div className="vazio">A carregar o gráfico…</div>}>
            <XpProgressChart history={history} accentColor={player.accentColor} />
          </Suspense>
          <RecentHistoryList history={history} />
        </section>

        <section className="card secao" id={PREVISAO.id}>
          <div className="cardh">
            <h2>
              <Icon name={PREVISAO.icon} size={16} />
              {PREVISAO.label}
            </h2>
          </div>
          <XpForecastCard
            history={history}
            currentExperience={summary.experience as number}
            accentColor={player.accentColor}
          />
        </section>

        <section className="card secao" id={HUNT.id}>
          <div className="cardh">
            <h2>
              <Icon name={HUNT.icon} size={16} />
              {HUNT.label}
            </h2>
          </div>
          <HuntPlannerCard
            personagem={player.id}
            xpAtual={summary.experience as number}
            accentColor={player.accentColor}
          />
        </section>

        <section className="card secao" id={TREINO.id}>
          <div className="cardh">
            <h2>
              <Icon name={TREINO.icon} size={16} />
              {TREINO.label}
            </h2>
          </div>
          <SkillTrainingCalculator player={player} />
        </section>
      </div>
    </div>
  );
}
