# TibiaVault

> Chamava-se **Calculadora de Experiência do Tibia** (`calculadora-tibia`) até
> 15/09/2026; passou a TibiaVault, a par do `riftvault` e do `mtgvault`
> (decisão do André). Repositório `Baverone/tibiavault`, pasta local
> `C:\Users\Catarina\tibiavault`. O GitHub redirecciona o nome antigo.

Aplicação web para acompanhar o progresso de XP de dois personagens —
**Baverone** (Royal Paladin) e **Bluey The Cat** (Exalted Monk) — com
recolha diária automática do guildstats.eu, gráfico de progressão com
período à escolha, previsão de níveis com janela simétrica, timers de hunt
sempre visíveis, calculadora de varinhas de treino, e páginas de utilitários
com os spots livres do Celesta, a stamina e as flechas.

> **Setembro de 2026 — a casca comum.** A app era uma página só, com uma fila
> de três separadores no topo e uma segunda fila dentro do terceiro. Passou a
> ter a mesma casca do `mtgvault` e do `riftvault`: barra lateral fixa agrupada
> por secções (a mesma num painel ☰ no telemóvel), cabeçalho de página com
> migalhas, e um endereço por página. Ver [A casca](#a-casca-a-identidade-comum-baverone)
> mais abaixo.

> **Setembro de 2026 — grande limpeza.** A app tinha 6 personagens em 3
> equipas, uma calculadora de hunt, uma checklist de Quests & Bosses, um
> tracker de Soul Cores, um registo de modificadores do Tibiadrome, input
> manual de XP e uma aba "Equipa" inteira já desligada da navegação mas ainda
> no repositório. Saíram todos: 1139 linhas de código que nada importava, mais
> as funcionalidades que existiam e não se usavam. O que ficou é o que se usa
> mesmo. Ver o histórico do git se alguma delas fizer falta.

## Ligação ao GitHub

O repositório é público e serve de base de dados só-leitura: a app lê
`data/scraped-history/<personagem>.json` diretamente do
`raw.githubusercontent.com`. O par utilizador/repositório está em
[`src/config.ts`](src/config.ts) (`GITHUB_REPO`).

## Como correr o projeto

```bash
npm install
npm run dev
```

Abre o URL indicado pelo Vite (normalmente http://localhost:5173).

Outros comandos:

```bash
npm run build     # build de produção (inclui verificação de tipos TypeScript)
npm run preview   # serve o build de produção localmente
npm run lint      # linter (oxlint)
npm test          # testes dos scripts .mjs e do domínio .ts (node --test, sem rede)
```

Os testes cobrem a lógica pura dos scripts — o parser da tabela do guildstats
e o cálculo das janelas livres do Celesta — e, desde setembro de 2026, também
o domínio TypeScript da app, com fixtures locais e sem um único pedido de rede:
o resumo do Início (`homeSummary.test.ts`) e a **navegação**
(`navigation/pages.test.ts`, que é o que garante que nenhuma página fica fora
do menu, que nenhum atalho aponta para lado nenhum e que os separadores antigos
guardados no browser não voltam a abrir um ecrã vazio).

Os módulos que os testes alcançam escrevem os imports locais **com extensão**
(`'./experienceTable.ts'`): o `node --test` corre sem passo de build e exige-a,
e o Vite resolve-a na mesma. Pela mesma razão o `IconName` vive num `.ts`
(`components/shell/iconPaths.ts`) e não no `.tsx` do componente — o
`tsconfig.node.json` não sabe de JSX.

O `npm test` corre com `--experimental-strip-types`, que é o que permite ao
`node --test` executar um `.test.ts` sem passo de build nem dependências
novas. Os ficheiros `src/**/*.test.ts` saem do `tsconfig.app.json` (que não
tem os tipos do Node) e entram no `tsconfig.node.json` — é a única razão por
que os dois tsconfig se tocam. Componentes React continuam sem testes: aí a
verificação é o `tsc` do `npm run build`.

## Stack

- **React + Vite + TypeScript** — arranque e HMR rápidos, tipos para manter os
  cálculos (níveis, XP, hunt) com contratos claros à medida que o projeto crescer.
- **Recharts** para os gráficos de XP.
- **Cada página tem endereço** (`#inicio`, `#baverone`, `#celesta`, …). Sem
  hash nenhum, abre onde ficou da última vez (`src/storage/activeTab.ts`): quem
  a abre no telemóvel antes de ir caçar abre-a para ver a mesma coisa que viu
  ontem. O id guardado é confrontado com as páginas que existem hoje, para um
  separador antigo guardado no browser não deixar ninguém num ecrã vazio. Sem
  `localStorage` (janela privada) abre no Início.
- Sem backend próprio: persistência local via `localStorage` (os campos das
  calculadoras, o filtro de spots) + um repositório GitHub público como "base
  de dados" partilhada só-leitura (histórico recolhido automaticamente — ver
  secção abaixo).
- Sem framework CSS — `src/styles/tokens.css` (as variáveis),
  `src/styles/shell.css` (a casca) e `src/styles/theme.css` (os componentes
  desta app). Sem assets oficiais do Tibia.
- **Os gráficos carregam à parte.** O Recharts sozinho eram dois terços do
  JavaScript da app e estava no caminho crítico de quem só quer ver os timers.
  Tanto o `CharacterPage` como o `HomePage` o importam com `React.lazy` — o
  arranque fica nos ~270 KB (84 KB gzipped) e o Recharts vai num pedaço à parte.

## A casca: a identidade comum Baverone

Pedido do André (24/09/2026): o tibiavault passa a usar **a mesma casca** do
`mtgvault` e do `riftvault`. A referência é o
`mtgvault/site_shell.py`; aqui é React, mas os nomes de classe, os tamanhos e
os cortes de media query são os mesmos.

- **Barra lateral fixa** à esquerda a partir dos 900 px, agrupada por secções,
  com o link `← baverone.com` no topo e o logótipo quadrado com a inicial na
  cor do projeto (verde `#38d39f`). No telemóvel, **a mesma navegação** num
  painel que abre no botão ☰.
- **Cabeçalho de página** com migalhas, título, subtítulo e área de ações.
- **Nada de filas de botões com scroll lateral.** As páginas compridas (as das
  personagens) têm um índice vertical que no telemóvel vira um `<select>`; os
  onze botões de Loyalty do treino de skills passaram a um seletor curto.
- **Ícones SVG em linha** (`src/components/shell/iconPaths.ts`), traço 1.8,
  `currentColor` — nunca emojis na navegação. Um emoji é desenhado pelo
  sistema, tem cor própria e não acende com o rótulo quando o item fica ativo.
- **Zero scroll horizontal a 1440 e a 390 px**, medido num Chrome a sério (ver
  "Como se mede o layout", abaixo).
- Textos explicativos longos vivem num `<details>` **"Como ler esta página"**,
  no rodapé (`src/pages/ajuda.tsx`), e não à frente dos números.

Quem manda na navegação é `src/navigation/pages.ts` — uma página nova é uma
linha nessa lista, e é essa mesma lista que os testes usam para garantir que
não há páginas fora do menu nem atalhos partidos.

## Telemóvel

O ecrã de referência é um telemóvel de 390 px — é aí que a app se abre para ver
se dá para caçar. O corte da casca fica nos 899 px (barra lateral → painel ☰) e
há um segundo aos 560 px para o que é desta app. Alvos de toque de 40 px
mínimos em tudo o que se carrega.

## Recolha automática diária de XP

**A recolha corre no PC, não no GitHub Actions.**

O guildstats.eu responde `403` a todos os IPs dos runners do GitHub. Entre
21 e 31 de agosto de 2026 o workflow correu todos os dias, ficou **verde**
todos os dias e não recolheu um único dia: as 3 tentativas levavam 403, o
script tratava isso como falha transitória e saía com código 0. Dez dias de
XP perdidos sem um único sinal. Do IP de casa o guildstats responde
normalmente — daí a mudança.

### O que corre onde

| Onde | O quê | Quando |
| --- | --- | --- |
| PC (Agendador de Tarefas) | [`scripts/scrape-xp-local.ps1`](scripts/scrape-xp-local.ps1) | de hora a hora |
| PC (Agendador de Tarefas) | [`scripts/push-hunts.ps1`](scripts/push-hunts.ps1) | de 5 em 5 minutos |
| PC (Agendador de Tarefas) | [`scripts/celesta/run-celesta-local.ps1`](scripts/celesta/run-celesta-local.ps1) — Claude Code lê o Discord e escreve `celesta-hunts.json` | de hora a hora, 08:03–23:03 e 00:03 |
| GitHub Actions | [`scrape-experience.yml`](.github/workflows/scrape-experience.yml) | 1×/dia, como alarme |

`scrape-xp-local.ps1` corre os dois scrapers e faz **commit sem push** —
quem faz push é o `push-hunts.ps1`, que já corre de 5 em 5 minutos e já
verifica se há commits por enviar. Um único script a fazer push significa
zero corridas entre os dois.

Correr de hora a hora não custa nada: o scraper só acrescenta datas que
ainda não tem, por isso quase todas as corridas não fazem rigorosamente
nada. É de propósito — o guildstats só publica o dia anterior por volta das
10:50 UTC, e assim não interessa a que horas o PC está ligado.

### Como funciona a recolha

1. Para cada personagem, pede a página de histórico de experiência do
   guildstats.eu (`include/character/tab.php?nick=...&tab=experience` — o
   endpoint interno que a própria página usa; é HTML estático, não precisa
   de JavaScript/browser para ler).
2. Lê a **tabela toda** (o guildstats serve ~30 dias), não só a linha mais
   recente. É isto que torna a recolha auto-reparável: qualquer dia perdido
   enquanto isto esteve parado é recuperado sozinho na corrida seguinte.
3. Só acrescenta datas que ainda não estão em
   `data/scraped-history/<personagem>.json` — nunca apaga nem sobrescreve.
4. Cada personagem é independente: se um falhar, os outros continuam.
5. Compara o nível reportado pelo guildstats com o calculado pela fórmula,
   como validação cruzada (avisa no log se não bater certo).

### O alarme

[`scripts/check-history-freshness.mjs`](scripts/check-history-freshness.mjs)
é o que impede isto de voltar a acontecer. A pergunta que interessa não é
"o pedido correu bem?" mas **"há quantos dias é que não entra XP nova?"** —
e é essa que ele mede, com 3 dias de folga (o guildstats publica o dia
anterior, e um dia perdido recupera-se sozinho).

Corre no fim do workflow diário e faz o job ficar **vermelho** quando o
histórico está mesmo a ficar para trás — venha isso do guildstats mudar
outra vez, do PC desligado ou da tarefa agendada apagada. O vermelho é o
único sinal que chega ao mail.

Para o correr à mão:

```bash
node scripts/check-history-freshness.mjs
```

O workflow continua a tentar a recolha (com `continue-on-error`), para
voltar a funcionar sozinho se o guildstats algum dia deixar de bloquear os
runners.

### O mesmo alarme, para as janelas de hunt (setembro de 2026)

[`scripts/check-hunts-freshness.mjs`](scripts/check-hunts-freshness.mjs) faz
a mesma pergunta ao `data/celesta-hunts.json`. Até aqui esse ficheiro não
tinha rede de segurança nenhuma: se a tarefa que lê o Discord parasse, o
painel dizia "há 9 horas" e mais nada — zero mail, zero vermelho. A mesma
falha de agosto, noutro ficheiro.

O que muda em relação à XP é o **horário**. A tarefa corre de hora a hora
entre as 08:03 e as 23:03, mais uma vez às 00:03; entre as 00:30 e as 08:00
o ficheiro envelhece porque ninguém o escreve, e às 08:00 tem legitimamente
~8h. Por isso o alarme não conta tempo de relógio: conta os **minutos de
horário** decorridos desde o `generatedAt`. **Quatro horas de horário** sem
dados novos são quatro corridas falhadas seguidas — é o limiar, e é
`--max-idade-horas`. Fora do horário não há alarme nenhum: um aviso que toca
todas as noites é um aviso que se ignora.

Corre em três sítios:

- no workflow diário, a seguir ao da XP e com `if: always()` para os dois
  não se taparem um ao outro (é o caminho que chega ao mail);
- no teste da tarefa `tibia-push` do ai-pc, que corre de 5 em 5 minutos — é
  o que dá o sinal em minutos e não no dia seguinte;
- à mão: `node scripts/check-hunts-freshness.mjs`.

A **decisão está duplicada** em `src/domain/celestaHunts.ts`
(`isCollectionStalled`), porque é a app que pinta o painel de vermelho e os
scripts não têm passo de build para importar TypeScript. Como a fórmula da
experiência: se um lado mudar, o outro tem de mudar também. O lado
TypeScript é o que tem testes (`src/domain/celestaHunts.test.ts`), incluindo
o caso das 08:00 e o do horário de inverno.

### Como a app lê isto

A app (`src/storage/sharedHistory.ts`) busca este JSON diretamente do
GitHub (`raw.githubusercontent.com`) ao carregar, e junta-o com o histórico
manual do `localStorage` — entradas automáticas aparecem marcadas "AUTO" na
lista de histórico recente. **Isto só funciona depois de definires
`GITHUB_REPO` em [`src/config.ts`](src/config.ts)** com o teu
`utilizador/repositório`.

Já não há input manual de XP. Enquanto a recolha esteve parada em silêncio,
escrever o valor à mão era a única forma de a app mostrar algo atual;
resolvida a recolha, passava a ser só mais um sítio de onde podiam sair
números diferentes. A fonte é uma só, e se estiver atrasada a app diz.

## Fonte de verdade da experiência

A fórmula oficial do Tibia está implementada em
[`src/domain/experienceTable.ts`](src/domain/experienceTable.ts):

```
exp(level) = round((50/3) * (level^3 - 6*level^2 + 17*level - 12))
```

É usada diretamente (em vez de uma tabela estática) para que qualquer nível —
incluindo acima de 3500 — funcione automaticamente. A tabela estática de
níveis 1–3500 que existia como dataset de referência foi apagada: pesava
216 KB, viajava em cada clone e nada no código a importava.

A mesma fórmula está copiada em
[`scripts/lib/guildstatsHistory.mjs`](scripts/lib/guildstatsHistory.mjs), para
os scripts continuarem a ser ficheiros Node soltos sem passo de build. Se um
lado mudar, o outro tem de mudar também.

## Estrutura do projeto

```
data/
  scraped-history/        # <personagem>.json — histórico recolhido pelo robô
  celesta-hunts.json      # janelas livres dos spots, escritas a partir do Discord
scripts/
  lib/
    guildstatsHistory.mjs # scraping + merge de histórico
    guildstatsHistory.test.mjs # parser da tabela, com HTML de fixture
    trackedPlayers.mjs    # quem é rastreado e para que pasta
  scrape-experience.mjs   # recolha diária (corre no PC)
  scrape-xp-local.ps1     # corre o scraper + commit (tarefa agendada, de hora a hora)
  check-history-freshness.mjs  # alarme: falha se o histórico tiver 3+ dias de atraso
  check-hunts-freshness.mjs    # alarme: falha se as janelas de hunt estiverem paradas 4h+ de horário
  push-hunts.ps1          # publica as janelas de hunt (tarefa agendada, 5 em 5 min)
  celesta/
    prompt-local.md       # o que o Claude Code faz em cada corrida (Discord -> reservas)
    run-celesta-local.ps1 # lanca o Claude Code local e regista a corrida (tarefa agendada)
    instalar-tarefa.ps1   # regista a tarefa no Agendador (correr uma vez)
    escrever-hunts.mjs    # reservas -> data/ e public/celesta-hunts.json
    gaps.mjs              # reservas -> janelas livres
    gaps.test.mjs         # casos da meia-noite, sobreposições, formato do bot
    runs.jsonl            # uma linha por corrida (estado, duracao, custo) - nao vai para o git
.github/workflows/
  scrape-experience.yml   # rede de segurança: tenta a recolha e corre o alarme
src/
  config.ts               # GITHUB_REPO e o estado da recolha do Celesta
  constants/players.ts    # os dois bonecos — manter igual a scripts/lib/trackedPlayers.mjs
  navigation/pages.ts     # A NAVEGAÇÃO: secções, páginas, atalhos, âncoras
  pages/                  # uma página por entrada do menu (+ ajuda.tsx)
  components/shell/       # a casca comum: barra lateral, cabeçalho, ícones, índice
  components/             # UI por área (xp, charts, hunt, timers, skillTraining, ...)
  domain/                 # cálculos puros, sem React
  hooks/                  # estado com ciclo de vida (relógios, fetch, rota)
  storage/                # localStorage e fetch do histórico partilhado
  styles/                 # tokens.css + shell.css + theme.css
```

### Como se mede o layout

O "zero scroll horizontal" não é uma opinião: mede-se com um Chrome a sério,
pelo DevTools Protocol, em `C:\Users\Catarina\Desktop\ai-pc\work\rebrand-tibia\foto.mjs`
(o mesmo caminho do riftvault e do mtgvault). Com o `npm run dev` de pé:

```bash
node foto.mjs http://localhost:5199/ <pasta> alvos-depois-desktop.json
node foto.mjs http://localhost:5199/ <pasta> alvos-depois-telemovel.json
```

Tira a captura de página inteira de cada página a 1440 e a 390 px e compara o
`scrollWidth` com o `clientWidth` — mais: procura contentores com conteúdo
escondido para o lado, que é o que o `scrollWidth` do documento não apanha
quando alguém põe um `overflow-x: auto` a meio.

## Onde adicionar novas funcionalidades

- **Nova lógica de cálculo** (ex: tempo até um nível X, taxa média de XP/h):
  adiciona uma função pura em `src/domain/`. Não depende de React, por isso é
  fácil de testar e reutilizar.
- **Página nova**: uma linha em `src/navigation/pages.ts` e um componente em
  `src/pages/`. A barra lateral, as migalhas e o título saem daí sozinhos.
- **Comparação entre os dois bonecos**: usa `useAllCharacters` (um efeito só,
  os dois históricos em paralelo) — nunca um `useCharacterState` dentro de um
  `map`, que seria um hook dentro de um ciclo.
- **Gráfico de curva de XP por nível**: `domain/experienceTable.ts` já expõe
  `experienceForLevel`; um novo componente em `components/charts/` pode gerar
  os pontos diretamente a partir daí.
- **Novo boneco**: acrescenta-o em `src/constants/players.ts` (com `slug`, que
  é o id da página) **e** em `src/navigation/pages.ts` **e** em
  `scripts/lib/trackedPlayers.mjs`. Se o esqueceres no último, a app pede um
  ficheiro que o robô nunca escreve; se o esqueceres no do meio, ele existe mas
  não há como lá chegar. O `pages.test.ts` apanha o segundo caso.
- **Persistência diferente** (ex: backend, IndexedDB): só os ficheiros em
  `src/storage/` precisam de mudar — o resto da app não sabe onde os dados
  são guardados.

## Spots livres do Celesta

> **A recolha está desligada desde 15/09/2026**, por ordem do André («tira a
> pesquisa de hunts pelo discord, para já não quero a funcionar»). As tarefas
> `tibia-celesta` e `tibia-reservas` ficaram sem horário e desativadas. O
> código fica todo onde está — o «para já» dele é para respeitar nos dois
> sentidos — e a página diz-o, com calma, num aviso próprio
> (`CELESTA_COLLECTION_OFF_SINCE`, em `src/config.ts`).
>
> Por causa disso, o vermelho de «Dados parados há Xh — a recolha do Discord
> pode ter parado» está **calado** nesta página (`collectionOff`): essa frase é
> para uma avaria, e aqui não há nenhuma. Um aviso que grita por uma coisa que
> está certa é um aviso que se aprende a ignorar.

Página própria (`#celesta`), no painel
`src/components/hunt/CelestaHuntsPanel.tsx`, alimentada por
`data/celesta-hunts.json`. As janelas não trazem data: são
"HH:MM - HH:MM" numa volta de 24h que começa no `referenceTime` (o footer do
summary do bot, em hora de Berlim).

**"Livre agora" (setembro de 2026).** O painel mostrava as janelas e mais
nada, e a pergunta que se faz ao abrir isto no telemóvel antes de ir caçar é
outra: *dá para entrar já?* Responder a isso a olho obrigava a comparar o
relógio com uma lista de intervalos onde "00:00 - 02:04" era de amanhã e não
de há duas horas. Agora há uma linha "Livres agora" no topo e um estado por
spot ("livre agora, até às 17:00" / "ocupado, livre às 20:00").

A conta está em `spotAvailability` (`src/domain/celestaHunts.ts`) e é
deliberadamente ignorante de fusos: os minutos decorridos saem do
`generatedAt`, que é um instante absoluto, e comparam-se com o desvio de cada
janela dentro da mesma volta de 24h. Custa uns 2 minutos de folga (o
`referenceTime` é escrito um pouco antes de o ficheiro ser gerado) e poupa
toda a matemática de Berlim/Lisboa/horário de verão.

**Recusa-se a responder** quando o ficheiro tem 24h ou mais, quando a data não
presta, ou quando o relógio do dispositivo está atrás do ficheiro. Aí não
aparece estado nenhum — só as janelas, que essas não dependem do relógio. Ao
fim de uma volta completa a conta dava a volta e uma janela de ontem passava
por "livre agora": errada e confiante, que é o pior que há.

**"A recolha parou" (setembro de 2026).** Passados os 4 h de horário do
alarme de frescura (ver acima), o painel troca o aviso ambarelo de "mais de
hora e meia" por um vermelho cheio: *"Dados parados há Xh — a recolha do
Discord pode ter parado."* São coisas diferentes — uma é um cuidado a ter,
a outra é uma avaria do outro lado — e dizer as duas ao mesmo tempo escondia
a segunda.

**"Melhores janelas da noite" (setembro de 2026).** O bloco chamava-se só
"Melhores janelas" e é calculado uma vez, quando o ficheiro é escrito, a
olhar só para as 17:00–01:00. Às dez da manhã isso é a noite de hoje; às
00:30 é a noite seguinte, e não havia como saber de qual das duas se
tratava. Ganhou o nome certo e o carimbo de quando foi calculado
(`formatGeneratedStamp`). Recalcular no browser com o "agora" real fica por
decidir — obrigava a trazer o `destaques` do `gaps.mjs` para o domínio.

## Timers de hunt

Faixa da **casca** (`src/components/timers/TimersPanel.tsx`), por baixo do
cabeçalho e visível em **todas** as páginas — não são uma página, e é de
propósito: são a única coisa da app com contagem a correr, e são para estar à
vista enquanto se caça. Em setembro de 2026 passaram de um painel de ~250 px
com anéis de 120 px para uma faixa de uma linha com anéis de 48 px; no
telemóvel são três linhas de 42 px em vez de duas colunas de 96.
Três timers regressivos independentes: **Pot Skills** (10 min),
**Food ML** (1 hora) e **Plasmas** (29m40s, com aviso por voz quando faltam
10 segundos no relógio — ou seja, 30 segundos antes de os 30 minutos de
plasma acabarem), cada um com anel de progresso SVG, botão Iniciar/Pausar e Reiniciar, mais um
botão "Iniciar todos" no topo do painel.

Ao chegar a zero, cada timer (`src/hooks/useCountdownTimer.ts`): toca um
sinal sonoro via Web Audio API (`src/domain/timers/alerts.ts`, sem
ficheiros de áudio externos), tenta anunciar por voz o nome do timer via
`SpeechSynthesis` (pt-PT — falha silenciosamente se o browser não suportar
ou bloquear), mostra "Terminado!" durante ~3s, e depois reinicia sozinho e
continua a contar em loop contínuo até seres tu a pausar. O countdown segue
um timestamp de fim (não conta ticks), por isso não desvia mesmo que o
separador fique em segundo plano.

## Rashid Tracker

Cartão global (`src/components/rashid/RashidCard.tsx`) com o ícone do NPC
(`public/rashid.png` — não incluído no código, coloca ali o teu ficheiro),
a cidade/local de hoje e um countdown até à próxima mudança.

Horário fixo por dia da semana em `src/data/rashid/schedule.ts`. O "dia de
Tibia" só avança no server save, às 9:00 hora de Lisboa (`Europe/Lisbon`,
ajusta-se sozinho a WEST/WET) — antes disso o dia ainda é o anterior. Essa
lógica de "que dia é hoje em Tibia" vive em `src/domain/tibiaDay.ts`;
`src/domain/rashid/rashidSchedule.ts` só faz o lookup na tabela semanal a
partir daí. Reutiliza o `formatDuration` do Tibiadrome Tracker para o
countdown, a atualizar ao segundo (`src/hooks/useRashidClock.ts`).

## Validação de inputs

Mensagens de erro aparecem sempre sob o respetivo formulário. Quem valida o
quê, hoje:

- **Treino de skills** (`src/domain/validation.ts`): nível atual —
  `parseNonNegativeInteger`, inteiro e não negativo, mais um mínimo por skill
  (10 nas de combate, 0 no Magic Level); % que falta — `parsePercentMissing`,
  entre 0 e 100; nível objetivo — inteiro, comparado com o nível **base** (sem
  a inflação da Loyalty).
- **Calculadora de hunt** (`src/components/xp/HuntPlannerCard.tsx`): nível alvo
  inteiro >= 1, XP/h maior que zero, horas não negativas. Sem os três não há
  resultado nenhum, em vez de um resultado a meio.
- **Stamina** (`src/domain/stamina.ts`): `parseStaminaToMinutes` aceita
  "39:30", "39", "39.5" ou "39,5" e recusa fora de 0:00–42:00;
  `parseDurationToMinutes` faz o mesmo para a duração da caçada.
- **Flechas** (`src/domain/arrows/arrowsCalculator.ts`): flechas não negativas
  e minutos maiores que zero, senão não há taxa.

O `validation.ts` traz ainda `parseLevelList`, `validateLevelPlanTarget`,
`parseFutureDate`, `parsePositiveNumber` e `parseNonNegativeNumber`, que
ficaram sem quem os chamasse depois da limpeza de setembro de 2026 (a tabela
nível-a-nível e o input manual de XP saíram). Ficam por decidir: usar ou
apagar.

Mensagens de erro aparecem sob o respetivo formulário.
