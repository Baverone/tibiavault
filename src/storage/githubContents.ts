// Ler e gravar ficheiros JSON do repositório pela API de conteúdos do GitHub.
//
// O site é estático (GitHub Pages), por isso quem grava é o próprio browser,
// com uma chave fine-grained do André só para este repositório (Contents: read
// and write), guardada no aparelho (`githubToken.ts`). Nasceu no histórico dos
// skills (20/11/2026, docs/superpowers/specs/2026-11-20-historico-skills-design.md)
// e passou para aqui a 22/11/2026 para o Bosstiary o usar também.
//
// Lê-se pela API e não pelo raw.githubusercontent.com: o raw guarda cache uns
// 5 minutos, e o que acabou de ser gravado «desaparecia» ao recarregar.
import { GITHUB_REPO } from '../config.ts';

const API = `https://api.github.com/repos/${GITHUB_REPO}/contents`;
const TIMEOUT_MS = 15_000;

type Fetch = typeof fetch;

export function encodeUtf8Base64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeUtf8Base64(base64: string): string {
  const binary = atob(base64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function headers(token: string | null): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export interface FileState {
  sha: string | null;
  /** O JSON do ficheiro; `null` se ainda não existe ou não se percebe. */
  data: unknown;
}

export async function getFile(path: string, token: string | null, fetchFn: Fetch = fetch): Promise<FileState> {
  let response: Response;
  try {
    response = await fetchFn(`${API}/${path}?ref=main`, {
      headers: headers(token),
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new Error('sem ligação ao GitHub — rede em baixo ou demorou demasiado');
  }
  if (response.status === 404) return { sha: null, data: null };
  if (response.status === 401) throw new Error('a chave do GitHub foi recusada — confirma-a ou tira-a');
  if (response.status === 403) throw new Error('o GitHub recusou o pedido (limite de pedidos ou chave sem acesso)');
  if (!response.ok) throw new Error(`o GitHub respondeu ${response.status}`);
  const body = (await response.json()) as { sha?: unknown; content?: unknown };
  if (typeof body.sha !== 'string' || typeof body.content !== 'string') throw new Error('o GitHub respondeu sem o ficheiro');
  let data: unknown;
  try {
    data = JSON.parse(decodeUtf8Base64(body.content));
  } catch {
    data = null;
  }
  return { sha: body.sha, data };
}

async function putFile(
  path: string,
  content: unknown,
  sha: string | null,
  message: string,
  token: string,
  fetchFn: Fetch
): Promise<Response> {
  try {
    return await fetchFn(`${API}/${path}`, {
      method: 'PUT',
      headers: { ...headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        branch: 'main',
        content: encodeUtf8Base64(`${JSON.stringify(content, null, 2)}\n`),
        ...(sha ? { sha } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new Error('sem ligação ao GitHub — não foi gravado');
  }
}

/**
 * Lê o ficheiro, junta-lhe o que `change` devolver e grava. Se outro aparelho
 * gravou entretanto (409, ou 422 com o sha velho), lê outra vez e repete uma
 * vez: assim duas gravações quase ao mesmo tempo não se apagam uma à outra.
 * Por isso `change` recebe sempre o conteúdo ATUAL e aplica-lhe a diferença.
 */
export async function updateFile<T>(
  path: string,
  change: (current: unknown) => T,
  message: string,
  token: string,
  fetchFn: Fetch = fetch
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { sha, data } = await getFile(path, token, fetchFn);
    const next = change(data);
    const response = await putFile(path, next, sha, message, token, fetchFn);
    if (response.ok) return next;
    if ((response.status === 409 || response.status === 422) && attempt === 0) continue;
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      throw new Error('a chave do GitHub foi recusada — tem de ter acesso de escrita ao tibiavault (Contents: read and write)');
    }
    throw new Error(`o GitHub respondeu ${response.status} — não foi gravado`);
  }
  throw new Error('outro aparelho gravou ao mesmo tempo — tenta outra vez');
}
