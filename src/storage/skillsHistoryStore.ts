// Ler e gravar o histórico dos skills no repositório (20/11/2026).
//
// O site é estático (GitHub Pages), por isso quem grava é o próprio browser,
// pela API de conteúdos do GitHub, com uma chave fine-grained do André só para
// este repositório (Contents: read and write), guardada no aparelho
// (`githubToken.ts`). Desenho: docs/superpowers/specs/2026-11-20-historico-skills-design.md
//
// Lê-se pela API e não pelo raw.githubusercontent.com (que é o que o XP usa):
// o raw guarda cache uns 5 minutos, e a leitura acabada de gravar
// «desaparecia» ao recarregar a página.
import type { CharacterId } from '../domain/types.ts';
import { sanitizeEvents, sanitizeReadings, type SkillEvent, type SkillReading } from '../domain/skillsHistory.ts';
import { getFile, updateFile } from './githubContents.ts';

// 22/11/2026: o acesso ao GitHub passou para `githubContents.ts` (o Bosstiary
// usa-o também). Ficam aqui reexportadas as duas funções que já se importavam
// daqui.
export { decodeUtf8Base64, encodeUtf8Base64 } from './githubContents.ts';

const DIR = 'data/skills-history';
type Fetch = typeof fetch;

function dateText(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function loadReadings(id: CharacterId, token: string | null, fetchFn: Fetch = fetch): Promise<SkillReading[]> {
  return sanitizeReadings((await getFile(`${DIR}/${id}.json`, token, fetchFn)).data);
}

/** Grava uma leitura e devolve o histórico todo, já com ela. */
export async function appendReading(
  id: CharacterId,
  reading: SkillReading,
  token: string,
  fetchFn: Fetch = fetch
): Promise<SkillReading[]> {
  const saved = await updateFile(
    `${DIR}/${id}.json`,
    (current) => [...sanitizeReadings(current), reading],
    `chore: leitura de skills ${id} ${dateText(reading.timestamp)}`,
    token,
    fetchFn
  );
  return sanitizeReadings(saved);
}

export async function loadEvents(token: string | null, fetchFn: Fetch = fetch): Promise<SkillEvent[]> {
  return sanitizeEvents((await getFile(`${DIR}/eventos.json`, token, fetchFn)).data);
}

/**
 * Junta ou tira um evento. Recebe a alteração e não a lista inteira, para o
 * que outro aparelho gravou entretanto não se perder.
 */
export async function changeEvents(
  change: { add: SkillEvent } | { remove: string },
  token: string,
  fetchFn: Fetch = fetch
): Promise<SkillEvent[]> {
  const message = 'add' in change ? `chore: evento de skills «${change.add.name}»` : 'chore: tirar evento de skills';
  const saved = await updateFile(
    `${DIR}/eventos.json`,
    (current) => {
      const events = sanitizeEvents(current);
      return 'add' in change ? [...events, change.add] : events.filter((e) => e.id !== change.remove);
    },
    message,
    token,
    fetchFn
  );
  return sanitizeEvents(saved);
}
