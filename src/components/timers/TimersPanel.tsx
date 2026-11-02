import { useRef, useState } from 'react';
import { TimerCard, type TimerCardHandle } from './TimerCard';
import { BOOST_DEFAULT_MINUTES, getBoostMinutes, saveBoostMinutes } from '../../storage/timerStorage';

// As cores dos tokens da identidade (`--info`, `--warn`, `--bluey`). São
// literais e não `var(...)` porque vão parar ao atributo `stroke` do anel SVG,
// onde uma variável CSS não é resolvida. O roxo estava em #9b59b6 — 3,8:1
// sobre o painel, e ainda por cima usado como cor do NOME do timer.
const POT_SKILLS_COLOR = '#6f9bff';
const BOOST_COLOR = '#f0a35a';
const PLASMAS_COLOR = '#b08cff';

const PLASMAS_DURATION_SECONDS = 29 * 60 + 40;
const PLASMAS_ALERTS = [{ atSeconds: 10, message: 'Faltam 30 segundos de plasma, reiniciar contagem' }];

export function TimersPanel() {
  const potSkillsRef = useRef<TimerCardHandle>(null);
  const boostRef = useRef<TimerCardHandle>(null);
  // 02/11/2026: era o «Food ML», de 60 min fixos. O André pediu-o como
  // «Boost», com o tempo à escolha e um botão para os 60 min.
  const [boostMinutes, setBoostMinutes] = useState(getBoostMinutes);

  function chooseBoostMinutes(minutes: number) {
    setBoostMinutes(minutes);
    saveBoostMinutes(minutes);
  }
  const plasmasRef = useRef<TimerCardHandle>(null);

  function startAll() {
    potSkillsRef.current?.start();
    boostRef.current?.start();
    plasmasRef.current?.start();
  }

  return (
    <section className="timers-panel">
      <div className="timers-panel__header">
        <h2>Timers</h2>
        <button type="button" className="timers-panel__start-both" onClick={startAll}>
          Iniciar todos
        </button>
      </div>
      <div className="timers-panel__cards">
        <TimerCard ref={potSkillsRef} name="Pot Skills" durationSeconds={600} color={POT_SKILLS_COLOR} />
        <TimerCard
          ref={boostRef}
          name="Boost"
          durationSeconds={boostMinutes * 60}
          color={BOOST_COLOR}
          durationChoice={{ presetMinutes: BOOST_DEFAULT_MINUTES, onChange: chooseBoostMinutes }}
        />
        <TimerCard
          ref={plasmasRef}
          name="Plasmas"
          durationSeconds={PLASMAS_DURATION_SECONDS}
          color={PLASMAS_COLOR}
          alerts={PLASMAS_ALERTS}
          finishMessage="Atenção, vou recomeçar a contagem do Plasma agora"
        />
      </div>
    </section>
  );
}
