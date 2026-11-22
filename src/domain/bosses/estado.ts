// O Bosstiary de cada personagem, tal como fica em data/bosstiary/<id>.json
// (22/11/2026), e as alterações que o mudam.
//
// O ficheiro só guarda o que difere do catálogo: as kills, a última kill e o
// que ele mudou à mão (marca, acesso, objetivo, «passou»). As alterações são
// diferenças (+1 kill, nova marca) aplicadas sobre o que se lê no momento de
// gravar — assim dois aparelhos a gravar ao mesmo tempo não se apagam.
import type { Marca, Modo, Patamar } from './types.ts';

export interface EstadoBoss {
  kills: number;
  ultimaKill: string | null;
  /** `null` = ainda não se sabe (o «?» na página). */
  acesso: boolean | null;
  marcaSolo?: Marca;
  marcaTeam?: Marca;
  objetivo?: Patamar;
  /** Bosses do bloco «endgame a testar» que ele já fez: entram na rota diária. */
  passou?: boolean;
}

export interface EstadoPersonagem {
  /** Pelo `id` do boss no catálogo. */
  bosses: Record<string, EstadoBoss>;
  /** O total de pontos que ele vê no Bosstiary do jogo (inclui bosses fora do catálogo). */
  pontosJogo: number | null;
}

export type Alteracao =
  | { tipo: 'kill'; id: string; quantas: number; quando: string }
  | { tipo: 'kills'; id: string; valor: number }
  | { tipo: 'marca'; id: string; modo: Modo; marca: Marca }
  | { tipo: 'acesso'; id: string; acesso: boolean | null }
  | { tipo: 'objetivo'; id: string; objetivo: Patamar }
  | { tipo: 'passou'; id: string; passou: boolean }
  | { tipo: 'pontosJogo'; valor: number | null };

const MARCAS: readonly string[] = ['sempre', 'bosstiary', 'fora'];
const PATAMARES: readonly string[] = ['nenhum', 'prowess', 'expertise', 'mastery'];

const inteiro = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number.NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function limparBoss(raw: unknown): EstadoBoss {
  const r = isObj(raw) ? raw : {};
  const eb: EstadoBoss = {
    kills: inteiro(r.kills),
    ultimaKill: typeof r.ultimaKill === 'string' && !Number.isNaN(Date.parse(r.ultimaKill)) ? r.ultimaKill : null,
    acesso: typeof r.acesso === 'boolean' ? r.acesso : null,
  };
  if (typeof r.marcaSolo === 'string' && MARCAS.includes(r.marcaSolo)) eb.marcaSolo = r.marcaSolo as Marca;
  if (typeof r.marcaTeam === 'string' && MARCAS.includes(r.marcaTeam)) eb.marcaTeam = r.marcaTeam as Marca;
  if (typeof r.objetivo === 'string' && PATAMARES.includes(r.objetivo)) eb.objetivo = r.objetivo as Patamar;
  if (typeof r.passou === 'boolean') eb.passou = r.passou;
  return eb;
}

export function limparEstado(raw: unknown): EstadoPersonagem {
  const r = isObj(raw) ? raw : {};
  const bosses: Record<string, EstadoBoss> = {};
  if (isObj(r.bosses)) for (const [id, b] of Object.entries(r.bosses)) bosses[id] = limparBoss(b);
  const pj = r.pontosJogo;
  return { bosses, pontosJogo: typeof pj === 'number' && Number.isFinite(pj) && pj >= 0 ? Math.floor(pj) : null };
}

export function estadoDe(estado: EstadoPersonagem, id: string): EstadoBoss {
  return estado.bosses[id] ?? { kills: 0, ultimaKill: null, acesso: null };
}

/** Aplica as alterações por ordem, sem mexer no estado recebido. */
export function aplicar(estado: EstadoPersonagem, alteracoes: Alteracao[]): EstadoPersonagem {
  const bosses: Record<string, EstadoBoss> = { ...estado.bosses };
  let pontosJogo = estado.pontosJogo;
  for (const a of alteracoes) {
    if (a.tipo === 'pontosJogo') {
      pontosJogo = a.valor === null ? null : inteiro(a.valor);
      continue;
    }
    const eb: EstadoBoss = { ...(bosses[a.id] ?? { kills: 0, ultimaKill: null, acesso: null }) };
    if (a.tipo === 'kill') {
      eb.kills += inteiro(a.quantas);
      eb.ultimaKill = a.quando;
    } else if (a.tipo === 'kills') eb.kills = inteiro(a.valor);
    else if (a.tipo === 'marca') {
      if (a.modo === 'solo') eb.marcaSolo = a.marca;
      else eb.marcaTeam = a.marca;
    } else if (a.tipo === 'acesso') eb.acesso = a.acesso;
    else if (a.tipo === 'objetivo') eb.objetivo = a.objetivo;
    else if (a.tipo === 'passou') eb.passou = a.passou;
    bosses[a.id] = eb;
  }
  return { bosses, pontosJogo };
}

/**
 * Se ele tem acesso ao boss: quem já tem kills tem acesso, salvo um «sem
 * acesso» explícito; sem kills, vale o que ele disse (ou `null`, o «?»).
 */
export function acessoEfetivo(eb: EstadoBoss): boolean | null {
  if (eb.acesso === false) return false;
  if (eb.kills > 0) return true;
  return eb.acesso;
}
