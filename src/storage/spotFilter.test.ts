// O filtro de spots do Celesta, com dados sintéticos e um localStorage em
// memória — nada do data/ real nem do browser. «Recarregar» aqui é voltar a
// chamar o loadSelectedSpots com o mesmo armazenamento por baixo, que é o que
// o useState(() => loadSelectedSpots()) do painel faz ao abrir a página.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { applySpotFilter, loadSelectedSpots, saveSelectedSpots } from './spotFilter.ts';

class MemoryStorage {
  private items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.has(key) ? this.items.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, String(value));
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
  clear(): void {
    this.items.clear();
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });

const SPOTS = [{ name: 'Spot Alfa' }, { name: 'Spot Beta' }, { name: 'Spot Gama' }];

function nomes(spots: { name: string }[]): string[] {
  return spots.map((spot) => spot.name);
}

beforeEach(() => storage.clear());

test('sem escolha feita mostra-se tudo', () => {
  assert.equal(loadSelectedSpots(), null);
  assert.deepEqual(nomes(applySpotFilter(SPOTS, null)), ['Spot Alfa', 'Spot Beta', 'Spot Gama']);
});

test('tudo escondido: a lista fica vazia e continua vazia ao recarregar', () => {
  saveSelectedSpots([]);
  const recarregado = loadSelectedSpots();
  // [] não é null: escondeste tudo de propósito, não é «nunca escolheste».
  assert.deepEqual(recarregado, []);
  assert.deepEqual(applySpotFilter(SPOTS, recarregado), []);
});

test('escolha só com nomes antigos: nada à vista, sem erro', () => {
  saveSelectedSpots(['Spot Antigo', 'Outro Que Saiu']);
  assert.deepEqual(applySpotFilter(SPOTS, loadSelectedSpots()), []);
});

test('escolha com nomes antigos e atuais: só os atuais aparecem, pela ordem dos dados', () => {
  saveSelectedSpots(['Spot Gama', 'Spot Antigo', 'Spot Alfa']);
  assert.deepEqual(nomes(applySpotFilter(SPOTS, loadSelectedSpots())), ['Spot Alfa', 'Spot Gama']);
});

test('«Mostrar todos» apaga a escolha e o recarregar volta a mostrar tudo', () => {
  saveSelectedSpots([]);
  saveSelectedSpots(null);
  const recarregado = loadSelectedSpots();
  assert.equal(recarregado, null);
  assert.deepEqual(nomes(applySpotFilter(SPOTS, recarregado)), ['Spot Alfa', 'Spot Beta', 'Spot Gama']);
});

test('uma escolha parcial sobrevive ao recarregar', () => {
  saveSelectedSpots(['Spot Beta']);
  assert.deepEqual(nomes(applySpotFilter(SPOTS, loadSelectedSpots())), ['Spot Beta']);
});

test('lixo no armazenamento conta como «nunca escolheste»', () => {
  storage.setItem('celesta-spot-filter', '{nao e json');
  assert.equal(loadSelectedSpots(), null);
  storage.setItem('celesta-spot-filter', JSON.stringify(['Spot Alfa', 3]));
  assert.equal(loadSelectedSpots(), null);
});
