// A rotação de bosses de hoje, solo e team (22/11/2026). Regras: secção
// «Regras de omissão» de docs/superpowers/specs/2026-11-22-bosses-design.md.
import { chegouAoObjetivo, objetivoOmissao } from './bosstiary.ts';
import { acessoEfetivo, estadoDe, type EstadoBoss, type EstadoPersonagem } from './estado.ts';
import type { Bloco, Boss, Catalogo, Marca, Modo } from './types.ts';

const HORA = 3600_000;
/** Um cooldown que a pesquisa não encontrou conta como o diário normal. */
const COOLDOWN_OMISSAO_H = 20;
/** Bosses de team com cooldown acima disto (finais de 68 h, 14 dias…) só aparecem quando estão disponíveis. */
const FINAL_ACIMA_DE_H = 24;
/** O Monk sem nível estimado para ele usa o do RP com esta margem. */
const MARGEM_MONK = 150;

export interface Entrada {
  boss: Boss;
  estado: EstadoBoss;
  marca: Marca;
  /** `null` = disponível agora; senão, o instante em que volta. */
  disponivelEm: number | null;
  boosted: boolean;
  /** O nível que o filtrou é uma estimativa (mostra-se com «~»). */
  nivelEstimado: boolean;
}

export interface BlocoHoje {
  bloco: Bloco;
  entradas: Entrada[];
  /** A soma dos minutos estimados dos bosses disponíveis. */
  minutos: number;
}

export interface Contexto {
  agora: number;
  /** 0 = domingo … 6 = sábado, do dia de Tibia (muda no server save). */
  diaSemana: number;
  /** O nível atual do personagem; `null` = não se sabe, não filtra. */
  nivel: number | null;
  personagem: 'royal-paladin' | 'exalted-monk';
  boosted: string | null;
}

export function marcaEfetiva(boss: Boss, eb: EstadoBoss, modo: Modo): Marca {
  const escolhida = modo === 'solo' ? eb.marcaSolo : eb.marcaTeam;
  if (escolhida) return escolhida;
  const valor = modo === 'solo' ? boss.solo?.valor : boss.team?.valor;
  return valor === 'bosstiary' ? 'bosstiary' : 'sempre';
}

function disponivelEm(boss: Boss, eb: EstadoBoss, agora: number): number | null {
  if (!eb.ultimaKill) return null;
  const volta = Date.parse(eb.ultimaKill) + (boss.cooldownH ?? COOLDOWN_OMISSAO_H) * HORA;
  return volta > agora ? volta : null;
}

/** A marca, se o boss entra; `null` se fica de fora (fora, sem acesso, objetivo atingido). */
function marcaSeEntra(boss: Boss, eb: EstadoBoss, modo: Modo): Marca | null {
  const marca = marcaEfetiva(boss, eb, modo);
  if (marca === 'fora') return null;
  if (acessoEfetivo(eb) === false) return null;
  if (marca === 'bosstiary' && chegouAoObjetivo(eb.kills, boss.categoria, eb.objetivo ?? objetivoOmissao(boss.categoria))) return null;
  return marca;
}

/** O nível mínimo para este personagem e se é estimado; `null` = não filtra. */
function nivelMinimo(boss: Boss, ctx: Contexto): { nivel: number | null; estimado: boolean } {
  const s = boss.solo;
  if (!s) return { nivel: null, estimado: false };
  if (ctx.personagem === 'royal-paladin') return { nivel: s.nivelRp, estimado: boss.incerto };
  if (s.nivelMonk !== null) return { nivel: s.nivelMonk, estimado: boss.incerto };
  return s.nivelRp === null ? { nivel: null, estimado: false } : { nivel: s.nivelRp + MARGEM_MONK, estimado: true };
}

function entrada(boss: Boss, eb: EstadoBoss, marca: Marca, ctx: Contexto, nivelEstimado: boolean): Entrada {
  return {
    boss,
    estado: eb,
    marca,
    disponivelEm: disponivelEm(boss, eb, ctx.agora),
    boosted: ctx.boosted !== null && boss.nome.toLowerCase() === ctx.boosted.trim().toLowerCase(),
    nivelEstimado,
  };
}

function montar(blocos: Bloco[], porBloco: Map<string, Entrada[]>, modo: Modo): BlocoHoje[] {
  const ordem = (e: Entrada) => (modo === 'solo' ? e.boss.solo?.ordem : e.boss.team?.ordem) ?? 0;
  const minutos = (e: Entrada) => (modo === 'solo' ? e.boss.solo?.minutos : e.boss.team?.minutos) ?? 0;
  return [...blocos]
    .sort((a, b) => a.ordem - b.ordem)
    .map((bloco) => {
      const entradas = [...(porBloco.get(bloco.id) ?? [])].sort((a, b) => ordem(a) - ordem(b));
      return { bloco, entradas, minutos: entradas.filter((e) => e.disponivelEm === null).reduce((s, e) => s + minutos(e), 0) };
    })
    .filter((b) => b.entradas.length > 0);
}

export function rotacaoSolo(cat: Catalogo, est: EstadoPersonagem, ctx: Contexto): { blocos: BlocoHoje[]; endgame: Entrada[] } {
  const blocos = new Map(cat.blocos.map((b) => [b.id, b]));
  const porBloco = new Map<string, Entrada[]>();
  const endgame: Entrada[] = [];
  for (const boss of cat.bosses) {
    const s = boss.solo;
    const bloco = s ? blocos.get(s.bloco) : undefined;
    if (!s || !bloco) continue;
    if (bloco.tipo === 'semana' && bloco.diaSemana !== undefined && bloco.diaSemana !== ctx.diaSemana) continue;
    const eb = estadoDe(est, boss.id);
    const marca = marcaSeEntra(boss, eb, 'solo');
    if (!marca) continue;
    const minimo = nivelMinimo(boss, ctx);
    if (minimo.nivel !== null && ctx.nivel !== null && minimo.nivel > ctx.nivel) continue;
    const e = entrada(boss, eb, marca, ctx, minimo.estimado);
    if (bloco.tipo === 'endgame' && !eb.passou) {
      endgame.push(e);
      continue;
    }
    porBloco.set(bloco.id, [...(porBloco.get(bloco.id) ?? []), e]);
  }
  endgame.sort((a, b) => (a.boss.solo?.ordem ?? 0) - (b.boss.solo?.ordem ?? 0));
  return { blocos: montar(cat.blocos.filter((b) => b.tipo !== 'team'), porBloco, 'solo'), endgame };
}

export function rotacaoTeam(cat: Catalogo, est: EstadoPersonagem, ctx: Contexto): { principais: BlocoHoje[]; soBosstiary: BlocoHoje[] } {
  const porBloco = new Map<string, Entrada[]>();
  for (const boss of cat.bosses) {
    if (!boss.team) continue;
    const eb = estadoDe(est, boss.id);
    const marca = marcaSeEntra(boss, eb, 'team');
    if (!marca) continue;
    const e = entrada(boss, eb, marca, ctx, boss.incerto);
    if ((boss.cooldownH ?? COOLDOWN_OMISSAO_H) > FINAL_ACIMA_DE_H && e.disponivelEm !== null) continue;
    porBloco.set(boss.team.bloco, [...(porBloco.get(boss.team.bloco) ?? []), e]);
  }
  const todos = montar(cat.blocos.filter((b) => b.tipo === 'team'), porBloco, 'team');
  const principal = (b: BlocoHoje) => b.entradas.some((e) => e.boss.team?.valor !== 'bosstiary');
  return { principais: todos.filter(principal), soBosstiary: todos.filter((b) => !principal(b)) };
}
