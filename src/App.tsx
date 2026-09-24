import { PLAYERS, playerBySlug } from './constants/players';
import { useHashRoute } from './hooks/useHashRoute';
import { useAllCharacters } from './hooks/useAllCharacters';
import { summarizeCharacter } from './domain/homeSummary';
import { AppShell } from './components/shell/AppShell';
import { TimersPanel } from './components/timers/TimersPanel';
import { HomePage } from './pages/HomePage';
import { CharacterPage } from './pages/CharacterPage';
import { CelestaPage } from './pages/CelestaPage';
import { MundoPage } from './pages/MundoPage';
import { StaminaCalculator } from './components/stamina/StaminaCalculator';
import { ArrowsCalculator } from './components/arrows/ArrowsCalculator';
import { PAGE_AJUDA } from './pages/ajuda';

const hoje = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * A app: a casca comum, e dentro dela a página que o endereço pedir.
 *
 * Era um ficheiro com dois `useState` de separador, um `localStorage` por cada
 * um e três painéis montados ao mesmo tempo com `display:none` — «para que um
 * filtro meio preenchido não se perca ao trocar de separador». Isso deixou de
 * ser preciso: o que tinha de sobreviver à troca de página já sobrevive ao
 * recarregar, porque está no `localStorage` (o filtro de spots, os campos da
 * calculadora de hunt, os do treino de skills).
 *
 * O que continua montado em permanência são os TIMERS, e de propósito: são a
 * única coisa da app com contagem a correr, e são para estar à vista enquanto
 * se caça, seja qual for a página aberta.
 */
function App() {
  const [page, navigate] = useHashRoute();
  const { histories, loading } = useAllCharacters();

  const player = playerBySlug(page);

  let subtitle: string | undefined;
  let content = null;

  if (player) {
    content = <CharacterPage player={player} />;
    subtitle = `${player.vocation} — a XP, a previsão, a calculadora de hunt e as varinhas de treino.`;
  } else if (page === 'inicio') {
    content = <HomePage histories={histories} loading={loading} onNavigate={navigate} />;
    const niveis = PLAYERS.map((p) => {
      const resumo = summarizeCharacter(histories[p.id] ?? [], Date.now());
      return resumo.level !== null ? `${p.name} no nível ${resumo.level}` : `${p.name} ainda sem dados`;
    });
    subtitle = loading
      ? `O que a XP diz hoje (${hoje.format(new Date())}).`
      : `O que a XP diz hoje (${hoje.format(new Date())}): ${niveis.join(', ')}.`;
  } else if (page === 'stamina') {
    content = <StaminaCalculator />;
  } else if (page === 'flechas') {
    content = <ArrowsCalculator />;
  } else if (page === 'celesta') {
    content = <CelestaPage />;
  } else {
    content = <MundoPage />;
  }

  return (
    <AppShell
      page={page}
      onNavigate={navigate}
      subtitle={subtitle}
      timers={
        <div className="timers-host">
          <div className="pghin">
            <TimersPanel />
          </div>
        </div>
      }
      help={PAGE_AJUDA[page]}
    >
      {content}
    </AppShell>
  );
}

export default App;
