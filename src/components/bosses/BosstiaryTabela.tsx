import { useMemo, useState } from 'react';
import { bonusLoot, objetivoOmissao, patamar, pontos, proximo } from '../../domain/bosses/bosstiary';
import { acessoEfetivo, estadoDe, type Alteracao, type EstadoPersonagem } from '../../domain/bosses/estado';
import { marcaEfetiva } from '../../domain/bosses/rotacao';
import type { Catalogo, Categoria, Patamar } from '../../domain/bosses/types';
import { lerNumero } from '../../domain/bosses/numero';
import { SeletorMarca } from './LinhaBoss';
import { NOME_PATAMAR, textoProgresso } from './texto';

const SEGUNDO_SLOT = 1500;

type FiltroModo = 'todos' | 'solo' | 'team';

/**
 * Um número escrito à mão, gravado ao sair do campo (Enter também). Vazio ou
 * lixo não grava: o campo volta ao que estava (`permitirVazio` = vazio limpa).
 */
function CampoNumero({
  valor,
  onGravar,
  rotulo,
  permitirVazio = false,
}: {
  valor: number | null;
  onGravar: (n: number | null) => void;
  rotulo: string;
  permitirVazio?: boolean;
}) {
  const [rascunho, setRascunho] = useState<string | null>(null);
  const gravar = () => {
    if (rascunho === null) return;
    const n = lerNumero(rascunho, permitirVazio);
    if (n !== undefined && n !== valor) onGravar(n);
    setRascunho(null);
  };
  return (
    <input
      type="number"
      min={0}
      inputMode="numeric"
      className="bosses-num"
      aria-label={rotulo}
      value={rascunho ?? (valor === null ? '' : String(valor))}
      onChange={(ev) => setRascunho(ev.target.value)}
      onBlur={gravar}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur();
      }}
    />
  );
}

export function BosstiaryTabela({
  catalogo,
  estado,
  mudar,
}: {
  catalogo: Catalogo;
  estado: EstadoPersonagem;
  mudar: (a: Alteracao) => void;
}) {
  const [categoria, setCategoria] = useState<Categoria | 'todas'>('todas');
  const [modo, setModo] = useState<FiltroModo>('todos');
  const [busca, setBusca] = useState('');
  const [soPorFazer, setSoPorFazer] = useState(false);

  const total = useMemo(
    () => catalogo.bosses.reduce((s, b) => s + pontos(estadoDe(estado, b.id).kills, b.categoria), 0),
    [catalogo, estado]
  );
  const pontosContam = estado.pontosJogo ?? total;

  const linhas = catalogo.bosses.filter((b) => {
    const eb = estadoDe(estado, b.id);
    if (categoria !== 'todas' && b.categoria !== categoria) return false;
    if (modo === 'solo' && !b.solo) return false;
    if (modo === 'team' && !b.team) return false;
    if (busca && !b.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    if (soPorFazer && proximo(eb.kills, b.categoria) === null) return false;
    return true;
  });

  return (
    <>
      <div className="bosses-resumo">
        <div>
          <span className="bosses-resumo__l">Pontos (catálogo)</span>
          <b>{total}</b>
        </div>
        <div>
          <span className="bosses-resumo__l">Pontos no jogo</span>
          <CampoNumero
            valor={estado.pontosJogo}
            rotulo="Pontos no jogo"
            permitirVazio
            onGravar={(n) => mudar({ tipo: 'pontosJogo', valor: n })}
          />
        </div>
        <div>
          <span className="bosses-resumo__l">2.º slot</span>
          <b>{pontosContam >= SEGUNDO_SLOT ? 'aberto' : `faltam ${SEGUNDO_SLOT - pontosContam}`}</b>
        </div>
        <div>
          <span className="bosses-resumo__l">Bónus de loot no slot</span>
          <b title="estimado pela fórmula de 2022 (TibiaQA 30817)">~{bonusLoot(pontosContam)} %</b>
        </div>
      </div>
      {estado.pontosJogo !== null && estado.pontosJogo !== total && (
        <p className="nota">
          O jogo diz {estado.pontosJogo} e o catálogo soma {total}: a diferença são bosses fora do catálogo (ou kills por
          escrever aqui). Conta o do jogo.
        </p>
      )}

      <div className="bosses-filtros">
        <input type="search" placeholder="procurar boss" value={busca} onChange={(ev) => setBusca(ev.target.value)} aria-label="Procurar boss" />
        <select value={categoria} onChange={(ev) => setCategoria(ev.target.value as Categoria | 'todas')} aria-label="Categoria">
          <option value="todas">todas as categorias</option>
          <option value="Bane">Bane</option>
          <option value="Archfoe">Archfoe</option>
          <option value="Nemesis">Nemesis</option>
        </select>
        <select value={modo} onChange={(ev) => setModo(ev.target.value as FiltroModo)} aria-label="Solo ou team">
          <option value="todos">solo e team</option>
          <option value="solo">só solo</option>
          <option value="team">só team</option>
        </select>
        <label className="nota">
          <input type="checkbox" checked={soPorFazer} onChange={(ev) => setSoPorFazer(ev.target.checked)} /> só os que
          faltam
        </label>
        <span className="nota">{linhas.length} bosses</span>
      </div>

      <ul className="bosses-tabela">
        {linhas.map((b) => {
          const eb = estadoDe(estado, b.id);
          const acesso = acessoEfetivo(eb);
          const objetivo = eb.objetivo ?? objetivoOmissao(b.categoria);
          return (
            <li key={b.id} className="bosses-linha">
              <div className="bosses-linha__nome" title={[b.area, b.acesso && `Acesso: ${b.acesso}`, b.loot && `Loot: ${b.loot}`].filter(Boolean).join('\n')}>
                <b>{b.nome}</b>
                <span className="bosses-tag">{b.categoria}</span>
                {b.solo && <span className="bosses-tag">solo</span>}
                {b.team && <span className="bosses-tag">team</span>}
                {b.incerto && <span className="bosses-tag" title="há valores por confirmar">~</span>}
              </div>
              <div className="bosses-linha__prog">
                <CampoNumero valor={eb.kills} rotulo={`Kills de ${b.nome}`} onGravar={(n) => mudar({ tipo: 'kills', id: b.id, valor: n ?? 0 })} />
                <span className="nota">{textoProgresso(eb.kills, b.categoria)} · {NOME_PATAMAR[patamar(eb.kills, b.categoria)]}</span>
              </div>
              <div className="bosses-linha__acoes">
                <select
                  className="bosses-marca"
                  value={acesso === null ? '?' : acesso ? 'sim' : 'nao'}
                  aria-label={`Acesso a ${b.nome}`}
                  onChange={(ev) => mudar({ tipo: 'acesso', id: b.id, acesso: ev.target.value === '?' ? null : ev.target.value === 'sim' })}
                >
                  <option value="?">acesso ?</option>
                  <option value="sim">tenho acesso</option>
                  <option value="nao">sem acesso</option>
                </select>
                <select
                  className="bosses-marca"
                  value={objetivo}
                  aria-label={`Objetivo de ${b.nome}`}
                  onChange={(ev) => mudar({ tipo: 'objetivo', id: b.id, objetivo: ev.target.value as Patamar })}
                >
                  <option value="prowess">objetivo Prowess</option>
                  <option value="expertise">objetivo Expertise</option>
                  <option value="mastery">objetivo Mastery</option>
                </select>
                {b.solo && <span className="nota">solo</span>}
                {b.solo && <SeletorMarca modo="solo" marca={marcaEfetiva(b, eb, 'solo')} onChange={(m) => mudar({ tipo: 'marca', id: b.id, modo: 'solo', marca: m })} />}
                {b.team && <span className="nota">team</span>}
                {b.team && <SeletorMarca modo="team" marca={marcaEfetiva(b, eb, 'team')} onChange={(m) => mudar({ tipo: 'marca', id: b.id, modo: 'team', marca: m })} />}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
