// O leitor da tabela de bosses raros do GuildStats (22/11/2026). A página real
// (4 linhas guardadas em fixtures/) é a única peça que depende do layout deles.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerTabelaRaros, juntarLeitura, normalizarLinhas } from './guildstatsRaros.mjs';
import { CRUAS } from './fixtures/cruas.mjs';

const HTML = readFileSync(new URL('./fixtures/guildstats-raros.html', import.meta.url), 'utf8');

test('lê só as linhas com previsão, com a chance, a janela e o último dia visto', () => {
  const r = lerTabelaRaros(HTML);
  assert.deepEqual(r, [
    { nome: 'Dharalion', tipo: 'Nemesis', previsao: { tipo: 'nao', emDias: 3 }, ultimoVisto: '2026-11-19', ontem: 0 },
    { nome: "Gaz'haragoth", tipo: 'Nemesis', previsao: { tipo: 'pct', valor: 9.4 }, ultimoVisto: '2026-11-03', ontem: 0 },
    { nome: 'Morshabaal', tipo: 'Nemesis', previsao: { tipo: 'baixa' }, ultimoVisto: '2026-04-13', ontem: 0 },
  ]);
});

// As linhas em texto que o JavaScript tira da página no Chrome do André (tarefa
// tibia-raros-chrome do ai-pc) dão o mesmo que o HTML.
test('as linhas em texto do Chrome dão o mesmo que o HTML', () => {
  assert.deepEqual(normalizarLinhas(CRUAS), lerTabelaRaros(HTML));
});

test('normalizarLinhas: sem nome, sem previsão ou lixo saem; tipo vazio fica null', () => {
  const r = normalizarLinhas([
    { nome: '', possibilidade: 'Low' },
    { nome: 'A', possibilidade: 'talvez' },
    { nome: 'B', tipo: '', possibilidade: '1,234%', emDias: '', ultimoVisto: '-', ontem: '1,002' },
    null,
  ]);
  assert.deepEqual(r, []);
  const r2 = normalizarLinhas([{ nome: 'B', tipo: '', possibilidade: '12.5%', ultimoVisto: '-', ontem: '1,002' }]);
  assert.deepEqual(r2, [{ nome: 'B', tipo: null, previsao: { tipo: 'pct', valor: 12.5 }, ultimoVisto: null, ontem: 1002 }]);
});

test('«-» no último dia visto dá null', () => {
  const r = lerTabelaRaros(HTML.replace('>2026-04-13<', '>-<'));
  assert.equal(r.find((b) => b.nome === 'Morshabaal').ultimoVisto, null);
});

test('sem a tabela ou sem as colunas rebenta a dizer que o layout mudou', () => {
  assert.throws(() => lerTabelaRaros('<html><body>Just a moment...</body></html>'), /layout/);
  assert.throws(() => lerTabelaRaros(HTML.replace('Possibility', 'Chance')), /Possibility/);
});

test('juntarLeitura: o mesmo conteúdo não mexe no ficheiro; conteúdo novo leva a hora', () => {
  const bosses = lerTabelaRaros(HTML);
  const antes = { lidoEm: '2026-11-21T10:10:00.000Z', fonte: 'x', bosses };
  assert.deepEqual(juntarLeitura(antes, bosses, new Date('2026-11-22T10:10:00Z')), { mudou: false, ficheiro: antes });
  const outros = bosses.map((b) => (b.nome === 'Dharalion' ? { ...b, previsao: { tipo: 'nao', emDias: 2 } } : b));
  const r = juntarLeitura(antes, outros, new Date('2026-11-22T10:10:00Z'));
  assert.equal(r.mudou, true);
  assert.equal(r.ficheiro.lidoEm, '2026-11-22T10:10:00.000Z');
  assert.equal(r.ficheiro.bosses, outros);
  // sem ficheiro anterior (ou estragado) também grava
  assert.equal(juntarLeitura(null, bosses, new Date('2026-11-22T10:10:00Z')).mudou, true);
});
