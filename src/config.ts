// "<your-github-username>/<repo-name>" of the public repo that doubles as the
// read-only database: the app fetches data/scraped-history/<id>.json and
// data/celesta-hunts.json straight from raw.githubusercontent.com.
//
// Until this is set correctly nothing loads — there is no manual XP input to
// fall back on any more (see src/storage/sharedHistory.ts and the README).
// The panel says the history is empty; it does not say why.
// Renomeado de Baverone/calculadora-tibia a 15/09/2026 (decisão do André).
// O GitHub redirecciona o nome antigo, mas o raw.githubusercontent.com não
// garante isso — por isso o nome novo tem de estar aqui.
export const GITHUB_REPO = 'Baverone/tibiavault';

/**
 * Desde quando a recolha das janelas de hunt do Celesta está desligada.
 *
 * 15/09/2026, palavras do André: «tira a pesquisa de hunts pelo discord, para
 * já não quero a funcionar». As tarefas `tibia-celesta` e `tibia-reservas`
 * ficaram sem horário e desativadas; o código fica onde está, porque o «para
 * já» dele é para respeitar nos dois sentidos.
 *
 * A app precisa de saber isto para dizer «está desligada» em vez de «a recolha
 * pode ter parado» — a segunda frase é para uma avaria, e aqui não há nenhuma.
 */
export const CELESTA_COLLECTION_OFF_SINCE = '15/09/2026';
