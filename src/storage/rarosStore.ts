import { GITHUB_REPO } from '../config.ts';
import { limparLeitura, type LeituraRaros } from '../domain/bosses/raros.ts';

/**
 * As previsões dos bosses raros do Celesta (22/11/2026), lidas do repositório
 * público: a tarefa tibia-raros do PC lê o GuildStats depois do server save e
 * grava data/bosses-raros/celesta.json quando muda. Pelo raw, como o histórico
 * de XP: a cache de 5 min não importa num ficheiro que muda uma vez por dia.
 *
 * 404 = ainda não há leitura (`null`); rede em baixo, outro erro ou ficheiro
 * estragado rebentam com a razão, para a página a mostrar.
 */
export async function lerRaros(fetchFn: typeof fetch = fetch): Promise<LeituraRaros | null> {
  const url = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/data/bosses-raros/celesta.json`;
  let r: Response;
  try {
    r = await fetchFn(url, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new Error('sem ligação ao GitHub — rede em baixo ou demorou demasiado');
  }
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`o GitHub respondeu ${r.status}`);
  let corpo: unknown;
  try {
    corpo = await r.json();
  } catch {
    throw new Error('o ficheiro dos raros veio estragado');
  }
  const leitura = limparLeitura(corpo);
  if (!leitura) throw new Error('o ficheiro dos raros veio estragado');
  return leitura;
}
