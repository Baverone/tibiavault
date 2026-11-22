// O boss boosted do dia (22/11/2026), da TibiaData: uma kill nele conta 3 no
// Bosstiary. Se a leitura falhar devolve null — a página funciona sem ele.
const URL_BOOSTED = 'https://api.tibiadata.com/v4/boostablebosses';
const TIMEOUT_MS = 10_000;

export async function lerBoosted(fetchFn: typeof fetch = fetch): Promise<string | null> {
  try {
    const response = await fetchFn(URL_BOOSTED, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;
    const body = (await response.json()) as { boostable_bosses?: { boosted?: { name?: unknown } } };
    const name = body.boostable_bosses?.boosted?.name;
    return typeof name === 'string' && name.trim() !== '' ? name.trim() : null;
  } catch {
    return null;
  }
}
