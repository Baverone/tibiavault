import { useEffect, useMemo, useState } from 'react';
import { PLAYERS, type PlayerMeta } from '../constants/players';
import catalogoJson from '../data/bosses/catalogo.json';
import type { Catalogo } from '../domain/bosses/types';
import { rotacaoSolo, rotacaoTeam, type Contexto } from '../domain/bosses/rotacao';
import { levelForExperience } from '../domain/experienceTable';
import { computeTibiaDayBoundary } from '../domain/tibiaDay';
import type { HistoriesByCharacter } from '../hooks/useAllCharacters';
import { useBosstiary, type EstadoGravacao } from '../hooks/useBosstiary';
import { lerBoosted } from '../storage/boostedBoss';
import { GithubTokenField } from '../components/skillTraining/GithubTokenField';
import { RotacaoSolo, RotacaoTeam } from '../components/bosses/Rotacoes';
import { BosstiaryTabela } from '../components/bosses/BosstiaryTabela';
import '../styles/bosses.css';

const catalogo = catalogoJson as Catalogo;

const CHAVE_PERSONAGEM = 'tibiavault:bosses-personagem';
type Separador = 'solo' | 'team' | 'bosstiary';

function lerPersonagem(): string {
  try {
    const v = localStorage.getItem(CHAVE_PERSONAGEM);
    return PLAYERS.some((p) => p.slug === v) ? (v as string) : PLAYERS[0].slug;
  } catch {
    return PLAYERS[0].slug;
  }
}

const TEXTO_GRAVACAO: Record<EstadoGravacao, string> = {
  gravado: 'gravado ✓',
  pendente: 'por gravar…',
  'a gravar': 'a gravar…',
  falhou: 'não gravou',
  'sem chave': 'falta a chave para gravar',
};

/**
 * Bosses (22/11/2026): a rota de hoje, solo e team, e o Bosstiary de cada
 * personagem. Desenho: docs/superpowers/specs/2026-11-22-bosses-design.md
 */
export function BossesPage({ histories }: { histories: HistoriesByCharacter }) {
  const [slug, setSlug] = useState(lerPersonagem);
  const [boosted, setBoosted] = useState<string | null>(null);
  const [boostedLido, setBoostedLido] = useState(false);

  useEffect(() => {
    let cancelado = false;
    void lerBoosted().then((nome) => {
      if (cancelado) return;
      setBoosted(nome);
      setBoostedLido(true);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const escolher = (s: string) => {
    setSlug(s);
    try {
      localStorage.setItem(CHAVE_PERSONAGEM, s);
    } catch {
      // sem armazenamento: a escolha vale até fechar a página
    }
  };

  const player = PLAYERS.find((p) => p.slug === slug) ?? PLAYERS[0];
  const historico = histories[player.id] ?? [];
  const ultimo = historico[historico.length - 1];
  const nivel = ultimo ? levelForExperience(ultimo.experience) : null;

  return (
    <>
      <div className="bosses-topo">
        <div className="seg" role="tablist" aria-label="Personagem">
          {PLAYERS.map((p) => (
            <button key={p.slug} type="button" role="tab" aria-selected={p.slug === slug} onClick={() => escolher(p.slug)}>
              {p.name}
            </button>
          ))}
        </div>
        <span className="nota">{nivel !== null ? `nível ${nivel}` : 'nível por ler'}</span>
      </div>
      <PaginaPersonagem key={player.id} player={player} nivel={nivel} boosted={boosted} boostedLido={boostedLido} />
    </>
  );
}

function PaginaPersonagem({
  player,
  nivel,
  boosted,
  boostedLido,
}: {
  player: PlayerMeta;
  nivel: number | null;
  boosted: string | null;
  boostedLido: boolean;
}) {
  const b = useBosstiary(player.id);
  const [separador, setSeparador] = useState<Separador>('solo');
  // A rota recalcula-se a cada minuto (os cooldowns acabam sozinhos).
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

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

  const boostedNoCatalogo = boosted !== null && catalogo.bosses.some((x) => x.nome.toLowerCase() === boosted.toLowerCase());

  return (
    <>
      <section className="card">
        <div className="bosses-estado">
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
        <GithubTokenField hasToken={b.temChave} setToken={b.definirChave} />
        {b.erro && (
          <p className="field-error">
            Não deu para ler o Bosstiary: {b.erro}{' '}
            <button type="button" className="btn sm" onClick={b.recarregar}>
              Tentar outra vez
            </button>
          </p>
        )}
      </section>

      <section className="card">
        <div className="seg" role="tablist" aria-label="Separador">
          {(
            [
              ['solo', 'Hoje · solo'],
              ['team', 'Team'],
              ['bosstiary', 'Bosstiary'],
            ] as [Separador, string][]
          ).map(([id, rotulo]) => (
            <button key={id} type="button" role="tab" aria-selected={separador === id} onClick={() => setSeparador(id)}>
              {rotulo}
            </button>
          ))}
        </div>
        {b.carregando ? (
          <p className="nota">A ler o Bosstiary…</p>
        ) : separador === 'solo' ? (
          <RotacaoSolo blocos={solo.blocos} endgame={solo.endgame} mudar={b.mudar} />
        ) : separador === 'team' ? (
          <RotacaoTeam principais={team.principais} soBosstiary={team.soBosstiary} mudar={b.mudar} />
        ) : (
          <BosstiaryTabela catalogo={catalogo} estado={b.estado} mudar={b.mudar} />
        )}
      </section>
    </>
  );
}
