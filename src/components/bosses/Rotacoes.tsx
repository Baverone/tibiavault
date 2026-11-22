import type { Alteracao } from '../../domain/bosses/estado';
import type { BlocoHoje, Entrada } from '../../domain/bosses/rotacao';
import type { Modo } from '../../domain/bosses/types';
import { LinhaBoss } from './LinhaBoss';

function duracao(min: number): string {
  if (min <= 0) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `~${h} h ${String(m).padStart(2, '0')}` : `~${m} min`;
}

function BlocoLista({ bloco, i, modo, mudar }: { bloco: BlocoHoje; i: number; modo: Modo; mudar: (a: Alteracao) => void }) {
  const n = bloco.entradas.length;
  return (
    <section className="bosses-bloco">
      <h3>
        <span className="bosses-bloco__n">{i + 1}</span> {bloco.bloco.nome}
        <span className="nota">
          {n} {n === 1 ? 'boss' : 'bosses'} {duracao(bloco.minutos)}
        </span>
      </h3>
      <ul>
        {bloco.entradas.map((e) => (
          <LinhaBoss key={e.boss.id} entrada={e} modo={modo} mudar={mudar} />
        ))}
      </ul>
    </section>
  );
}

const totalMin = (blocos: BlocoHoje[]) => blocos.reduce((s, b) => s + b.minutos, 0);

export function RotacaoSolo({
  blocos,
  endgame,
  mudar,
}: {
  blocos: BlocoHoje[];
  endgame: Entrada[];
  mudar: (a: Alteracao) => void;
}) {
  return (
    <>
      <p className="nota">
        A rota de hoje, pela ordem das áreas: os bosses de equipamento de todos os dias e o varrimento do Bosstiary do
        dia da semana. Estimativa: {duracao(totalMin(blocos)) || '—'} (tempos aproximados, sem fonte). Os cooldowns
        vês no jogo: aqui não se contam.
      </p>
      {blocos.length === 0 && <p className="nota">Nada disponível hoje com as marcas atuais.</p>}
      {blocos.map((b, i) => (
        <BlocoLista key={b.bloco.id} bloco={b} i={i} modo="solo" mudar={mudar} />
      ))}
      {endgame.length > 0 && (
        <details className="bosses-bloco">
          <summary>
            Endgame a testar ({endgame.length}) — faz uma vez; se correr bem, «passou» põe-no na rota
          </summary>
          <ul>
            {endgame.map((e) => (
              <LinhaBoss key={e.boss.id} entrada={e} modo="solo" mudar={mudar} aTestar />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

export function RotacaoTeam({
  principais,
  soBosstiary,
  mudar,
}: {
  principais: BlocoHoje[];
  soBosstiary: BlocoHoje[];
  mudar: (a: Alteracao) => void;
}) {
  return (
    <>
      <p className="nota">
        As sessões de team com equipamento ou lucro que têm pelo menos um boss em jogo. Faz a que o grupo conseguir e
        estiver fora de cooldown no jogo.
      </p>
      {principais.map((b, i) => (
        <BlocoLista key={b.bloco.id} bloco={b} i={i} modo="team" mudar={mudar} />
      ))}
      {soBosstiary.length > 0 && (
        <details className="bosses-bloco">
          <summary>Só Bosstiary ({soBosstiary.length} sessões)</summary>
          {soBosstiary.map((b, i) => (
            <BlocoLista key={b.bloco.id} bloco={b} i={i} modo="team" mudar={mudar} />
          ))}
        </details>
      )}
    </>
  );
}
