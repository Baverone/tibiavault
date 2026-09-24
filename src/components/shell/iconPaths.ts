/**
 * A GEOMETRIA dos ícones — só dados, sem React.
 *
 * Está separada do `<Icon>` (em `icons.tsx`) por uma razão prática: a lista de
 * páginas (`navigation/pages.ts`) e a das personagens (`constants/players.ts`)
 * guardam um NOME de ícone, e são testadas no `node --test`, que corre com o
 * `tsconfig.node.json` — esse não sabe de JSX. Um `IconName` que viesse de um
 * `.tsx` arrastava o ficheiro inteiro para lá e o `tsc` recusava.
 *
 * Porquê SVG e não emoji (a mesma razão do `site_shell.py` do mtgvault): um
 * emoji é desenhado pelo SISTEMA, não pela página. O ⏱ do telemóvel Android e
 * o do Chrome no Windows são dois desenhos diferentes, com pesos e cores
 * diferentes — e nenhum deles acende com o rótulo quando o item da barra fica
 * ativo. Um conjunto único, com `currentColor` e traço 1.8, é a única forma de
 * a barra lateral se ver igual nos dois sítios.
 *
 * A geometria é a do conjunto Feather (MIT, feathericons.com), redesenhada em
 * `path`s soltos para não trazer uma dependência. O traço, o `fill` e as pontas
 * vivem no CSS (`svg.ico` em `styles/shell.css`) — escritos em cada `<svg>`
 * eram ~190 bytes de repetição por ícone.
 */
export const ICON_PATHS = {
  inicio: 'M3 9.5 12 2l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12.5h6V22',
  // O arco do Baverone e a flor do Bluey vêm dos ícones que estavam em
  // `constants/players.tsx`. Ficam aqui para o conjunto ser mesmo um só.
  arco: 'M3 21 21 3M21 3h-7M21 3v7M7 13l4 4',
  lotus: 'M12 21s-8-4-8-11c0-4 4-7 8-2 4-5 8-2 8 2 0 7-8 11-8 11zM12 12.6v.01',
  timer: 'M12 22a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8v5l3 2M9 2h6',
  stamina: 'M3 8.5h13a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2zM21 11v2M5 10.5v3',
  flecha: 'M2 22 22 2M22 2h-7M22 2v7M6 14l4 4',
  mapa: 'M20.5 10.5c0 6.6-8.5 12.4-8.5 12.4S3.5 17.1 3.5 10.5a8.5 8.5 0 0 1 17 0zM12 13.2a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8z',
  mundo:
    'M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19zM2.5 12h19M12 2.5A14.6 14.6 0 0 1 15.8 12 14.6 14.6 0 0 1 12 21.5 14.6 14.6 0 0 1 8.2 12 14.6 14.6 0 0 1 12 2.5z',
  grafico: 'M3 20.5V10M9.7 20.5V3.5M16.4 20.5v-7M21.5 20.5h-19',
  nivel: 'M12 2.5l2.9 5.9 6.6 1-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-1z',
  previsao: 'M22.5 6.5 13.8 15.2l-4.6-4.6L1.5 18.3M16.8 6.5h5.7v5.7',
  calculadora:
    'M6 2.5h12a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 20V4A1.5 1.5 0 0 1 6 2.5zM8 6.5h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h4',
  varinha:
    'M14.6 6.2a1 1 0 0 0 0 1.4l1.8 1.8a1 1 0 0 0 1.4 0l3.6-3.6a6 6 0 0 1-7.9 7.9l-6.6 6.6a2.1 2.1 0 1 1-3-3l6.6-6.6a6 6 0 0 1 7.9-7.9z',
  ajuda: 'M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19zM9.3 9.2a2.8 2.8 0 0 1 5.4.9c0 1.9-2.7 2.8-2.7 2.8M12 17h.01',
  aviso: 'm10.3 3.9-8.5 14.2A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9.2v4.2M12 17.2h.01',
  menu: 'M3.5 12h17M3.5 6h17M3.5 18h17',
  desligado: 'M12 2.5v9M18.4 5.6a9 9 0 1 1-12.8 0',
  relogio: 'M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19zM12 6.5V12l3.6 2.1',
  atualizar:
    'M22.5 4.2v6h-6M1.5 19.8v-6h6M4 9.2a8.5 8.5 0 0 1 14-3.2l4.5 4.2M1.5 13.8 6 18a8.5 8.5 0 0 0 14-3.2',
  dica: 'M9 20.5h6M10 23h4M12 1.5a6.5 6.5 0 0 1 4 11.6V17H8v-3.9A6.5 6.5 0 0 1 12 1.5z',
} as const;

export type IconName = keyof typeof ICON_PATHS;
