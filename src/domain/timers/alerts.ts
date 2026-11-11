/**
 * Best-effort audio/voice alerts for timer completion. Both are optional —
 * browsers can block autoplay audio or lack SpeechSynthesis support, so
 * every call is wrapped and failures are swallowed silently (the visual
 * "terminado" state still fires regardless).
 */
import { beepOffsets, framedAnnouncement, once, speechFallbackMs } from './framedAlert.ts';

const SINGLE_BEEP_OFFSETS = [0, 0.22, 0.44];

function playBeepsAt(offsets: readonly number[]): void {
  try {
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextCtor();
    const now = ctx.currentTime;

    offsets.forEach((offset) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.2);
    });

    const last = offsets[offsets.length - 1] ?? 0;
    setTimeout(() => ctx.close(), (last + 0.5) * 1000);
  } catch {
    // Web Audio unavailable/blocked — ignore.
  }
}

/** O sinal curto de sempre: três bips (~0,6 s). */
export function playBeep(): void {
  playBeepsAt(SINGLE_BEEP_OFFSETS);
}

/** Bips seguidos durante `seconds` segundos (ver `beepOffsets`). */
export function playBeeps(seconds: number): void {
  playBeepsAt(beepOffsets(seconds));
}

// O Chrome deixa ir o utterance para o lixo a meio e aí o `onend` nunca chega;
// guardá-lo aqui até acabar evita isso.
const speaking = new Set<SpeechSynthesisUtterance>();

/** Fala `text` (pt-PT). `onDone`, se houver, corre uma vez quando a voz acaba, falha ou não existe. */
export function announce(text: string, onDone?: () => void): void {
  const done = once(() => onDone?.());
  if (!('speechSynthesis' in window)) {
    done();
    return;
  }
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-PT';
    const finish = () => {
      speaking.delete(utterance);
      done();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    speaking.add(utterance);
    window.speechSynthesis.speak(utterance);
    setTimeout(finish, speechFallbackMs(text));
  } catch {
    // SpeechSynthesis unavailable — ignore.
    done();
  }
}

/** Bips durante `seconds` s, a voz, e mais `seconds` s de bips quando a voz acaba. */
export function announceFramedByBeeps(text: string, seconds: number): void {
  framedAnnouncement(text, seconds, {
    beep: playBeeps,
    speak: announce,
    wait: (ms, fn) => setTimeout(fn, ms),
  });
}
