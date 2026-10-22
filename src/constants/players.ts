// Extensões explícitas: este módulo é alcançado pelo `navigation/pages.test.ts`
// no `node --test`, que corre com o `tsconfig.node.json` (`moduleResolution:
// nodenext`) e as exige. O Vite resolve-as na mesma.
import type { CharacterId } from '../domain/types.ts';
import type { IconName } from '../components/shell/iconPaths.ts';

export interface PlayerMeta {
  /** Também o nome do ficheiro em data/scraped-history/<id>.json. */
  id: CharacterId;
  /** O id na navegação e no URL (`#baverone`). */
  slug: string;
  name: string;
  /** A vocação, tal como aparece por baixo do nome. */
  vocation: string;
  tagline: string;
  /** Um nome do conjunto de `components/shell/icons`. */
  icon: IconName;
  /**
   * A cor da personagem, em hexadecimal.
   *
   * Literal e não `var(--baverone)` de propósito: o Recharts escreve isto no
   * ATRIBUTO `fill` do SVG, e uma variável CSS num atributo não é resolvida
   * por browser nenhum — o gráfico saía preto. As mesmas duas cores estão
   * também em `styles/tokens.css`, para o CSS as poder usar.
   */
  accentColor: string;
  /**
   * Porque é que a recolha não o cobre, dito ao André. Só existe para quem
   * está `source: null` em scripts/lib/trackedPlayers.mjs (o pages.test.ts
   * confronta as duas listas). Com isto, os dados velhos deixam de ser «uma
   * avaria — vê a tarefa no PC» e passam a ser o que são.
   */
  noSource?: string;
  /**
   * A tarefa do ai-pc que o recolhe — é a que o aviso de dados velhos manda
   * ver. Sem isto, `tibia-xp`.
   */
  collectorTask?: string;
}

/**
 * Os dois bonecos. Se um dia voltar a haver mais, é aqui e em
 * scripts/lib/trackedPlayers.mjs — as duas listas têm de bater certo, senão a
 * app pede um ficheiro que o robô nunca escreve.
 *
 * Era um `.tsx` que exportava dois componentes de ícone a par das constantes —
 * o que tirava o fast refresh ao Vite e era a única coisa de que o linter se
 * queixava. Os ícones passaram para o conjunto comum e isto voltou a ser um
 * ficheiro de constantes.
 */
export const PLAYERS: PlayerMeta[] = [
  {
    id: 'royal-paladin',
    slug: 'baverone',
    name: 'Baverone',
    vocation: 'Royal Paladin',
    tagline: 'Royal Paladin — Precisão',
    icon: 'arco',
    accentColor: '#38d39f',
  },
  {
    id: 'exalted-monk',
    slug: 'bluey',
    name: 'Bluey The Cat',
    vocation: 'Exalted Monk',
    tagline: 'Exalted Monk — Disciplina',
    icon: 'lotus',
    accentColor: '#b08cff',
    // 20/10/2026: fora do top 1000 dos highscores desde 14/10, e estava aqui
    // `noSource`. 21/10/2026: volta a ter fonte — a página de personagem do
    // guildstats (scripts/lib/guildstatsCharacter.mjs). Os dias 14 a 19/10
    // foram preenchidos à mão nesse dia. Mais tarde no mesmo dia, decisão do
    // André: a tabela Experience do guildstats lida no Chrome dele, pela tarefa
    // tibia-xp-chrome do ai-pc. O aviso só aparece com mais de 3 dias sem
    // leitura (isStaleReading) e manda ver essa tarefa.
    collectorTask: 'tibia-xp-chrome',
  },
];

export function playerBySlug(slug: string): PlayerMeta | undefined {
  return PLAYERS.find((player) => player.slug === slug);
}
