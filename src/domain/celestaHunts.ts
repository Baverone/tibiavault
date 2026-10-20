/**
 * Janelas livres de hunt no mundo Celesta, tal como são publicadas em
 * data/celesta-hunts.json pela tarefa agendada que lê a DM do bot Letter
 * (TibiaLoot.com Spot Assistant) no Discord.
 *
 * As horas vêm todas em Europe/Berlin — é o fuso do bot, e é assim que
 * aparecem no Discord. Lisboa = Berlim −1h.
 */

export interface HuntWindow {
  /** "HH:MM" em hora de Berlim. */
  start: string;
  /** "HH:MM" em hora de Berlim. Pode ser menor que start quando passa da meia-noite. */
  end: string;
  minutes: number;
}

export interface HuntSpotStatus {
  name: string;
  free: HuntWindow[];
  /** true quando o spot nem sequer aparece no summary — sem reservas nenhumas. */
  noBookings?: boolean;
}

export interface CelestaHuntsData {
  /** ISO 8601, momento em que a tarefa gerou este ficheiro. */
  generatedAt: string;
  /** "HH:MM" do footer do summary — o "agora" com que as janelas foram calculadas. */
  referenceTime: string;
  timezone: string;
  minWindowMinutes: number;
  spots: HuntSpotStatus[];
  /** Uma ou duas janelas em horário decente que valem a pena, já em texto. */
  highlights?: string[];
}

/** Acima disto o ficheiro é velho de mais para se confiar nele às cegas. */
const STALE_AFTER_MS = 95 * 60 * 1000;

export function isStale(data: CelestaHuntsData, now: number): boolean {
  const generated = Date.parse(data.generatedAt);
  if (Number.isNaN(generated)) return true;
  return now - generated > STALE_AFTER_MS;
}

export function formatAge(data: CelestaHuntsData, now: number): string {
  const generated = Date.parse(data.generatedAt);
  if (Number.isNaN(generated)) return 'data desconhecida';

  const minutes = Math.max(0, Math.round((now - generated) / 60000));
  if (minutes < 1) return 'agora mesmo';
  if (minutes === 1) return 'há 1 minuto';
  if (minutes < 60) return `há ${minutes} minutos`;

  // 20/10/2026: com a recolha desligada desde 15/09 isto dizia «há 959h37».
  // Passadas as 48 h a hora já não interessa — conta-se em dias.
  if (minutes > 48 * 60) return `há ${Math.floor(minutes / (24 * 60))} dias`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 1 && rest === 0) return 'há 1 hora';
  if (rest === 0) return `há ${hours} horas`;
  return `há ${hours}h${String(rest).padStart(2, '0')}`;
}

export function formatWindow(window: HuntWindow): string {
  return `${window.start} - ${window.end}`;
}

/* --- Alarme de frescura ------------------------------------------------
 *
 * `isStale` (hora e meia) responde a "isto pode estar desatualizado". Não
 * responde à pergunta que interessa mais, e que é a mesma que o
 * check-history-freshness.mjs faz à XP desde os dez dias parados de agosto:
 * **a recolha ainda está viva?** Um ficheiro de nove horas não é "um bocado
 * velho", é a tarefa do Discord parada — e até setembro de 2026 isso não
 * dizia nada a ninguém, nem no painel nem no mail.
 *
 * O que torna esta conta diferente da da XP é o horário: a tarefa corre de
 * hora a hora entre as 08:03 e as 23:03, mais uma vez às 00:03. Entre as
 * 00:30 e as 08:00 o ficheiro envelhece porque ninguém o escreve — é o
 * normal, não uma avaria. Às 08:00 o ficheiro tem legitimamente ~8h.
 *
 * Por isso não se conta o tempo de relógio: contam-se os **minutos de
 * horário** decorridos desde `generatedAt`. Quatro horas de horário sem
 * dados novos são quatro corridas falhadas seguidas (sugestão da revisão de
 * 09/09/2026 — o número é do André).
 *
 * A mesma decisão está copiada em `scripts/check-hunts-freshness.mjs`, que é
 * o lado que pinta o workflow de vermelho. Se um lado mudar, o outro tem de
 * mudar também.
 */

/** 08:00 em minutos — a que horas a tarefa volta a correr. */
const COLLECTION_START_MINUTE = 8 * 60;
/** 00:30 em minutos — a última corrida do dia (00:03) mais folga. */
const COLLECTION_END_MINUTE = 30;
/** Minutos de horário por dia: 00:00–00:30 mais 08:00–24:00. */
const SERVICE_MINUTES_PER_DAY = COLLECTION_END_MINUTE + (24 * 60 - COLLECTION_START_MINUTE);

/** Limiar do alarme, em minutos de horário. */
export const STALLED_AFTER_SERVICE_MINUTES = 4 * 60;

// O horário é de Lisboa porque é o relógio do PC que agenda a tarefa. Um só
// formatter, reutilizado: isto é chamado a cada minuto pelo painel.
const lisbonParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Lisbon',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

interface LisbonClock {
  /** Dias desde a época, em dias de calendário de Lisboa. */
  day: number;
  /** Minutos desde a meia-noite de Lisboa. */
  minuteOfDay: number;
}

function lisbonClock(ms: number): LisbonClock | null {
  if (!Number.isFinite(ms)) return null;
  const parts: Record<string, string> = {};
  for (const part of lisbonParts.formatToParts(new Date(ms))) parts[part.type] = part.value;

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  if ([year, month, day, hour, minute].some((n) => !Number.isInteger(n))) return null;

  return { day: Date.UTC(year, month - 1, day) / 86_400_000, minuteOfDay: hour * 60 + minute };
}

/** Está agora dentro do horário em que a tarefa devia estar a escrever? */
export function isWithinCollectionHours(now: number): boolean {
  const clock = lisbonClock(now);
  if (clock === null) return false;
  return clock.minuteOfDay <= COLLECTION_END_MINUTE || clock.minuteOfDay >= COLLECTION_START_MINUTE;
}

/**
 * Um relógio que só anda dentro do horário da tarefa: a diferença entre dois
 * valores destes é o tempo que a tarefa teve para correr e não correu.
 */
function serviceClock(ms: number): number | null {
  const clock = lisbonClock(ms);
  if (clock === null) return null;

  const m = clock.minuteOfDay;
  const withinDay =
    m <= COLLECTION_END_MINUTE
      ? m
      : m < COLLECTION_START_MINUTE
        ? COLLECTION_END_MINUTE
        : COLLECTION_END_MINUTE + (m - COLLECTION_START_MINUTE);

  return clock.day * SERVICE_MINUTES_PER_DAY + withinDay;
}

/**
 * Minutos de horário da tarefa desde o ficheiro ter sido escrito. `null`
 * quando a data não presta — aí não se inventa um alarme.
 */
export function serviceMinutesSinceGenerated(data: CelestaHuntsData, now: number): number | null {
  const generated = Date.parse(data.generatedAt);
  if (Number.isNaN(generated)) return null;

  const from = serviceClock(generated);
  const to = serviceClock(now);
  if (from === null || to === null) return null;
  return Math.max(0, to - from);
}

/**
 * A recolha do Discord parou? Só responde "sim" dentro do horário da tarefa:
 * às quatro da manhã ninguém está à espera de dados novos, e um alarme que
 * toca de noite todas as noites é um alarme que se ignora.
 */
export function isCollectionStalled(
  data: CelestaHuntsData,
  now: number,
  thresholdMinutes: number = STALLED_AFTER_SERVICE_MINUTES
): boolean {
  if (!isWithinCollectionHours(now)) return false;
  const elapsed = serviceMinutesSinceGenerated(data, now);
  return elapsed !== null && elapsed > thresholdMinutes;
}

/**
 * Quando é que as "melhores janelas" foram calculadas — "09/09, 02:04", em
 * hora de Berlim como tudo o resto no painel.
 *
 * O bloco é calculado uma vez, no momento em que o ficheiro é escrito, e só
 * olha para as 17:00–01:00. Às dez da manhã isso é a noite de hoje; às 00:30
 * é a noite seguinte, e sem esta etiqueta não havia como saber qual das duas.
 */
const berlinDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Berlin',
  month: '2-digit',
  day: '2-digit',
});

export function formatGeneratedStamp(data: CelestaHuntsData): string | null {
  const generated = Date.parse(data.generatedAt);
  if (Number.isNaN(generated)) return null;

  const parts: Record<string, string> = {};
  for (const part of berlinDate.formatToParts(new Date(generated))) parts[part.type] = part.value;
  if (!parts.day || !parts.month) return null;

  return `${parts.day}/${parts.month}, ${data.referenceTime}`;
}

export function formatLength(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`;
}

/** Converte "HH:MM" de Berlim para a mesma hora em Lisboa (−1h). */
export function toLisbon(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  return `${String((h + 23) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function totalFreeMinutes(spot: HuntSpotStatus): number {
  if (spot.noBookings) return 24 * 60;
  return spot.free.reduce((sum, w) => sum + w.minutes, 0);
}

/* --- "Está livre agora?" ----------------------------------------------
 *
 * As janelas não trazem data: são "HH:MM - HH:MM" numa volta de 24h que
 * começa em `referenceTime`. Para responder à pergunta que se faz ao abrir
 * isto no telemóvel — este spot está livre AGORA? — só é preciso saber
 * quantos minutos passaram desde essa referência, e comparar com o desvio de
 * cada janela dentro da mesma volta.
 *
 * O relógio de Berlim não entra na conta: os minutos decorridos saem do
 * `generatedAt`, que é um instante absoluto. Vale mais ou menos 2 minutos de
 * folga (o `referenceTime` é o footer do summary, escrito um pouco antes de o
 * ficheiro ser gerado) e nenhuma dependência de fusos.
 */

const MINUTES_PER_DAY = 24 * 60;

function toMinutes(hhmm: string): number | null {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  return h * 60 + m;
}

/**
 * Minutos passados desde o momento a que as janelas se referem.
 *
 * `null` quando não dá para responder com honestidade: data inválida, relógio
 * do dispositivo atrás do ficheiro, ou ficheiro com 24h+ — a partir daí a
 * conta dava a volta e dizia "livre agora" com toda a confiança sobre uma
 * janela de ontem.
 */
export function minutesSinceReference(data: CelestaHuntsData, now: number): number | null {
  const generated = Date.parse(data.generatedAt);
  if (Number.isNaN(generated)) return null;

  const elapsed = Math.floor((now - generated) / 60000);
  if (elapsed < 0 || elapsed >= MINUTES_PER_DAY) return null;
  return elapsed;
}

export interface SpotAvailability {
  /** `free` = dá para entrar já; `busy` = está reservado neste momento. */
  state: 'free' | 'busy';
  /** A janela a decorrer (state `free`) ou a próxima a abrir (state `busy`). */
  window: HuntWindow | null;
  /** "HH:MM" a que isto muda: fim da janela atual, ou início da próxima. */
  changesAt: string | null;
  /** Minutos até essa mudança. `null` quando não há próxima janela nas 24h. */
  minutesUntilChange: number | null;
}

/**
 * O estado do spot neste instante. `null` quando `minutesSinceReference` não
 * sabe responder — nesse caso o painel mostra só as janelas, sem inventar um
 * "agora".
 */
export function spotAvailability(
  spot: HuntSpotStatus,
  data: CelestaHuntsData,
  now: number
): SpotAvailability | null {
  const elapsed = minutesSinceReference(data, now);
  if (elapsed === null) return null;

  if (spot.noBookings) {
    return { state: 'free', window: null, changesAt: null, minutesUntilChange: null };
  }

  const anchor = toMinutes(data.referenceTime);
  if (anchor === null) return null;

  let next: { window: HuntWindow; startsIn: number } | null = null;

  for (const window of spot.free) {
    const start = toMinutes(window.start);
    if (start === null) continue;

    // Desvio da janela dentro da volta de 24h que começa na referência. É isto
    // que põe uma janela "00:00 - 02:04" no fim do dia e não no princípio.
    const offset = (((start - anchor) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;

    if (offset <= elapsed && elapsed < offset + window.minutes) {
      return {
        state: 'free',
        window,
        changesAt: window.end,
        minutesUntilChange: offset + window.minutes - elapsed,
      };
    }

    if (offset > elapsed && (next === null || offset - elapsed < next.startsIn)) {
      next = { window, startsIn: offset - elapsed };
    }
  }

  return next
    ? { state: 'busy', window: next.window, changesAt: next.window.start, minutesUntilChange: next.startsIn }
    : { state: 'busy', window: null, changesAt: null, minutesUntilChange: null };
}
