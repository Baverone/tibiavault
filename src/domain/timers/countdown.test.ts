// Os timers em ciclo (Pot Skills, Boost, Plasmas). Os amigos do Andre diziam
// que falhavam com o browser minimizado (02/11/2026): o Chrome so acorda uma
// pagina escondida ha mais de 5 min uma vez por minuto, e a logica antiga
// (a) recomecava o ciclo a contar de quando o tique atrasado corria — cada
// ciclo do Plasma ficava ~77 s mais atrasado — e (b) perdia o aviso dos 30 s,
// porque o tique seguinte ja apanhava o fim. Estes testes fixam o contrario.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dueEvents, pauseWithEvents, pausedState, runningState, viewAt, type TimerConfig } from './countdown.ts';

const S = 1000;
const MIN = 60 * S;
const PLASMA: TimerConfig = { durationMs: 29 * MIN + 40 * S, finishedMs: 3 * S, alertsAtMs: [10 * S] };
const POT: TimerConfig = { durationMs: 10 * MIN, finishedMs: 3 * S, alertsAtMs: [] };

test('a correr: o tempo que falta e o fim do ciclo', () => {
  const state = runningState(POT, 0);
  assert.deepEqual(viewAt(POT, state, 4 * MIN), { remainingMs: 6 * MIN, justFinished: false });
});

test('no fim mostra «terminado» durante 3 s e depois recomeca com a duracao inteira', () => {
  const state = runningState(POT, 0);
  assert.deepEqual(viewAt(POT, state, 10 * MIN), { remainingMs: 0, justFinished: true });
  assert.deepEqual(viewAt(POT, state, 10 * MIN + 2999), { remainingMs: 0, justFinished: true });
  assert.deepEqual(viewAt(POT, state, 10 * MIN + 3 * S), { remainingMs: 10 * MIN, justFinished: false });
});

test('o ciclo seguinte ancora no fim real, por mais tarde que se olhe', () => {
  const state = runningState(PLASMA, 0);
  const periodo = PLASMA.durationMs + PLASMA.finishedMs;
  // Seis ciclos depois (3 h), visto um minuto depois do fim do 6.º: nada de atraso.
  const fimDo6 = PLASMA.durationMs + 5 * periodo;
  assert.deepEqual(viewAt(PLASMA, state, fimDo6 + MIN), {
    remainingMs: PLASMA.durationMs - (MIN - PLASMA.finishedMs),
    justFinished: false,
  });
});

test('parado mostra a duracao inteira; em pausa mostra o que faltava', () => {
  assert.deepEqual(viewAt(POT, { kind: 'stopped' }, 123), { remainingMs: 10 * MIN, justFinished: false });
  const pausa = pausedState(POT, runningState(POT, 0), 4 * MIN);
  assert.deepEqual(pausa, { kind: 'paused', remainingMs: 6 * MIN });
  assert.deepEqual(viewAt(POT, runningState(POT, 20 * MIN, pausa), 21 * MIN), {
    remainingMs: 5 * MIN,
    justFinished: false,
  });
});

test('com tiques de 100 ms, o aviso e o fim saem uma vez cada, na hora', () => {
  const state = runningState(PLASMA, 0);
  const eventos: { tipo: string; em: number }[] = [];
  for (let t = 100; t <= PLASMA.durationMs + 5 * S; t += 100) {
    for (const e of dueEvents(PLASMA, state, t - 100, t)) eventos.push({ tipo: e.kind, em: t });
  }
  assert.deepEqual(eventos, [
    { tipo: 'alert', em: PLASMA.durationMs - 10 * S },
    { tipo: 'finish', em: PLASMA.durationMs },
  ]);
});

test('minimizado (um tique por minuto): o aviso dos 30 s sai na mesma, com atraso', () => {
  const state = runningState(PLASMA, 0);
  // Tiques aos minutos certos: 29:00 ainda falta 40 s; 30:00 ja passou o fim.
  // Entre 28:00 e 29:00 nao ha aviso; o aviso estava as 29:30.
  assert.deepEqual(dueEvents(PLASMA, state, 28 * MIN, 29 * MIN), []);
  // Arrancado 25 s depois do minuto, o tique das 29:55 cai entre o aviso e o fim.
  const outro = runningState(PLASMA, 25 * S);
  assert.deepEqual(
    dueEvents(PLASMA, outro, 29 * MIN, 30 * MIN).map((e) => e.kind),
    ['alert']
  );
});

test('um tique que salta o aviso E o fim so anuncia o fim (o aviso ja nao serve)', () => {
  const state = runningState(PLASMA, 0);
  assert.deepEqual(
    dueEvents(PLASMA, state, 29 * MIN, 30 * MIN).map((e) => e.kind),
    ['finish']
  );
});

test('Pot Skills minimizado: tiques de minuto em minuto nao atrasam os fins', () => {
  // Um tique por minuto durante 3 h: cada fim e visto no primeiro tique
  // depois dele, e nunca mais de um minuto atrasado — o 18.º como o 1.º.
  const state = runningState(POT, 0);
  const periodo = POT.durationMs + POT.finishedMs;
  const fins: number[] = [];
  for (let t = MIN; t <= 3 * 60 * MIN; t += MIN) {
    if (dueEvents(POT, state, t - MIN, t).some((e) => e.kind === 'finish')) fins.push(t);
  }
  assert.equal(fins.length, Math.floor((3 * 60 * MIN - POT.durationMs) / periodo) + 1);
  fins.forEach((visto, i) => {
    const devia = POT.durationMs + i * periodo;
    assert.ok(visto - devia >= 0 && visto - devia < MIN, `fim ${i + 1}: ${visto - devia} ms de atraso`);
  });
});

test('depois de horas sem tiques (portatil a dormir) anuncia um fim so, nao um por ciclo', () => {
  const state = runningState(POT, 0);
  const eventos = dueEvents(POT, state, 0, 5 * 60 * MIN);
  assert.deepEqual(eventos.map((e) => e.kind), ['finish']);
});

test('em pausa ou parado nao ha eventos', () => {
  assert.deepEqual(dueEvents(PLASMA, { kind: 'stopped' }, 0, 60 * MIN), []);
  assert.deepEqual(dueEvents(PLASMA, { kind: 'paused', remainingMs: 5 * S }, 0, 60 * MIN), []);
});

test('pausar aos 8 s e retomar nao repete o aviso dos 10 s', () => {
  const inicio = runningState(PLASMA, 0);
  const aos8 = PLASMA.durationMs - 8 * S;
  assert.equal(dueEvents(PLASMA, inicio, aos8 - 3 * S, aos8).length, 1); // o aviso, uma vez
  const pausa = pausedState(PLASMA, inicio, aos8);
  const retomado = runningState(PLASMA, aos8 + MIN, pausa);
  const depois = dueEvents(PLASMA, retomado, aos8 + MIN, aos8 + MIN + 7 * S);
  assert.deepEqual(depois, []);
});

test('pausar nos 250 ms a seguir ao aviso nao perde o aviso', () => {
  const inicio = runningState(PLASMA, 0);
  const aviso = PLASMA.durationMs - 10 * S;
  const ultimoTique = aviso - 100;
  const { events, state } = pauseWithEvents(PLASMA, inicio, ultimoTique, aviso + 150);
  assert.deepEqual(events.map((e) => e.kind), ['alert']);
  assert.equal(state.kind, 'paused');
});

test('pausar nos 250 ms a seguir ao fim nao perde o fim', () => {
  const inicio = runningState(POT, 0);
  const { events } = pauseWithEvents(POT, inicio, POT.durationMs - 100, POT.durationMs + 150);
  assert.deepEqual(events.map((e) => e.kind), ['finish']);
});

test('o aviso do ciclo seguinte volta a sair', () => {
  const state = runningState(PLASMA, 0);
  const periodo = PLASMA.durationMs + PLASMA.finishedMs;
  const avisoDo2 = periodo + PLASMA.durationMs - 10 * S;
  assert.deepEqual(
    dueEvents(PLASMA, state, avisoDo2 - S, avisoDo2).map((e) => e.kind),
    ['alert']
  );
});
