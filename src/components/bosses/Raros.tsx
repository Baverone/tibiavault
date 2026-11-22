import type { Alteracao } from '../../domain/bosses/estado';
import { patamar } from '../../domain/bosses/bosstiary';
import { leituraVelha, type EntradaRaro, type LeituraRaros, type Previsao } from '../../domain/bosses/raros';
import { NOME_PATAMAR, textoProgresso } from './texto';

const dataHora = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const pct = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 });

function textoPrevisao(p: Previsao | null): { texto: string; classe: string } {
  if (!p) return { texto: 'sem previsão', classe: '' };
  if (p.tipo === 'pct') return { texto: `hoje: ${pct.format(p.valor)} %`, classe: 'raro-chance' };
  if (p.tipo === 'baixa') return { texto: 'chance baixa', classe: '' };
  if (p.emDias === null) return { texto: 'fora da janela', classe: 'raro-fora' };
  return { texto: `janela abre em ${p.emDias} ${p.emDias === 1 ? 'dia' : 'dias'}`, classe: 'raro-fora' };
}

function textoVisto(e: EntradaRaro): string {
  if (!e.ultimoVisto || e.diasDesde === null) return 'nunca visto no Celesta';
  const [, m, d] = e.ultimoVisto.split('-');
  const quando = e.diasDesde <= 0 ? 'hoje' : e.diasDesde === 1 ? 'ontem' : `há ${e.diasDesde} dias`;
  return `visto ${quando} (${d}/${m})`;
}

/**
 * Os bosses raros do Celesta (22/11/2026): a chance de hoje que o GuildStats
 * calcula, ao lado do progresso no Bosstiary. São os únicos bosses da página
 * com «cooldown», a pedido do André.
 */
export function ListaRaros({
  entradas,
  leitura,
  erro,
  agora,
  mudar,
}: {
  entradas: EntradaRaro[];
  leitura: LeituraRaros | null;
  erro: string | null;
  agora: number;
  mudar: (a: Alteracao) => void;
}) {
  return (
    <>
      <p className="nota">
        Os bosses de spawn raro que contam para o Bosstiary, pela chance de aparecerem hoje no Celesta. A previsão é do{' '}
        <a href={leitura?.fonte || 'https://guildstats.eu/bosses?world=Celesta'} target="_blank" rel="noreferrer">
          GuildStats
        </a>
        {leitura ? `, lida a ${dataHora.format(new Date(leitura.lidoEm))}` : ''} e muda uma vez por dia, depois do server
        save.
      </p>
      {erro && <p className="field-error">Não deu para ler as previsões: {erro}</p>}
      {!erro && !leitura && <p className="nota">Ainda não há previsões gravadas.</p>}
      {leitura && leituraVelha(leitura, agora) && (
        <p className="field-error">A previsão não muda há mais de 36 h: a leitura no PC pode estar parada.</p>
      )}
      <ul className="bosses-tabela">
        {entradas.map((e) => {
          const prev = textoPrevisao(e.previsao);
          return (
            <li key={e.boss.id} className="bosses-linha">
              <div className="bosses-linha__nome" title={e.boss.area}>
                {e.boss.fontes[0] ? (
                  <a href={e.boss.fontes[0]} target="_blank" rel="noreferrer">
                    <b>{e.boss.nome}</b>
                  </a>
                ) : (
                  <b>{e.boss.nome}</b>
                )}
                <span className="bosses-tag">{e.boss.categoria}</span>
                <span className={`bosses-tag ${prev.classe}`}>{prev.texto}</span>
              </div>
              <div className="bosses-linha__prog">
                <span>{textoProgresso(e.estado.kills, e.boss.categoria)}</span>
                <span className="nota">{NOME_PATAMAR[patamar(e.estado.kills, e.boss.categoria)]}</span>
              </div>
              <div className="bosses-linha__acoes">
                <span className="nota">
                  {textoVisto(e)}
                  {e.ontem > 0 ? ` · morto ontem ×${e.ontem}` : ''}
                </span>
                <button
                  type="button"
                  className="btn sm pri"
                  onClick={() => mudar({ tipo: 'kill', id: e.boss.id, quantas: 1, quando: new Date().toISOString() })}
                  title="conta 1 kill"
                >
                  +1
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
