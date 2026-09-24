import { RashidCard } from '../components/rashid/RashidCard';
import { TibiadromeSection } from '../components/tibiadrome/TibiadromeSection';
import { Icon } from '../components/shell/icons';

/**
 * Os dois relógios do mundo: o Rashid e a rotação do Tibiadrome.
 *
 * Estavam os dois empilhados no topo da app, por cima de qualquer separador —
 * 180 px de informação que muda uma vez por dia (o Rashid) e uma vez de cinco
 * em cinco semanas (a rotação), à frente da XP, que muda todos os dias. São o
 * mesmo tipo de coisa — «o que é que o mundo está a fazer hoje» — e é isso que
 * os põe na mesma página.
 */
export function MundoPage() {
  return (
    <>
      <section className="card">
        <div className="cardh">
          <h2>
            <Icon name="mapa" size={16} />
            Rashid
          </h2>
          <span className="nota">muda no server save, às 9:00 de Lisboa</span>
        </div>
        <RashidCard />
      </section>

      <section className="card">
        <div className="cardh">
          <h2>
            <Icon name="relogio" size={16} />
            Tibiadrome
          </h2>
        </div>
        <TibiadromeSection />
      </section>
    </>
  );
}
