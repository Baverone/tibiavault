import { useEffect, useMemo, useRef, useState } from 'react';
import { PLAYERS, type PlayerMeta } from '../constants/players';
import catalogoJson from '../data/bosses/catalogo.json';
import type { Catalogo } from '../domain/bosses/types';
import { rotacaoSolo, rotacaoTeam, type Contexto } from '../domain/bosses/rotacao';
import { levelForExperience } from '../domain/experienceTable';
import { computeTibiaDayBoundary } from '../domain/tibiaDay';
import type { HistoriesByCharacter } from '../hooks/useAllCharacters';
import { useBosstiary, type EstadoGravacao } from '../hooks/useBosstiary';
import { lerBoosted } from '../storage/boostedBoss';
import { lerRaros } from '../storage/rarosStore';
import { getGithubToken, setGithubToken } from '../storage/githubToken';
import { listaRaros, type LeituraRaros } from '../domain/bosses/raros';
import { ListaRaros } from '../components/bosses/Raros';
import { historyErrorText } from '../storage/sharedHistory';
import { GithubTokenField } from '../components/skillTraining/GithubTokenField';
import { RotacaoSolo, RotacaoTeam } from '../components/bosses/Rotacoes';
import { BosstiaryTabela } from '../components/bosses/BosstiaryTabela';
import '../styles/bosses.css';

const catalogo = catalogoJson as Catalogo;

type Separador = 'solo' | 'team' | 'raros' | 'bosstiary';

/** As previsões dos raros (do GuildStats, gravadas no repositório): lidas uma vez por visita. */
interface Raros {
  leitura: LeituraRaros | null;
  erro: string | null;
}

const TEXTO_GRAVACAO: Record<EstadoGravacao, string> = {
  gravado: 'gravado ✓',
  pendente: 'por gravar…',
  'a gravar': 'a gravar…',
  falhou: 'não gravou',
  'sem chave': 'falta a chave para gravar',
};

const SEPARADORES: [Separador, string][] = [
  ['solo', 'Hoje · solo'],
  ['team', 'Team'],
  ['raros', 'Raros'],
  ['bosstiary', 'Bosstiary'],
];

/**
 * Bosses (22/11/2026): a rota de hoje, solo e team, e o Bosstiary de cada
 * personagem. Desde 24/11/2026 os dois personagens lado a lado (André: «Os dois
 * lado a lado»), em vez de um seletor — no telemóvel um por baixo do outro. O
 * boosted, a chave e o separador são os mesmos para os dois.
 * Desenho: docs/superpowers/specs/2026-11-22-bosses-design.md
 */
export function BossesPage({ histories }: { histories: HistoriesByCharacter }) {
  const [boosted, setBoosted] = useState<string | null>(null);
  const [boostedLido, setBoostedLido] = useState(false);
  const [raros, setRaros] = useState<Raros>({ leitura: null, erro: null });
  const [separador, setSeparador] = useState<Separador>('solo');
  const [temChave, setTemChave] = useState(() => getGithubToken() !== null);
  // Cada coluna lê a chave quando muda (`useBosstiary` guarda-a no seu estado).
  const [versaoChave, setVersaoChave] = useState(0);
  // A rota recalcula-se a cada minuto (o dia da semana vira no server save).
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelado = false;
    void lerBoosted().then((nome) => {
      if (cancelado) return;
      setBoosted(nome);
      setBoostedLido(true);
    });
    lerRaros()
      .then((leitura) => {
        if (!cancelado) setRaros({ leitura, erro: null });
      })
      .catch((err: unknown) => {
        if (!cancelado) setRaros({ leitura: null, erro: historyErrorText(err) });
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const definirChave = (valor: string | null) => {
    setGithubToken(valor);
    setTemChave(getGithubToken() !== null);
    setVersaoChave((n) => n + 1);
  };

  const boostedNoCatalogo = boosted !== null && catalogo.bosses.some((x) => x.nome.toLowerCase() === boosted.toLowerCase());

  return (
    <>
      <section className="card">
        <div className="bosses-boosted">
          {boosted ? (
            <>
              Boosted hoje: <b>{boosted}</b> — uma kill conta 3
              {!boostedNoCatalogo && <span className="nota"> (não está no catálogo)</span>}
            </>
          ) : (
            <span className="nota">{boostedLido ? 'Não deu para ler o boss boosted (TibiaData).' : 'A ler o boss boosted…'}</span>
          )}
        </div>
        <GithubTokenField hasToken={temChave} setToken={definirChave} />
      </section>

      <div className="seg bosses-separadores" role="tablist" aria-label="Separador">
        {SEPARADORES.map(([id, rotulo]) => (
          <button key={id} type="button" role="tab" aria-selected={separador === id} onClick={() => setSeparador(id)}>
            {rotulo}
          </button>
        ))}
      </div>

      <div className="bosses-lado">
        {PLAYERS.map((p) => {
          const historico = histories[p.id] ?? [];
          const ultimo = historico[historico.length - 1];
          const nivel = ultimo ? levelForExperience(ultimo.experience) : null;
          return (
            <ColunaPersonagem
              key={p.id}
              player={p}
              nivel={nivel}
              boosted={boosted}
              raros={raros}
              separador={separador}
              agora={agora}
              versaoChave={versaoChave}
            />
          );
        })}
      </div>
    </>
  );
}

function ColunaPersonagem({
  player,
  nivel,
  boosted,
  raros,
  separador,
  agora,
  versaoChave,
}: {
  player: PlayerMeta;
  nivel: number | null;
  boosted: string | null;
  raros: Raros;
  separador: Separador;
  agora: number;
  versaoChave: number;
}) {
  const b = useBosstiary(player.id);

  // A chave mudou no cartão de cima: esta coluna passa a usá-la.
  const { definirChave } = b;
  const versaoVista = useRef(versaoChave);
  useEffect(() => {
    if (versaoVista.current === versaoChave) return;
    versaoVista.current = versaoChave;
    definirChave(getGithubToken());
  }, [versaoChave, definirChave]);

  const ctx: Contexto = useMemo(
    () => ({
      agora,
      diaSemana: computeTibiaDayBoundary(agora).weekdayIndex,
      nivel,
      personagem: player.id as Contexto['personagem'],
      boosted,
    }),
    [agora, nivel, player.id, boosted]
  );
  const solo = useMemo(() => rotacaoSolo(catalogo, b.estado, ctx), [b.estado, ctx]);
  const team = useMemo(() => rotacaoTeam(catalogo, b.estado, ctx), [b.estado, ctx]);
  const listaR = useMemo(() => listaRaros(catalogo, b.estado, raros.leitura, agora), [b.estado, raros.leitura, agora]);

  return (
    <section className="card bosses-coluna" style={{ borderTopColor: player.accentColor }} aria-label={player.name}>
      <div className="bosses-estado">
        <h2 className="bosses-coluna__nome" style={{ color: player.accentColor }}>
          {player.name} <span className="nota">{nivel !== null ? `nível ${nivel}` : 'nível por ler'}</span>
        </h2>
        <div className={`bosses-gravacao ${b.gravacao.replace(' ', '-')}`}>
          {TEXTO_GRAVACAO[b.gravacao]}
          {b.gravacao === 'falhou' && (
            <>
              {' '}
              <span className="nota">({b.erroGravacao})</span>{' '}
              <button type="button" className="btn sm" onClick={b.tentarOutraVez}>
                tentar outra vez
              </button>
            </>
          )}
        </div>
      </div>
      {b.erro && (
        <p className="field-error">
          Não deu para ler o Bosstiary: {b.erro}{' '}
          <button type="button" className="btn sm" onClick={b.recarregar}>
            Tentar outra vez
          </button>
        </p>
      )}
      {b.carregando ? (
        <p className="nota">A ler o Bosstiary…</p>
      ) : separador === 'solo' ? (
        <RotacaoSolo blocos={solo.blocos} endgame={solo.endgame} mudar={b.mudar} />
      ) : separador === 'team' ? (
        <RotacaoTeam principais={team.principais} soBosstiary={team.soBosstiary} mudar={b.mudar} />
      ) : separador === 'raros' ? (
        <ListaRaros entradas={listaR} leitura={raros.leitura} erro={raros.erro} agora={agora} mudar={b.mudar} />
      ) : (
        <BosstiaryTabela catalogo={catalogo} estado={b.estado} mudar={b.mudar} />
      )}
    </section>
  );
}
