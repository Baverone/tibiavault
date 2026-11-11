// Pot Skills: bips 2 s antes e 2 s depois do anuncio (pedido do Andre, 11/11/2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { beepOffsets, framedAnnouncement, once, speechFallbackMs } from './framedAlert.ts';

test('uma rajada de 2 s sao 8 bips, um a cada 0,25 s', () => {
  assert.deepEqual(beepOffsets(2), [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75]);
});

test('rajada curta tem pelo menos um bip', () => {
  assert.deepEqual(beepOffsets(0.1), [0]);
});

test('ordem: bips, espera 2 s, voz, e bips so quando a voz acaba', () => {
  const log: string[] = [];
  let pendingWait: (() => void) | null = null;
  let pendingSpeechEnd: (() => void) | null = null;

  framedAnnouncement('Pot Skills terminado', 2, {
    beep: (s) => log.push(`bip ${s}s`),
    wait: (ms, fn) => {
      log.push(`espera ${ms}ms`);
      pendingWait = fn;
    },
    speak: (text, onDone) => {
      log.push(`voz: ${text}`);
      pendingSpeechEnd = onDone;
    },
  });
  assert.deepEqual(log, ['bip 2s', 'espera 2000ms']);

  pendingWait!();
  assert.deepEqual(log, ['bip 2s', 'espera 2000ms', 'voz: Pot Skills terminado']);

  pendingSpeechEnd!();
  assert.deepEqual(log, ['bip 2s', 'espera 2000ms', 'voz: Pot Skills terminado', 'bip 2s']);
});

test('o fim da voz so conta uma vez (onend e reserva nao tocam os bips duas vezes)', () => {
  let calls = 0;
  const done = once(() => calls++);
  done();
  done();
  assert.equal(calls, 1);
});

test('a reserva da voz da folga ao texto do Pot Skills', () => {
  assert.equal(speechFallbackMs('Pot Skills terminado'), 5000);
  assert.ok(speechFallbackMs('x'.repeat(100)) > 12000);
});
