import { useEffect, useMemo, useState } from 'react';
import type { CharacterId } from '../../domain/types';
import { levelForExperience } from '../../domain/experienceTable';
import {
  calcularHunt,
  formatarHoras,
  MAX_BOOSTS_POR_DIA,
  multiplicador,
  type OpcoesHunt,
} from '../../domain/huntPlanner';
import { carregarEntrada, guardarEntrada, type EntradaHunt } from '../../storage/huntPlannerStorage';

interface HuntPlannerCardProps {
  personagem: CharacterId;
  xpAtual: number;
  accentColor: string;
}

const numeros = new Intl.NumberFormat('pt-PT');

// 08/11/2026: campos sem limite deixavam escrever 1e60 e travar a página (e o
// valor ficava guardado, por isso travava outra vez ao abrir). Fora do limite
// conta como campo por preencher.
const MAX_NIVEL_ALVO = 100_000;
const MAX_XP_HORA = 1e12;
const MAX_HORAS = 1000;

function paraNumero(texto: string, max: number): number | null {
  const limpo = texto.trim().replace(/\s/g, '');
  if (limpo === '') return null;
  const valor = Number(limpo);
  return Number.isFinite(valor) && valor >= 0 && valor <= max ? valor : null;
}

export function HuntPlannerCard({ personagem, xpAtual, accentColor }: HuntPlannerCardProps) {
  const nivelAtual = levelForExperience(xpAtual);
  const [entrada, setEntrada] = useState<EntradaHunt>(() => carregarEntrada(personagem));

  useEffect(() => {
    guardarEntrada(personagem, entrada);
  }, [personagem, entrada]);

  function alterar<K extends keyof EntradaHunt>(campo: K, valor: EntradaHunt[K]) {
    setEntrada((atual) => ({ ...atual, [campo]: valor }));
  }

  const nivelAlvo = paraNumero(entrada.nivelAlvo, MAX_NIVEL_ALVO);
  const xpHora = paraNumero(entrada.xpHora, MAX_XP_HORA);
  const horas = paraNumero(entrada.horas, MAX_HORAS);
  const boosts = entrada.boost ? (paraNumero(entrada.boosts, MAX_BOOSTS_POR_DIA) ?? 0) : 0;

  // Memorizado para o objeto não ser novo em cada render — sem isto o useMemo
  // do resultado recalculava sempre, e o linter tinha razão em queixar-se.
  const opcoes: OpcoesHunt = useMemo(
    () => ({ stamina: entrada.stamina, dobro: entrada.dobro }),
    [entrada.stamina, entrada.dobro]
  );

  const resultado = useMemo(() => {
    // O nível tem de ser inteiro, e não só >= 1: o `experienceForLevel` recusa
    // níveis fracionários com uma excepção, e um "1500,5" escrito no campo
    // (que o input de tipo number aceita à mesma) rebentava a app toda em vez
    // de simplesmente não mostrar resultado.
    if (nivelAlvo === null || !Number.isInteger(nivelAlvo) || nivelAlvo < 1) return null;
    if (xpHora === null || xpHora <= 0 || horas === null) return null;
    return calcularHunt(xpAtual, nivelAlvo, xpHora, horas, boosts, opcoes);
  }, [xpAtual, nivelAlvo, xpHora, horas, boosts, opcoes]);

  const multSemBoost = multiplicador(opcoes, false);
  const multComBoost = multiplicador(opcoes, true);

  return (
    <div className="hunt-planner">
      <div className="hunt-form">
        <div className="hunt-form__field">
          <label htmlFor={`alvo-${personagem}`}>Nível que queres atingir</label>
          <input
            id={`alvo-${personagem}`}
            type="number"
            min="1"
            max={MAX_NIVEL_ALVO}
            placeholder={`atual: ${nivelAtual}`}
            value={entrada.nivelAlvo}
            onChange={(e) => alterar('nivelAlvo', e.target.value)}
          />
        </div>
        <div className="hunt-form__field">
          <label htmlFor={`xph-${personagem}`}>XP/h bruta (a 100%)</label>
          <input
            id={`xph-${personagem}`}
            type="number"
            min="0"
            max={MAX_XP_HORA}
            placeholder="ex: 2500000"
            value={entrada.xpHora}
            onChange={(e) => alterar('xpHora', e.target.value)}
          />
        </div>
        <div className="hunt-form__field">
          <label htmlFor={`horas-${personagem}`}>Horas a caçar</label>
          <input
            id={`horas-${personagem}`}
            type="number"
            min="0"
            max={MAX_HORAS}
            step="0.5"
            placeholder="ex: 4"
            value={entrada.horas}
            onChange={(e) => alterar('horas', e.target.value)}
          />
        </div>
      </div>

      <div className="hunt-bonus">
        <label className="hunt-bonus__item">
          <input type="checkbox" checked={entrada.stamina} onChange={(e) => alterar('stamina', e.target.checked)} />
          Stamina verde <span className="hunt-bonus__tag">×1,5</span>
        </label>

        <label className="hunt-bonus__item">
          <input type="checkbox" checked={entrada.boost} onChange={(e) => alterar('boost', e.target.checked)} />
          XP Boost <span className="hunt-bonus__tag">+50%</span>
        </label>

        {entrada.boost && (
          <label className="hunt-bonus__item hunt-bonus__item--nested">
            quantos
            <input
              type="number"
              min="0"
              max={MAX_BOOSTS_POR_DIA}
              className="hunt-bonus__count"
              value={entrada.boosts}
              onChange={(e) => alterar('boosts', e.target.value)}
            />
            <span className="hunt-bonus__hint">1 hora de caça cada, máx. {MAX_BOOSTS_POR_DIA} por dia</span>
          </label>
        )}

        <label className="hunt-bonus__item">
          <input type="checkbox" checked={entrada.dobro} onChange={(e) => alterar('dobro', e.target.checked)} />
          Evento de dobro <span className="hunt-bonus__tag">+100%</span>
        </label>
      </div>

      <p className="hunt-planner__mult">
        Multiplicador: <strong>×{multSemBoost.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}</strong>
        {entrada.boost && (
          <>
            {' '}nas horas sem boost,{' '}
            <strong style={{ color: accentColor }}>
              ×{multComBoost.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}
            </strong>{' '}
            nas horas com boost
          </>
        )}
        .
      </p>

      {!resultado ? (
        <p className="daily-simulation-note">
          Preenche o nível alvo, a XP/h bruta e as horas para veres o resultado.
        </p>
      ) : resultado.jaAtingido ? (
        <p className="daily-simulation-summary">
          Já estás no nível {nivelAtual} — o alvo {nivelAlvo} já ficou para trás.
        </p>
      ) : (
        <>
          <p className="hunt-planner__headline">
            A sessão dá <strong style={{ color: accentColor }}>{numeros.format(Math.round(resultado.xpDaSessao))}</strong> XP
            {' '}e deixa-te no nível <strong style={{ color: accentColor }}>{resultado.nivelNoFim}</strong>.
          </p>

          <p className={resultado.chega ? 'hunt-planner__verdict hunt-planner__verdict--ok' : 'hunt-planner__verdict'}>
            {resultado.chega
              ? `Chega ao nível ${nivelAlvo}. Bastavam ${formatarHoras(resultado.horasNecessarias ?? 0)}.`
              : resultado.horasNecessarias === null
                ? `Não chega ao nível ${nivelAlvo} — e com esta configuração não há ritmo para lá chegar.`
                : `Não chega ao nível ${nivelAlvo}. Faltam ${numeros.format(Math.round(resultado.xpEmFalta - resultado.xpDaSessao))} XP — eram precisas ${formatarHoras(resultado.horasNecessarias)} no total.`}
          </p>

          <table className="hunt-planner__table">
            <tbody>
              <tr>
                <th>Falta para o nível {nivelAlvo}</th>
                <td>{numeros.format(Math.round(resultado.xpEmFalta))} XP</td>
              </tr>
              {resultado.horasComBoost > 0 && (
                <tr>
                  <th>{formatarHoras(resultado.horasComBoost)} com boost</th>
                  <td>{numeros.format(Math.round(resultado.xpHoraComBoost))} XP/h</td>
                </tr>
              )}
              {resultado.horasSemBoost > 0 && (
                <tr>
                  <th>{formatarHoras(resultado.horasSemBoost)} sem boost</th>
                  <td>{numeros.format(Math.round(resultado.xpHoraSemBoost))} XP/h</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
