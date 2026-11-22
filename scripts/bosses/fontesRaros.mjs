// A ficha dos bosses raros (22/11/2026): quais o GuildStats segue no Celesta
// (a última leitura gravada, data/bosses-raros/celesta.json — o GuildStats não
// se pede daqui) e, para cada um, a classe do Bosstiary e o local tirados da
// TibiaWiki. Corre-se à mão quando aparece um raro novo (o lerRaros.mjs avisa:
// «semFicha»):
//
//   node scripts/bosses/fontesRaros.mjs
//
// Escreve data/bosses-fontes/raros.json. Os que não têm classe do Bosstiary
// (bosses de Rookgaard, criaturas de raid como os yetis) ficam lá com
// `categoria: null`, e o gerador do catálogo deixa-os de fora.
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CATEGORIAS = new Set(['Bane', 'Archfoe', 'Nemesis']);
const PEQUENAS = new Set(['the', 'of', 'in', 'a', 'an', 'and', 'on', 'from']);

const campo = (wikitext, nome) => new RegExp(`^\\|\\s*${nome}\\s*=\\s*(.*)$`, 'mi').exec(wikitext)?.[1].trim() ?? '';

function semMarcacao(s) {
  return s
    .replace(/<ref[^>]*>.*?<\/ref>|<ref[^>]*\/>/gi, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/'{2,}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A classe do Bosstiary (ou null) e o local, da caixa «Infobox Creature». */
export function lerInfobox(wikitext) {
  const classe = campo(wikitext, 'bosstiaryclass');
  return {
    categoria: CATEGORIAS.has(classe) ? classe : null,
    area: semMarcacao(campo(wikitext, 'location')).slice(0, 160),
  };
}

/** O nome do GuildStats e, se for diferente, a forma da wiki (Title Case, palavras pequenas em minúscula). */
export function titulosPossiveis(nome) {
  const wiki = nome
    .split(' ')
    .map((p, i) => (i > 0 && PEQUENAS.has(p.toLowerCase()) ? p.toLowerCase() : p[0].toUpperCase() + p.slice(1)))
    .join(' ');
  return wiki === nome ? [nome] : [nome, wiki];
}

/** A ficha de um raro: a classe da wiki; sem ela, o tipo que o GuildStats mostra. */
export function fichaDe(raro, pagina) {
  const info = pagina ? lerInfobox(pagina.wikitext) : { categoria: null, area: '' };
  return {
    nomeGuildstats: raro.nome,
    nome: pagina?.titulo ?? raro.nome,
    categoria: info.categoria ?? (CATEGORIAS.has(raro.tipo) ? raro.tipo : null),
    area: info.area,
    wiki: pagina ? `https://tibia.fandom.com/wiki/${encodeURIComponent(pagina.titulo.replace(/ /g, '_'))}` : null,
  };
}

async function wikitextDe(titulo) {
  const url = new URL('https://tibia.fandom.com/api.php');
  url.search = new URLSearchParams({ action: 'parse', page: titulo, prop: 'wikitext', format: 'json', redirects: '1' }).toString();
  const r = await fetch(url, { headers: { 'User-Agent': 'TibiaVault/1.0 (+https://github.com/Baverone/tibiavault)' } });
  if (!r.ok) throw new Error(`TibiaWiki ${r.status} em ${titulo}`);
  const corpo = await r.json();
  if (corpo.error) return null;
  return { titulo: corpo.parse.title, wikitext: corpo.parse.wikitext['*'] };
}

async function principal() {
  const leitura = JSON.parse(readFileSync(new URL('../../data/bosses-raros/celesta.json', import.meta.url), 'utf8'));
  const raros = leitura.bosses;
  const fichas = [];
  for (const raro of raros) {
    let pagina = null;
    for (const t of titulosPossiveis(raro.nome)) {
      pagina = await wikitextDe(t);
      if (pagina) break;
    }
    await new Promise((ok) => setTimeout(ok, 300));
    const ficha = fichaDe(raro, pagina);
    fichas.push(ficha);
    console.error(`${raro.nome} → ${pagina?.titulo ?? '(sem página)'} · ${ficha.categoria ?? 'fora do Bosstiary'}`);
  }
  const destino = new URL('../../data/bosses-fontes/raros.json', import.meta.url);
  writeFileSync(destino, JSON.stringify(fichas, null, 1) + '\n');
  console.log(JSON.stringify({ raros: fichas.length, bosstiary: fichas.filter((f) => f.categoria).length }));
}

// pelo caminho verdadeiro: o tibiavault também se corre pela junção C:\Users\Catarina\tibiavault
const chamadoDirecto = (() => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (chamadoDirecto) {
  principal().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
