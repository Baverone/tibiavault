// Os bosses raros do Celesta (22/11/2026): a chance de hoje que o GuildStats
// calcula (data/bosses-raros/celesta.json, lido no PC pela tarefa tibia-raros)
// ao lado do progresso no Bosstiary. É o único sítio da página Bosses com
// «cooldowns»: o André só os quer nos raros, e só porque há uma página que os
// segue.
import { estadoDe, type EstadoBoss, type EstadoPersonagem } from './estado.ts';
import type { Boss, Catalogo } from './types.ts';

export type Previsao = { tipo: 'pct'; valor: number } | { tipo: 'baixa' } | { tipo: 'nao'; emDias: number | null };

export interface LinhaPrevisao {
  nome: string;
  previsao: Previsao;
  ultimoVisto: string | null;
  ontem: number;
}

export interface LeituraRaros {
  lidoEm: string;
  fonte: string;
  bosses: LinhaPrevisao[];
}

export interface EntradaRaro {
  boss: Boss;
  estado: EstadoBoss;
  previsao: Previsao | null;
  ultimoVisto: string | null;
  /** Dias desde o último dia em que foi visto no Celesta. */
  diasDesde: number | null;
  /** Kills ontem no Celesta (de toda a gente). */
  ontem: number;
}

const DIA = 86_400_000;
const VELHA_H = 36;

function limparPrevisao(p: unknown): Previsao | null {
  if (typeof p !== 'object' || p === null) return null;
  const r = p as Record<string, unknown>;
  if (r.tipo === 'pct' && typeof r.valor === 'number' && Number.isFinite(r.valor)) return { tipo: 'pct', valor: r.valor };
  if (r.tipo === 'baixa') return { tipo: 'baixa' };
  if (r.tipo === 'nao') return { tipo: 'nao', emDias: typeof r.emDias === 'number' && Number.isFinite(r.emDias) ? r.emDias : null };
  return null;
}

/** O ficheiro lido do repositório, verificado campo a campo; lixo dá `null`. */
export function limparLeitura(raw: unknown): LeituraRaros | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.bosses) || typeof r.lidoEm !== 'string' || Number.isNaN(Date.parse(r.lidoEm))) return null;
  const bosses: LinhaPrevisao[] = [];
  for (const x of r.bosses as unknown[]) {
    if (typeof x !== 'object' || x === null) continue;
    const b = x as Record<string, unknown>;
    const previsao = limparPrevisao(b.previsao);
    if (typeof b.nome !== 'string' || !previsao) continue;
    bosses.push({
      nome: b.nome,
      previsao,
      ultimoVisto: typeof b.ultimoVisto === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.ultimoVisto) ? b.ultimoVisto : null,
      ontem: typeof b.ontem === 'number' && Number.isFinite(b.ontem) ? b.ontem : 0,
    });
  }
  return { lidoEm: r.lidoEm, fonte: typeof r.fonte === 'string' ? r.fonte : '', bosses };
}

/** O ficheiro só muda quando as previsões mudam, e mudam todos os dias: 36 h sem mudar é a leitura parada. */
export function leituraVelha(leitura: LeituraRaros, agora: number): boolean {
  return agora - Date.parse(leitura.lidoEm) > VELHA_H * 3_600_000;
}

/** Ordem: chance de hoje (maior primeiro), «baixa», janela a abrir mais cedo, sem previsão. */
function chave(p: Previsao | null): [number, number] {
  if (!p) return [3, 0];
  if (p.tipo === 'pct') return [0, -p.valor];
  if (p.tipo === 'baixa') return [1, 0];
  return [2, p.emDias ?? Number.MAX_SAFE_INTEGER];
}

export function listaRaros(cat: Catalogo, est: EstadoPersonagem, leitura: LeituraRaros | null, agora: number): EntradaRaro[] {
  const porNome = new Map((leitura?.bosses ?? []).map((l) => [l.nome.toLowerCase(), l]));
  return cat.bosses
    .filter((b) => b.raro)
    .map((boss) => {
      const l = porNome.get(boss.raro!.nomeGuildstats.toLowerCase());
      const visto = l?.ultimoVisto ?? null;
      return {
        boss,
        estado: estadoDe(est, boss.id),
        previsao: l?.previsao ?? null,
        ultimoVisto: visto,
        diasDesde: visto ? Math.floor((agora - Date.parse(`${visto}T00:00:00Z`)) / DIA) : null,
        ontem: l?.ontem ?? 0,
      };
    })
    .sort((a, b) => {
      const [ga, va] = chave(a.previsao);
      const [gb, vb] = chave(b.previsao);
      return ga - gb || va - vb || a.boss.nome.localeCompare(b.boss.nome);
    });
}
