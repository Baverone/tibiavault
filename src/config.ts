// "<your-github-username>/<repo-name>" of the public repo that doubles as the
// read-only database: the app fetches data/scraped-history/<id>.json
// straight from raw.githubusercontent.com.
//
// Until this is set correctly nothing loads — there is no manual XP input to
// fall back on any more (see src/storage/sharedHistory.ts and the README).
// The panel says the history is empty; it does not say why.
// Renomeado de Baverone/calculadora-tibia a 15/09/2026 (decisão do André).
// O GitHub redirecciona o nome antigo, mas o raw.githubusercontent.com não
// garante isso — por isso o nome novo tem de estar aqui.
export const GITHUB_REPO = 'Baverone/tibiavault';

