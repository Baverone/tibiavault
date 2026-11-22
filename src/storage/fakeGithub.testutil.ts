// Um fetch falso da API de conteúdos do GitHub, para os testes das gravações
// (skills e Bosstiary): nenhum pedido sai daqui. Só é importado por testes.
import { encodeUtf8Base64 } from './githubContents.ts';

export interface Call {
  method: string;
  url: string;
  body?: { message: string; content: string; sha?: string; branch: string };
  auth?: string;
}

export function fakeGithub(responses: (Response | ((call: Call) => Response))[]) {
  const calls: Call[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    const call: Call = {
      method: init?.method ?? 'GET',
      url,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      auth: (init?.headers as Record<string, string> | undefined)?.Authorization,
    };
    calls.push(call);
    const next = responses.shift();
    if (!next) throw new Error('pedido a mais');
    return typeof next === 'function' ? next(call) : next;
  }) as typeof fetch;
  return { calls, fetchFn };
}

/** A resposta do GitHub a um GET de um ficheiro que existe. */
export const ficheiro = (data: unknown, sha = 'sha1') =>
  new Response(JSON.stringify({ sha, content: encodeUtf8Base64(JSON.stringify(data)) }), { status: 200 });
