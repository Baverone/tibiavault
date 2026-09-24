/**
 * As cores dos gráficos, num sítio só.
 *
 * São VALORES LITERAIS e não `var(--line)`: o Recharts escreve isto em
 * ATRIBUTOS do SVG (`stroke`, `fill`), e uma variável CSS num atributo não é
 * resolvida por browser nenhum — as grelhas saíam pretas sobre preto. Os
 * valores são os mesmos de `styles/tokens.css`; se um lado mudar, o outro tem
 * de mudar também.
 *
 * Os eixos ficam no `--muted` (#8c93a8) e não num cinzento mais escuro: sobre o
 * fundo #07080d isto dá 6,1:1, e as etiquetas dos eixos são texto a sério, não
 * decoração.
 */
export const CHART_GRID = 'rgba(255,255,255,0.07)';
export const CHART_AXIS = '#8c93a8';
export const CHART_ZERO = 'rgba(255,255,255,0.18)';
export const CHART_NEGATIVE = '#ff7b7b';

export const CHART_TOOLTIP = {
  backgroundColor: '#12151f',
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: 12,
  color: '#eef0f6',
  fontSize: 12,
  boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
} as const;

const compact = new Intl.NumberFormat('pt-PT', { notation: 'compact', maximumFractionDigits: 1 });

/**
 * «26,7 mM» em vez de «26 693 545 896».
 *
 * O eixo dos Y tinha números de onze dígitos escritos por extenso e levava 70px
 * de largura só para eles — num ecrã de 390px, um quinto do gráfico.
 */
export function compactXp(value: number): string {
  return compact.format(value);
}
