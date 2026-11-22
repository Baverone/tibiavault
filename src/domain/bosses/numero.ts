// Ler um número escrito à mão no Bosstiary (22/11/2026).
//
// `undefined` = não gravar nada (o campo volta ao que estava): um campo de
// kills vazio ou com lixo nunca apaga as kills. `null` = limpar, só onde vazio
// quer dizer «não sei» (os pontos do jogo).
export function lerNumero(texto: string, permitirVazio: boolean): number | null | undefined {
  const t = texto.trim();
  if (t === '') return permitirVazio ? null : undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.floor(n));
}
