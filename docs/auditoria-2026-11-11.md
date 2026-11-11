# Auditoria técnica do TibiaVault — 11/11/2026

Pedido do André: auditoria técnica completa, feita em conjunto com o ChatGPT
(Codex), corrigir bugs e erros, e no fim um relatório do que foi feito.

## Como foi feita

Três leituras independentes do código, cruzadas no fim:

1. **Codex (ChatGPT)**: revisão independente de todo o projeto (`src/`,
   `scripts/`, workflows, testes), sem ver as minhas conclusões. Deu 19 bugs e
   7 melhorias.
2. **Claude, lado da app** (`src/`): lógica, datas e fusos, estado React,
   validação, acessibilidade. 9 bugs.
3. **Claude, lado da recolha** (`scripts/`, workflows, ficheiros de `data/`):
   simulou os scripts num repositório git falso. 5 bugs.

Verificações automáticas: tipos (`tsc`), lint (`oxlint`), testes, `npm audit`, e
as 9 páginas do site publicado abertas no browser (sem erros na consola e sem
`NaN`).

Só se corrigiu o que ficou **provado**, quer reproduzido quer lido no código
sem margem para dúvida. Os pontos em que os três concordaram tiveram
prioridade.

## O que estava mal e o que mudou

### Graves

| # | O que estava mal | Quem viu | O que mudou |
|---|---|---|---|
| 1 | **O `push-hunts.ps1` commitava tudo o que estivesse em staging.** Qualquer coisa que outra sessão lá deixasse ia no commit «janelas de hunt» e seguia para o site. Aconteceu a 01/09 (commit `9302a38`, ~70 ficheiros apagados). | Codex + Claude (reproduzido num repo falso) | O diff e o commit só olham para os dois ficheiros das hunts (pathspec). |
| 2 | **Calculadora de skills bloqueava a página** com um nível absurdo (ex.: 10000): os pontos davam `Infinity` e um ciclo nunca acabava. | Codex (reproduzido: o teste ficou pendurado até ao timeout) | Nível atual e objetivo vão até 500 (`MAX_SKILL_LEVEL`), com mensagem no campo; o ciclo tem teto e recusa valores infinitos. |
| 3 | **A fórmula do nível nos scripts** ficou sem a correção de 08/11 da app: uma XP enorme fazia um ciclo infinito. | Codex | O mesmo teto da app (`MAX_SEARCH_LEVEL`), e recusa XP inválida. |
| 4 | **O alarme de frescura ficava verde com dados estragados**: uma linha com `date: "x"` dava idade `NaN` e passava como «ok»; uma data no futuro calava o alarme. | Codex + Claude | Só contam linhas com data real e XP inteira ≥ 0; um último dia no futuro sai vermelho. |

### Médios

| # | O que estava mal | O que mudou |
|---|---|---|
| 5 | `push-hunts.ps1`: se o `--autostash` não conseguisse repor alterações locais (conflito), dizia «publicado» e deixava marcas de conflito na árvore. Também publicava de qualquer ramo. | Falha alto nesses casos e só publica a partir do `main`. |
| 6 | O `publicar.ps1` estava no git e fazia `git add -A` com push direto, uma segunda porta de saída que publicava tudo o que estivesse na pasta (incluindo, a partir de hoje, os registos do `.colab/`). | Saiu do git; fica no disco, como os irmãos já arquivados. `.colab/` e `canal-tibiavault.md` passam a ser ignorados. |
| 7 | **Previsão contava a partir de «agora»** com a XP da última leitura. Com a leitura atrasada, as datas saíam atrasadas, e um nível já passado aparecia com data no futuro. «21/11 (9 dias)» a 11/11 contradizia a própria data. | Conta a partir do server save a seguir à última leitura (`readingInstant`). O «(N dias)» é em dias de calendário, e diz «hoje», «amanhã» ou «já devia ter chegado». |
| 8 | **Partilha misturava leituras de dias diferentes**: o boneco com a leitura mais antiga perdia esses dias de XP nas contas. | Essa XP é puxada até ao dia da outra, ao ritmo medido, e a página di-lo. |
| 9 | **Uma falha de rede aparecia como «ainda não há histórico, vê a recolha no PC»**, sem forma de tentar outra vez. | Só um 404 é «sem histórico». Rede em baixo, outro erro do GitHub ou JSON estragado mostram a falha com «Tentar outra vez», e o histórico que já havia não se perde. |
| 10 | **Início e Partilha ficavam congelados** num separador aberto de um dia para o outro. | Voltam a ler ao regressar a um separador escondido há mais de 30 min. |
| 11 | Dados inválidos chegavam ao ecrã: XP `-1` rebentava o resumo, `2026-02-30` virava março, e um `celesta-hunts.json` sem `timezone` rebentava o painel. | Validação completa à entrada (datas reais, XP inteira ≥ 0, todos os campos que o painel usa). Os dados reais passam todos (148 e 145 leituras). |
| 12 | Definições guardadas no browser com a forma errada (ex.: `{"skills":null}`) rebentavam as calculadoras a cada recarga. | Cada campo é verificado ao ler; o que não presta volta ao valor por omissão. |
| 13 | Menu do telemóvel fechado continuava acessível pelo Tab (links invisíveis) e não recebia o foco ao abrir. | Fechado fica escondido de verdade; ao abrir, o foco vai para o primeiro link; ao fechar, volta ao botão «Menu». |
| 14 | `mergeRows` aceitava duas linhas novas com a mesma data e valores diferentes. | Iguais fica uma; diferentes, falha sem gravar. |
| 15 | O `pages.yml` não corria os testes: uma regressão nas contas que compilasse ia direta para o site. | Novo workflow `testes.yml` (tipos, lint, testes) em cada push de código. |

### Leves

- Os parsers de stamina e de duração aceitavam `39:30:99`, `:` e `1e308`. Agora
  só aceitam formatos certos.
- A barra de progresso mostrava «100,00 %» a 99,996 %. Agora arredonda para
  baixo, aqui e no Início.
- A deteção da vocação podia ficar presa em «A detetar…» se a TibiaData não
  respondesse. Os pedidos ganharam prazo (8–15 s).
- A ajuda dizia que o Tibiadrome roda de cinco em cinco semanas; o código usa 14
  dias.
- O `shareVerdict` (até 36 500 dias de simulação) corria em cada tecla. Agora
  guarda as últimas respostas.
- `pages.yml`: `cancel-in-progress: false`, como o GitHub recomenda para o Pages.
- `npm audit fix`: 5 vulnerabilidades altas, todas em ferramentas de
  desenvolvimento (vite/postcss/nanoid/undici, nada chega ao site). Agora 0.
  Só mudou o lockfile.
- README: a tabela «O que corre onde» e várias secções descreviam o Agendador
  de hora a hora / 5 em 5 min e passos do workflow que já não existem.
  Atualizadas.

### O que NÃO se mudou, e porquê

- **«85.5» lido como 855** na validação. Está documentado e testado de
  propósito: o ponto é separador de milhares (`"1.5"` = 15). Mudar isto é uma
  decisão tua; fica nas propostas.
- **Recolha do Celesta** (3 pontos do Codex: reserva que atravessa a meia-noite,
  reservas meio ilegíveis, permissões largas do agente). Está desligada desde
  15/09; só interessam se a voltares a ligar. Ficam nas propostas.
- **Stamina sem instante de referência** (o Codex: a hora de chegar a 42 h anda
  com o relógio se deixares a página aberta). É comportamento de produto, não
  um erro claro; fica nas propostas.

## Como foi verificado

- `tsc` sem erros, lint limpo, **305 testes verdes** (eram 291; +14 novos para
  estes casos), `npm run build` ok.
- `push-hunts.ps1` testado numa cópia num repositório git falso, em três
  cenários:
  - um ficheiro de código em staging fica fora do commit;
  - um conflito no autostash agora falha (exit 1) em vez de dizer «publicado»;
  - num ramo que não é o `main`, recusa publicar.
- No browser (servidor de desenvolvimento):
  - erro de rede simulado → aparece a mensagem com «Tentar outra vez» → ao
    carregar, o histórico volta;
  - a Previsão mostra «hoje / 2 dias / …» coerente com as datas;
  - no telemóvel, o menu fechado tem 0 links focáveis e o foco entra e sai bem;
  - nível de skill 10000 → «O nível vai até 500.» sem bloquear;
  - nenhum erro na consola.
- O alarme de frescura real continua verde com os dados de hoje.
- **Revisão final das correções pelo Codex**: veredicto «ALTERAÇÕES», com dois
  pontos, ambos certos e ambos corrigidos:
  - a validação do Celesta ainda deixava passar janelas vazias (`free: [{}]`).
    Agora cada janela é verificada, e os ficheiros reais continuam a passar;
  - `9…9:00` dava uma duração infinita. O ramo `HH:MM` também verifica se o
    resultado é finito.

## Notas do dia

- **Deploy preso**: o deploy dos bips do Pot Skills ficou «queued» no GitHub
  Actions sem nunca arrancar (falha do lado do GitHub; o cron das 12:00 UTC
  também só arrancou às 19:25). Relançado à mão, publicou bem.
- **Um engano meu, sem consequências**: no primeiro teste do `push-hunts.ps1`, a
  troca do caminho do repositório falhou e o script (ainda a versão antiga)
  correu uma vez no repositório real. Não havia nada para commitar nem para
  enviar, e saiu sem mexer em nada (verificado: `git status`, `git log` e o
  `push-hunts.log` iguais). Os testes seguintes correram só na cópia.
- Backup antes de escrever: ramo local `backup/pre-auditoria-2026-11-11`
  (commit `8423509`), mais cópias do `publicar.ps1` e do `package-lock.json`.
