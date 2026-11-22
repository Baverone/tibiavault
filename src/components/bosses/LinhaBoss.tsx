import type { Alteracao } from '../../domain/bosses/estado';
import { acessoEfetivo } from '../../domain/bosses/estado';
import { patamar } from '../../domain/bosses/bosstiary';
import { NOME_PATAMAR, textoProgresso } from './texto';
import type { Entrada } from '../../domain/bosses/rotacao';
import type { Marca, Modo } from '../../domain/bosses/types';

const horas = new Intl.DateTimeFormat('pt-PT', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

const MARCAS: { valor: Marca; rotulo: string }[] = [
  { valor: 'sempre', rotulo: 'sempre' },
  { valor: 'bosstiary', rotulo: 'Bosstiary' },
  { valor: 'fora', rotulo: 'fora' },
];

export function SeletorMarca({ marca, onChange, modo }: { marca: Marca; onChange: (m: Marca) => void; modo: Modo }) {
  return (
    <select
      className="bosses-marca"
      value={marca}
      aria-label={`Marca ${modo === 'solo' ? 'solo' : 'team'}`}
      onChange={(ev) => onChange(ev.target.value as Marca)}
    >
      {MARCAS.map((m) => (
        <option key={m.valor} value={m.valor}>
          {m.rotulo}
        </option>
      ))}
    </select>
  );
}

interface LinhaBossProps {
  entrada: Entrada;
  modo: Modo;
  mudar: (a: Alteracao) => void;
  /** Mostra o botão «passou» (bloco endgame a testar). */
  aTestar?: boolean;
}

/** Uma linha da rotação: o boss, o progresso no Bosstiary, a marca e o +1. */
export function LinhaBoss({ entrada, modo, mudar, aTestar = false }: LinhaBossProps) {
  const { boss, estado, marca, disponivelEm, boosted, nivelEstimado } = entrada;
  const quantas = boosted ? 3 : 1;
  const acesso = acessoEfetivo(estado);
  const nivel = modo === 'solo' ? null : boss.team?.nivel ?? null;
  const tamanho = modo === 'team' && boss.team?.tamanhoTipico ? `${boss.team.tamanhoTipico} jogadores` : null;
  const titulo = [boss.area, boss.acesso && `Acesso: ${boss.acesso}`, boss.loot && `Loot: ${boss.loot}`, boss.incerto && 'Há valores por confirmar.']
    .filter(Boolean)
    .join('\n');

  return (
    <li className={`bosses-linha${disponivelEm !== null ? ' em-cooldown' : ''}${boosted ? ' boosted' : ''}`}>
      <div className="bosses-linha__nome" title={titulo}>
        <b>{boss.nome}</b>
        {boosted && <span className="bosses-tag boosted">boosted ×3</span>}
        <span className="bosses-tag">{boss.categoria}</span>
        {(modo === 'solo' ? boss.solo?.dificil : false) && <span className="bosses-tag warn">difícil</span>}
        {nivelEstimado && <span className="bosses-tag" title="nível estimado, não confirmado">~nível</span>}
        {tamanho && <span className="bosses-tag">{tamanho}</span>}
        {nivel !== null && <span className="bosses-tag">nível {nivel}+</span>}
      </div>
      <div className="bosses-linha__prog">
        <span>{textoProgresso(estado.kills, boss.categoria)}</span>
        <span className="nota">{NOME_PATAMAR[patamar(estado.kills, boss.categoria)]}</span>
      </div>
      <div className="bosses-linha__acoes">
        {disponivelEm !== null && <span className="nota">volta {horas.format(new Date(disponivelEm))}</span>}
        {acesso === null && (
          <span className="bosses-acesso">
            acesso?{' '}
            <button type="button" className="btn sm" onClick={() => mudar({ tipo: 'acesso', id: boss.id, acesso: true })}>
              tenho
            </button>
            <button type="button" className="btn sm" onClick={() => mudar({ tipo: 'acesso', id: boss.id, acesso: false })}>
              sem acesso
            </button>
          </span>
        )}
        <SeletorMarca marca={marca} modo={modo} onChange={(m) => mudar({ tipo: 'marca', id: boss.id, modo, marca: m })} />
        {aTestar && (
          <button type="button" className="btn sm" onClick={() => mudar({ tipo: 'passou', id: boss.id, passou: true })}>
            passou
          </button>
        )}
        <button
          type="button"
          className="btn sm pri"
          onClick={() => mudar({ tipo: 'kill', id: boss.id, quantas, quando: new Date().toISOString() })}
          title={boosted ? 'boosted: conta 3 kills' : 'conta 1 kill e guarda a hora (cooldown)'}
        >
          +{quantas}
        </button>
      </div>
    </li>
  );
}
