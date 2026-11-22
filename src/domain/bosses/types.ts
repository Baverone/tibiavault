// Os tipos do catálogo dos bosses e do Bosstiary (22/11/2026).
// Desenho: docs/superpowers/specs/2026-11-22-bosses-design.md

export type Categoria = 'Bane' | 'Archfoe' | 'Nemesis';
export type Valor = 'equipamento' | 'lucro' | 'bosstiary';
export type Marca = 'sempre' | 'bosstiary' | 'fora';
export type Patamar = 'nenhum' | 'prowess' | 'expertise' | 'mastery';
export type Modo = 'solo' | 'team';
/**
 * `diario`: um bloco da rota de todos os dias. `endgame`: os bosses a testar.
 * `semana`: o varrimento do Bosstiary de um dia da semana (sem `diaSemana`,
 * todos os dias — os selos de Ferumbras, que têm 44 h). `team`: uma sessão.
 */
export type TipoBloco = 'diario' | 'endgame' | 'semana' | 'team';

export interface Bloco {
  id: string;
  nome: string;
  tipo: TipoBloco;
  ordem: number;
  /** 0 = domingo … 6 = sábado (dia de Tibia). */
  diaSemana?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export interface ModoSolo {
  dificil: boolean;
  nivelRp: number | null;
  nivelMonk: number | null;
  valor: Valor;
  bloco: string;
  ordem: number;
  minutos: number | null;
}

export interface ModoTeam {
  tamanhoMin: number | null;
  tamanhoTipico: number | null;
  composicao: string;
  nivel: number | null;
  valor: Valor;
  bloco: string;
  ordem: number;
  minutos: number | null;
}

export interface Boss {
  id: string;
  nome: string;
  area: string;
  regiao: string;
  categoria: Categoria;
  /** `null` = a pesquisa não o encontrou; conta como 20 h. */
  cooldownH: number | null;
  acesso: string;
  loot: string;
  notas: string;
  incerto: boolean;
  fontes: string[];
  solo?: ModoSolo;
  team?: ModoTeam;
  /** Boss de spawn raro seguido pelo GuildStats (22/11/2026): o nome lá, para casar com a previsão do dia. */
  raro?: { nomeGuildstats: string };
}

export interface Catalogo {
  geradoEm: string;
  blocos: Bloco[];
  bosses: Boss[];
}
