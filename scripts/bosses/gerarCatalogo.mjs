// Gera src/data/bosses/catalogo.json a partir das pesquisas em data/bosses-fontes/
// e dos blocos em blocos.mjs (22/11/2026).
//
//   node scripts/bosses/gerarCatalogo.mjs
//
// Falha (e diz o nome) se um boss das pesquisas não tiver bloco, ou se um bloco
// citar um boss que as pesquisas não têm: o catálogo nunca sai com buracos.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { ALIASES_TEAM, BLOCOS_SOLO, BLOCOS_TEAM } from './blocos.mjs';

const raiz = new URL('../../', import.meta.url);
const ler = (p) => JSON.parse(readFileSync(new URL(p, raiz), 'utf8'));
const solo = ler('data/bosses-fontes/solo.json');
const team = ler('data/bosses-fontes/team.json');

const VALOR = { gear: 'equipamento', profit: 'lucro', bosstiary: 'bosstiary' };
const slug = (nome) =>
  nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

const erros = [];
const bosses = new Map();

function base(x) {
  const cat = ['Bane', 'Archfoe', 'Nemesis'].includes(x.category) ? x.category : 'Archfoe';
  return {
    id: slug(x.name),
    nome: x.name,
    area: x.area ?? '',
    regiao: x.region ?? '',
    categoria: cat,
    cooldownH: num(x.cooldown_hours),
    acesso: x.access ?? '',
    loot: x.loot_highlights ?? '',
    notas: x.notes ?? '',
    incerto: Boolean(x.uncertain) || cat !== x.category,
    fontes: Array.isArray(x.source_urls) ? x.source_urls : [],
  };
}

function lugar(blocos, nome) {
  for (const b of blocos) {
    const i = b.bosses.indexOf(nome);
    if (i >= 0) return { bloco: b, ordem: i };
  }
  return null;
}

function minutosSolo(bloco, nome) {
  const extra = bloco.minutosPorBoss ?? {};
  for (const [prefixo, m] of Object.entries(extra)) if (nome.startsWith(prefixo)) return m;
  if (bloco.minutos == null) return 20;
  return Math.max(3, Math.round(bloco.minutos / bloco.bosses.length));
}

for (const x of solo) {
  const l = lugar(BLOCOS_SOLO, x.name);
  if (!l) {
    erros.push(`solo sem bloco: ${x.name}`);
    continue;
  }
  const b = base(x);
  b.solo = {
    dificil: x.solo === 'hard',
    nivelRp: num(x.min_level_rp),
    nivelMonk: num(x.min_level_monk),
    valor: VALOR[x.farm_value] ?? 'bosstiary',
    bloco: l.bloco.id,
    ordem: l.ordem,
    minutos: minutosSolo(l.bloco, x.name),
  };
  bosses.set(x.name, b);
}

for (const x of team) {
  for (const nome of ALIASES_TEAM[x.name] ?? [x.name]) {
    const l = lugar(BLOCOS_TEAM, nome);
    if (!l) {
      erros.push(`team sem bloco: ${nome}`);
      continue;
    }
    const b = bosses.get(nome) ?? { ...base({ ...x, name: nome }) };
    if (!bosses.has(nome)) bosses.set(nome, b);
    if (b.cooldownH == null) b.cooldownH = num(x.cooldown_hours);
    b.incerto = b.incerto || Boolean(x.uncertain);
    for (const f of x.source_urls ?? []) if (!b.fontes.includes(f)) b.fontes.push(f);
    b.team = {
      tamanhoMin: num(x.team_size_min),
      tamanhoTipico: num(x.team_size_typical),
      composicao: x.composition ?? '',
      nivel: num(x.min_level),
      valor: VALOR[x.farm_value] ?? 'bosstiary',
      bloco: l.bloco.id,
      ordem: l.ordem,
      minutos: num(x.duration_min),
    };
  }
}

for (const b of [...BLOCOS_SOLO, ...BLOCOS_TEAM]) {
  for (const nome of b.bosses) if (!bosses.has(nome)) erros.push(`o bloco ${b.id} cita ${nome}, que as pesquisas não têm`);
}

if (erros.length > 0) {
  console.error(erros.join('\n'));
  process.exit(1);
}

const blocos = [
  ...BLOCOS_SOLO.map((b, i) => ({ id: b.id, nome: b.nome, tipo: b.tipo, ordem: i, ...(b.diaSemana != null ? { diaSemana: b.diaSemana } : {}) })),
  ...BLOCOS_TEAM.map((b, i) => ({ id: b.id, nome: b.nome, tipo: 'team', ordem: i })),
];
const catalogo = {
  geradoEm: new Date().toISOString().slice(0, 10),
  blocos,
  bosses: [...bosses.values()].sort((a, b) => a.nome.localeCompare(b.nome)),
};
mkdirSync(new URL('src/data/bosses/', raiz), { recursive: true });
writeFileSync(new URL('src/data/bosses/catalogo.json', raiz), `${JSON.stringify(catalogo, null, 1)}\n`);
console.log(`catálogo: ${catalogo.bosses.length} bosses, ${blocos.length} blocos`);
