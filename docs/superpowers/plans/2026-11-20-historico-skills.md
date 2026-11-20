# Histórico dos skills + contas por varinhas — plano

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (native, escolhido: o André deixou o como comigo).

**Goal:** gravar as leituras de skills no repositório (vistas em todos os aparelhos), mostrar a evolução e os eventos, e calcular o skill final a partir de um número de varinhas.

**Architecture:** domínio puro em `src/domain/` (testado com `node --test`), acesso ao GitHub em `src/storage/skillsHistoryStore.ts` (API de conteúdos, chave no `localStorage`), UI na secção Treino da página da personagem.

**Tech Stack:** React 19 + Vite + TypeScript, Recharts, `node --test --experimental-strip-types`.

**Spec:** `docs/superpowers/specs/2026-11-20-historico-skills-design.md`. Pedido extra do André (20/11, depois da aprovação): *«ao inves de colocar o nível que quero como objetivo, que possa colocar quantas varinhas quero gastar, e com o numero de varinhas dizes me o skill que obtenho»*.

## Global Constraints

- Imports locais com extensão `.ts` nos módulos alcançados pelos testes.
- Textos da UI em português de Portugal.
- Ficheiros de dados: `data/skills-history/<CharacterId>.json`, `data/skills-history/eventos.json`.
- Chave no `localStorage`: `tibiavault:github-token`. Nunca vai para o repositório.
- `vite.config.ts` sem `base`.

## Review Focus

1. Ficheiro de histórico com lixo (JSON estragado, entradas sem a forma certa) → ignora as entradas más, não rebenta a página.
2. Duas gravações quase ao mesmo tempo (telemóvel e PC) → a segunda repete após 409/422 e nenhuma se perde.
3. Chave errada ou caducada (401/403/404 na escrita) → mensagem clara, a leitura fica no ecrã como «não gravada».
4. Uma só leitura, ou leituras no mesmo minuto → ritmo «—», nada de divisão por zero.
5. Varinhas que passam do nível 500 → para no máximo e diz isso.

---

### Task 1: Contas por varinhas

**Files:** Modify `src/domain/skillTraining.ts`, `src/domain/skillTraining.test.ts`, `src/components/skillTraining/SkillTrainingRow.tsx`, `src/storage/skillTrainingStorage.ts` (+ teste de sanitização em `src/storage/savedSettings.test.ts` se for o que já cobre o sanitize).

**Produces:** `calculateSkillFromWands(skill, vocation, displayedLevel, displayedPercentDone, lastingWands, useSpecialDummy, loyaltyBonusPercent): SkillFromWandsResult` com `{ base: {level, percent}, displayed: {level, percent}, baseDouble: {...}, displayedDouble: {...}, capped: boolean }` (percent = % já feito do nível). `SkillEntryInput.wands?: string`; `SkillTrainingConfig.targetMode: 'level' | 'wands'` (omissão `'level'`).

- [ ] Testes: 0 varinhas devolve o nível atual; com Loyalty 0 e nível exato, N varinhas dão os pontos de `N*14400*pointsPerCharge`, inverso de `calculateTrainingToTarget` (as varinhas de `calculateTrainingToTarget` até X levam a ≥ X); Double Skill ≥ normal; acima de 500 → `capped: true`, nível 500.
- [ ] Implementar com `totalPointsAtLevel` + `levelPercentFromPoints` (base) e base×multiplicador para o mostrado.
- [ ] UI: seletor «Objetivo: por nível / por varinhas»; no modo varinhas, campo «Lasting Exercise a gastar» e o resultado (no jogo e base, faltam X% — sem evento e com Double Skill).
- [ ] `npm test`, commit.

### Task 2: Domínio do histórico

**Files:** Create `src/domain/skillsHistory.ts`, `src/domain/skillsHistory.test.ts`.

**Produces:**
- `interface SkillReading { timestamp: number; loyaltyBonusPercent: number; skills: Partial<Record<TrainableSkill, { level: number; percentMissing: number }>> }`
- `interface SkillEvent { id: string; name: string; start: string; end: string }` (datas `YYYY-MM-DD`, fim inclusivo)
- `sanitizeReadings(raw: unknown): SkillReading[]` (ordenadas por tempo), `sanitizeEvents(raw: unknown): SkillEvent[]`
- `readingFromConfig(config: SkillTrainingConfig, skills: TrainableSkill[], now: number): SkillReading | null` (só skills válidas; null se nenhuma)
- `fractionalLevel(level, percentMissing): number` = `level + (100 - percentMissing)/100`
- `skillSeries(readings, skill): { timestamp: number; value: number }[]`
- `ratePerDay(series): number | null`
- `rateInsideOutsideEvents(series, events): { inside: number | null; outside: number | null }` (intervalos que atravessam a fronteira ficam de fora; dia do evento em hora local)

- [ ] Testes para cada função, incluindo os pontos 1 e 4 do Review Focus.
- [ ] Implementar, `npm test`, commit.

### Task 3: Ler e escrever no GitHub

**Files:** Create `src/storage/skillsHistoryStore.ts`, `src/storage/githubToken.ts`, `src/storage/skillsHistoryStore.test.ts`.

**Produces:** `getGithubToken(): string | null`, `setGithubToken(t: string | null)`; `loadReadings(id)`, `appendReading(id, reading, token)`, `loadEvents()`, `saveEvents(events, token)`; `encodeUtf8Base64(s)`, `decodeUtf8Base64(s)`. Lê via `GET https://api.github.com/repos/Baverone/tibiavault/contents/<path>?ref=main` (404 → lista vazia); escreve com PUT (message `chore: leitura de skills <personagem> <data>`, `sha` se existir), uma repetição em 409/422; erros 401/403/404 na escrita → `Error('a chave do GitHub foi recusada …')`.

- [ ] Testes com `fetch` falso: 404 dá vazio; append faz GET+PUT com o conteúdo junto; 409 repete uma vez; 401 dá a mensagem da chave; base64 com acentos ida e volta.
- [ ] Implementar, `npm test`, commit.

### Task 4: Página

**Files:** Create `src/components/skillTraining/SkillHistoryPanel.tsx` (gráfico lazy com Recharts: linha por skill, `ReferenceArea` por evento, períodos 7d/30d/90d/Tudo; ritmo/dia, dentro/fora de eventos; últimas leituras), `src/components/skillTraining/GithubTokenField.tsx`, `src/components/skillTraining/SkillEventsEditor.tsx`, `src/hooks/useSkillsHistory.ts`. Modify `SkillTrainingCalculator.tsx` (botão «Gravar leitura» + estado gravando/gravada/erro).

- [ ] `npm run build` e `npm run lint` limpos; ver no browser (`npm run dev`) com e sem chave; commit.

### Task 5: Fecho

- [ ] `npm test`, `npm run build`; README: secção curta «Histórico dos skills» (onde vivem os dados, como criar a chave).
- [ ] Juntar ao `main` (o `tibia-push` publica) e confirmar o site no ar.
