/**
 * Em que página a app abre quando o endereço não diz.
 *
 * Abria sempre no Baverone. Quem abre isto no telemóvel antes de ir caçar
 * abre-o para ver os spots livres — e isso eram dois toques de cada vez.
 * Guarda-se a última página aberta, pela mesma razão por que já se guarda o
 * filtro de spots e a caixa da hora de Lisboa (`spotFilter.ts`).
 *
 * Sem `localStorage` (janela privada, cookies bloqueados) tudo isto devolve
 * `null` e a app abre no Início. Nunca lança.
 */
import { isPageId, type PageId } from '../navigation/pages';

const KEYS = {
  main: 'app-active-tab',
} as const;

export type TabScope = keyof typeof KEYS;

/**
 * A página guardada, ou `null` se não houver nenhuma.
 *
 * O valor lido é confrontado com as páginas que existem hoje: os separadores
 * antigos («utilities», «royal-paladin») ficaram guardados no browser dele e,
 * sem esta verificação, a app abria num sítio que já não existe — ecrã vazio
 * sem explicação nenhuma.
 */
export function loadTab(scope: TabScope): PageId | null {
  try {
    const raw = localStorage.getItem(KEYS[scope]);
    return raw !== null && isPageId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveTab(scope: TabScope, id: string): void {
  try {
    localStorage.setItem(KEYS[scope], id);
  } catch {
    // Ver acima: sem localStorage a escolha vive só nesta sessão.
  }
}
