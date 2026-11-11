import { useMemo, useState } from 'react';
import { PLAYERS, type PlayerMeta } from '../constants/players';
import { levelForExperience } from '../domain/experienceTable';
import {
  dailyXpToShareIn,
  DEFAULT_SHARE_WINDOW,
  MAX_DAILY_XP,
  MAX_LATER_SHARE_DAYS,
  MAX_SHARE_DAYS,
  noShareReason,
  parseDailyXp,
  SHARE_TARGETS,
  SHARE_WINDOWS,
  shareGap,
  shareVerdict,
  type ShareCharacter,
  type ShareVerdict,
} from '../domain/shareProjection';
import { computeRateOverWindow } from '../domain/xpForecast';
import type { HistoriesByCharacter } from '../hooks/useAllCharacters';
import type { PageId } from '../navigation/pages';
import { Icon } from '../components/shell/icons';
import { HistoryErrorNote } from '../components/shell/HistoryErrorNote';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const plain = new Intl.NumberFormat('pt-PT');
const dateFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timesFormatter = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 });

function xp(value: number): string {
  return `${plain.format(Math.round(value))} XP`;
}

function daysText(days: number): string {
  return days === 1 ? '1 dia' : `${plain.format(days)} dias`;
}

interface MeasuredCharacter {
  player: PlayerMeta;
  experience: number;
  /** XP por dia medida na janela; `null` sem leituras que cheguem. */
  measuredDailyXp: number | null;
  /** Quando foi a leitura mais recente (ms) — depois de alinhar, a mais recente dos dois. */
  lastReading: number;
  /**
   * Dias que a XP deste foi puxada para a frente, ao ritmo medido, para ficar
   * no mesmo dia que a do outro. 0 quando as leituras são do mesmo dia.
   */
  extrapolatedDays: number;
}

/**
 * Os dois bonecos com a XP mais recente e o ritmo da janela, o mais alto
 * primeiro. `null` enquanto algum não tiver histórico.
 *
 * O ritmo é o mesmo `computeRateOverWindow` da Previsão, para a página não
 * dizer uma XP/dia diferente da que está na página de cada um.
 */
function measureBoth(histories: HistoriesByCharacter, windowDays: number): [MeasuredCharacter, MeasuredCharacter] | null {
  const measured: MeasuredCharacter[] = [];
  for (const player of PLAYERS) {
    const history = histories[player.id] ?? [];
    const last = history.at(-1);
    if (!last) return null;
    measured.push({
      player,
      experience: last.experience,
      measuredDailyXp: computeRateOverWindow(history, windowDays)?.averageDailyXp ?? null,
      lastReading: last.timestamp,
      extrapolatedDays: 0,
    });
  }
  // 11/11/2026 (auditoria, Codex e revisão própria): com uma leitura de dia 10 e
  // outra de dia 5, as contas tratavam-nas como do mesmo dia — o de leitura
  // mais antiga perdia cinco dias de XP. Puxa-se esse para o dia do outro, ao
  // ritmo que ele próprio tem feito, e a página di-lo.
  const from = Math.max(...measured.map((m) => m.lastReading));
  for (const m of measured) {
    const days = Math.round((from - m.lastReading) / MS_PER_DAY);
    if (days > 0) {
      m.experience = Math.max(0, Math.round(m.experience + (m.measuredDailyXp ?? 0) * days));
      m.extrapolatedDays = days;
      m.lastReading = from;
    }
  }
  measured.sort((a, b) => b.experience - a.experience);
  return [measured[0], measured[1]];
}

interface ShareOutlook {
  high: MeasuredCharacter;
  low: MeasuredCharacter;
  gap: ReturnType<typeof shareGap>;
  verdict: ShareVerdict;
  /** Os ritmos assumidos, para a frase dizer porque não partilham. */
  highDailyXp: number;
  lowDailyXp: number;
  /** Quem ficou a 0 por falta de leituras (e não por escolha de quem escreveu). */
  unmeasured: PlayerMeta[];
  /** O dia de onde se conta: o da leitura mais recente dos dois. */
  from: number;
}

/**
 * A resposta, com os ritmos que se assumem para cada um. `typedHigh` e
 * `typedLow` dizem se o ritmo foi escrito à mão; sem isso e sem leituras, o
 * ritmo passa a 0 e a página tem de o avisar (04/11/2026).
 */
function shareOutlook(
  [high, low]: [MeasuredCharacter, MeasuredCharacter],
  highDailyXp: number,
  lowDailyXp: number,
  typedHigh: boolean,
  typedLow: boolean
): ShareOutlook {
  return {
    high,
    low,
    gap: shareGap(high.experience, low.experience),
    verdict: shareVerdict(
      { experience: high.experience, dailyXp: highDailyXp },
      { experience: low.experience, dailyXp: lowDailyXp }
    ),
    highDailyXp,
    lowDailyXp,
    unmeasured: [
      ...(!typedHigh && high.measuredDailyXp === null ? [high.player] : []),
      ...(!typedLow && low.measuredDailyXp === null ? [low.player] : []),
    ],
    from: Math.max(high.lastReading, low.lastReading),
  };
}

function Name({ player }: { player: PlayerMeta }) {
  return <b style={{ color: player.accentColor }}>{player.name}</b>;
}

/** A frase da resposta, a mesma na página e no cartão do Início. */
export function OutlookSentence({ outlook }: { outlook: ShareOutlook }) {
  const { high, low, verdict, from } = outlook;
  switch (verdict.kind) {
    case 'now':
      return (
        <>
          <Name player={low.player} /> e <Name player={high.player} /> já partilham XP.
        </>
      );
    case 'within':
    case 'later':
      return (
        <>
          Partilham daqui a <b>{daysText(verdict.days)}</b>
          {verdict.kind === 'later' && <> (mais de {MAX_SHARE_DAYS / 365} anos)</>}, por volta de{' '}
          {dateFormatter.format(new Date(from + verdict.days * MS_PER_DAY))}.
        </>
      );
    case 'beyond':
      return (
        <>
          A este ritmo <b>não partilham nos próximos {MAX_LATER_SHARE_DAYS / 365} anos</b>.
        </>
      );
    case 'never':
      switch (noShareReason(outlook.highDailyXp, outlook.lowDailyXp)) {
        case 'both-stopped':
          return (
            <>
              Com os dois parados, <b>nunca chegam a partilhar</b>: nenhum dos dois sobe.
            </>
          );
        case 'low-not-rising':
          return (
            <>
              A este ritmo <b>nunca chegam a partilhar</b>: o <Name player={low.player} /> não sobe.
            </>
          );
        default:
          return (
            <>
              A este ritmo <b>nunca chegam a partilhar</b>: o <Name player={high.player} /> afasta-se mais depressa do
              que o <Name player={low.player} /> sobe.
            </>
          );
      }
  }
}

/** Aviso de que um ritmo sem leituras foi tratado como 0. */
/** Diz quem teve a XP puxada para a frente para as leituras ficarem no mesmo dia. */
function ExtrapolatedNote({ outlook }: { outlook: ShareOutlook }) {
  const moved = [outlook.high, outlook.low].filter((m) => m.extrapolatedDays > 0);
  if (moved.length === 0) return null;
  return (
    <p className="daily-simulation-note">
      {moved.map((m) => (
        <span key={m.player.id}>
          A última leitura do <Name player={m.player} /> é {daysText(m.extrapolatedDays)} mais antiga: a XP dele foi
          puxada até ao dia da do outro, ao ritmo que tem feito.{' '}
        </span>
      ))}
    </p>
  );
}

function UnmeasuredNote({ outlook, windowDays }: { outlook: ShareOutlook; windowDays: number }) {
  if (outlook.unmeasured.length === 0) return null;
  return (
    <p className="daily-simulation-note">
      Sem leituras que cheguem nos últimos {windowDays} dias para medir o ritmo do{' '}
      {outlook.unmeasured.map((player, index) => (
        <span key={player.id}>
          {index > 0 && ' e do '}
          <Name player={player} />
        </span>
      ))}
      : assumi 0 XP por dia. Escreve um ritmo para experimentar outro.
    </p>
  );
}

function RateField({
  id,
  player,
  value,
  measured,
  onChange,
}: {
  id: string;
  player: PlayerMeta;
  value: string;
  measured: number | null;
  onChange: (value: string) => void;
}) {
  const invalid = value.trim() !== '' && parseDailyXp(value) === null;
  return (
    <div className="hunt-form__field">
      <label htmlFor={id}>
        XP por dia do <span style={{ color: player.accentColor }}>{player.name}</span>
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        placeholder={measured !== null ? plain.format(Math.round(measured)) : 'ex: 20M'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {invalid && <p className="field-error">Não percebi — usa um número (ex.: 20000000) ou milhões (ex.: 20M, 20kk), até {plain.format(MAX_DAILY_XP)}.</p>}
    </div>
  );
}

interface PartilhaPageProps {
  histories: HistoriesByCharacter;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

/**
 * Quantos dias faltam até o Bluey poder sharear com o Baverone (pedido do
 * André, 02/11/2026), ao ritmo que os dois estão a fazer — e, como a 01/11 a
 * resposta era «nunca» em três dos quatro períodos, quanto o mais baixo
 * precisaria de fazer por dia para lá chegar num prazo.
 */
export function PartilhaPage({ histories, loading, error, onRetry }: PartilhaPageProps) {
  const [windowDays, setWindowDays] = useState<number>(DEFAULT_SHARE_WINDOW);
  const [highInput, setHighInput] = useState('');
  const [lowInput, setLowInput] = useState('');

  const both = useMemo(() => measureBoth(histories, windowDays), [histories, windowDays]);

  if (loading) return <p className="vazio">A carregar o histórico dos dois bonecos…</p>;
  if (!both) {
    if (error) return <HistoryErrorNote error={error} onRetry={onRetry} />;
    return <p className="vazio">Ainda não há histórico dos dois bonecos para fazer as contas.</p>;
  }

  const [high, low] = both;
  const highDailyXp = parseDailyXp(highInput) ?? high.measuredDailyXp ?? 0;
  const lowDailyXp = parseDailyXp(lowInput) ?? low.measuredDailyXp ?? 0;
  const typedHigh = parseDailyXp(highInput) !== null;
  const typedLow = parseDailyXp(lowInput) !== null;
  const outlook = shareOutlook(both, highDailyXp, lowDailyXp, typedHigh, typedLow);
  const highChar: ShareCharacter = { experience: high.experience, dailyXp: highDailyXp };
  const edited = typedHigh || typedLow;

  return (
    <>
      {error && <HistoryErrorNote error={error} onRetry={onRetry} />}
      <div className="stats">
        <div className="stat">
          <span className="rotulo">
            <span style={{ color: low.player.accentColor }}>{low.player.name}</span> · nível que precisa
          </span>
          <span className="num" style={{ color: low.player.accentColor }}>
            {outlook.gap.levelNeeded}
          </span>
          <span className="nota">
            está no {levelForExperience(low.experience)}; o {high.player.name} está no{' '}
            {levelForExperience(high.experience)} e só partilha com quem tiver pelo menos 2/3 dos níveis dele
          </span>
        </div>
        <div className="stat">
          <span className="rotulo">
            <span style={{ color: low.player.accentColor }}>{low.player.name}</span> · XP que falta hoje
          </span>
          <span className="num" style={{ color: low.player.accentColor }}>
            {plain.format(outlook.gap.experienceMissing)}
          </span>
          <span className="nota">se o {high.player.name} parasse agora — mas não para, e o alvo sobe com ele</span>
        </div>
      </div>

      <section className="card espaco">
        <div className="cardh">
          <h2>
            <Icon name="previsao" size={16} />
            Ao ritmo dos dois
          </h2>
          <span className="nota">ritmo dos últimos {windowDays} dias</span>
        </div>

        <div className="seg" role="tablist" aria-label="Período do ritmo">
          {SHARE_WINDOWS.map((days) => (
            <button
              key={days}
              type="button"
              role="tab"
              aria-selected={windowDays === days}
              className={windowDays === days ? 'on' : undefined}
              onClick={() => setWindowDays(days)}
            >
              {days} dias
            </button>
          ))}
        </div>

        <div className="partilha-ritmos">
          <RateField
            id="partilha-alto"
            player={high.player}
            value={highInput}
            measured={high.measuredDailyXp}
            onChange={setHighInput}
          />
          <RateField
            id="partilha-baixo"
            player={low.player}
            value={lowInput}
            measured={low.measuredDailyXp}
            onChange={setLowInput}
          />
        </div>
        <p className="daily-simulation-note">
          Vazio = o ritmo medido nos últimos {windowDays} dias (o número cinzento). Escreve outro para experimentar
          {edited && (
            <>
              {' '}
              —{' '}
              <button
                type="button"
                className="link-botao"
                onClick={() => {
                  setHighInput('');
                  setLowInput('');
                }}
              >
                voltar aos medidos
              </button>
            </>
          )}
          .
        </p>

        <p className="xp-forecast__headline">
          <OutlookSentence outlook={outlook} />
        </p>
        <UnmeasuredNote outlook={outlook} windowDays={windowDays} />
        <ExtrapolatedNote outlook={outlook} />
        {(outlook.verdict.kind === 'never' || outlook.verdict.kind === 'beyond') && (
          <p className="daily-simulation-note">
            Procurei até {MAX_LATER_SHARE_DAYS / 365} anos para a frente. Daqui a um ano o {high.player.name} estaria no nível{' '}
            {levelForExperience(Math.max(0, high.experience + highDailyXp * 365))} (pede o{' '}
            {shareGap(Math.max(0, high.experience + highDailyXp * 365), 0).levelNeeded}) e o {low.player.name} no{' '}
            {levelForExperience(Math.max(0, low.experience + lowDailyXp * 365))}.
          </p>
        )}
      </section>

      <section className="card espaco">
        <div className="cardh">
          <h2>
            <Icon name="calculadora" size={16} />
            <span>
              Quanto o <span style={{ color: low.player.accentColor }}>{low.player.name}</span> precisa por dia
            </span>
          </h2>
          <span className="nota">
            com o {high.player.name} a {xp(highDailyXp)} por dia
          </span>
        </div>
        <table className="xp-forecast__table">
          <thead>
            <tr>
              <th>Para partilhar em</th>
              <th>XP por dia</th>
              <th>Face ao ritmo acima</th>
            </tr>
          </thead>
          <tbody>
            {SHARE_TARGETS.map((days) => {
              const needed = dailyXpToShareIn(highChar, low.experience, days);
              return (
                <tr key={days}>
                  <td>{daysText(days)}</td>
                  <td style={{ color: low.player.accentColor }}>{xp(needed)}</td>
                  <td>
                    {needed === 0
                      ? 'já chega'
                      : lowDailyXp > 0
                        ? `${timesFormatter.format(needed / lowDailyXp)}×`
                        : lowDailyXp < 0
                          ? 'o ritmo acima é negativo'
                          : 'o ritmo acima é 0'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}

/** O cartão do Início: a resposta numa linha, e o caminho para as contas. */
export function PartilhaResumo({
  histories,
  onNavigate,
}: {
  histories: HistoriesByCharacter;
  onNavigate: (id: PageId) => void;
}) {
  const both = measureBoth(histories, DEFAULT_SHARE_WINDOW);
  if (!both) return null;
  const outlook = shareOutlook(both, both[0].measuredDailyXp ?? 0, both[1].measuredDailyXp ?? 0, false, false);

  return (
    <div className="card espaco">
      <div className="cardh">
        <h2>
          <Icon name="previsao" size={16} />
          Partilha de XP
        </h2>
        <span className="nota">ritmo dos últimos {DEFAULT_SHARE_WINDOW} dias</span>
      </div>
      <p className="xp-forecast__headline">
        <OutlookSentence outlook={outlook} />
        {outlook.verdict.kind !== 'now' && (
          <>
            {' '}
            Hoje o <Name player={outlook.low.player} /> precisava do nível {outlook.gap.levelNeeded} (faltam{' '}
            {xp(outlook.gap.experienceMissing)}).
          </>
        )}
      </p>
      <UnmeasuredNote outlook={outlook} windowDays={DEFAULT_SHARE_WINDOW} />
      <ExtrapolatedNote outlook={outlook} />
      <p className="daily-simulation-note">
        <a
          href="#partilha"
          onClick={(event) => {
            event.preventDefault();
            onNavigate('partilha');
          }}
        >
          Ver as contas e experimentar outros ritmos →
        </a>
      </p>
    </div>
  );
}
