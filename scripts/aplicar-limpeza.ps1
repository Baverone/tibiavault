# Aplica a limpeza de setembro de 2026 ao repositorio.
#
# O que este script faz, e porque e um script e nao um "copia estes ficheiros":
# os ficheiros novos e alterados ja foram escritos na pasta pelo Claude, mas
# apagar ficheiros e escrever dentro de .github/ nao passam pela ponte remota.
# Isto trata dessas duas coisas e mais nada.
#
# Correr uma vez:
#   powershell -ExecutionPolicy Bypass -File C:\Users\Catarina\tibiavault\scripts\aplicar-limpeza.ps1
#
# Nao faz push. Deixa o commit feito e o push-hunts.ps1, que ja corre de 5 em
# 5 minutos, envia-o -- e tambem o unico que faz push, para os dois nao se
# atropelarem. Se quiseres ver o que mudou antes de ir para o GitHub, ve
# agora: ele leva isto dentro de 5 minutos.
#
# Este ficheiro tem de ficar gravado em UTF-8 COM BOM. O Windows PowerShell 5.1
# le um .ps1 sem BOM como ANSI, e o YAML aqui dentro tem acentos ("Historico
# esta a ficar para tras?") -- sem o BOM sairiam bytes trocados para dentro do
# workflow.

# 'Continue' e nao 'Stop': o git e o schtasks escrevem para o stderr em
# situacoes perfeitamente normais, e com 'Stop' isso rebenta o script a meio.
# Cada passo verifica o seu proprio $LASTEXITCODE.
$ErrorActionPreference = 'Continue'
$repo = 'C:\Users\Catarina\tibiavault'
Set-Location -LiteralPath $repo

Write-Host ''
Write-Host '== 1/4  Apagar o que ja nao se usa ==' -ForegroundColor Cyan

$aApagar = @(
  'data/scraped-history/elite-knight.json'
  'data/team-history/baverone.json'
  'data/team-history/bigodes-the-legend.json'
  'data/team-history/dalla-shot.json'
  'data/team-history/fire-wu.json'
  'data/team-history/konczul.json'
  'data/team-history/sios-trader.json'
  'data/team-history/skryptek.json'
  'data/tibiadrome/modifiers-history.json'
  'scripts/generate-experience-table.mjs'
  'scripts/push-hunts.bat'
  'scripts/save-modifier-rotation.mjs'
  'scripts/scrape-team-experience.mjs'
  'src/components/accessBoss/AccessBossRow.tsx'
  'src/components/accessBoss/AccessBossSection.tsx'
  'src/components/accessBoss/AccessBossTable.tsx'
  'src/components/hunt/DailySimulationSection.tsx'
  'src/components/hunt/HuntCalculator.tsx'
  'src/components/hunt/HuntCalculatorForm.tsx'
  'src/components/hunt/LevelPlanSection.tsx'
  'src/components/hunt/SavedHuntCard.tsx'
  'src/components/layout/PlayerTabsBar.tsx'
  'src/components/soulCore/SoulCoreAssignmentPanel.tsx'
  'src/components/soulCore/SoulCoreClassSection.tsx'
  'src/components/soulCore/SoulCoreGrid.tsx'
  'src/components/soulCore/SoulCoreListChecker.tsx'
  'src/components/soulCore/SoulCorePriorityBar.tsx'
  'src/components/soulCore/SoulCoreTracker.tsx'
  'src/components/team/DailyUpdateForm.tsx'
  'src/components/team/PlayerHistoryPanel.tsx'
  'src/components/team/PlayerManager.tsx'
  'src/components/team/ProjectionChart.tsx'
  'src/components/team/ProjectionTable.tsx'
  'src/components/team/TeamOverviewTable.tsx'
  'src/components/team/TeamSection.tsx'
  'src/components/team/TeamSummaryCards.tsx'
  'src/components/tibiadrome/ModifiersHistoryList.tsx'
  'src/components/tibiadrome/ModifiersReferenceList.tsx'
  'src/components/tibiadrome/ModifiersSubmitForm.tsx'
  'src/components/xp/WeeklyLevelForecastCard.tsx'
  'src/components/xp/XpInputForm.tsx'
  'src/data/accessBoss/accessBossList.ts'
  'src/data/soulCore/bestiaryClasses.ts'
  'src/data/soulCore/seedData.ts'
  'src/data/team/autoTrackedPlayers.ts'
  'src/data/tibia_experience_table.json'
  'src/data/tibiadrome/modifiers.ts'
  'src/domain/accessBoss/progress.ts'
  'src/domain/dailySimulation.ts'
  'src/domain/huntCalculator.ts'
  'src/domain/levelPlan.ts'
  'src/domain/soulCore.ts'
  'src/domain/team/calculations.ts'
  'src/domain/team/types.ts'
  'src/domain/tibiadrome/parseModifiers.ts'
  'src/hooks/useCharacterAccessBoss.ts'
  'src/hooks/useCustomPlayers.ts'
  'src/hooks/useSavedHunts.ts'
  'src/hooks/useSoulCoreTracker.ts'
  'src/hooks/useTeamData.ts'
  'src/hooks/useTibiaDayClock.ts'
  'src/hooks/useTibiadromeHistory.ts'
  'src/storage/accessBossStorage.ts'
  'src/storage/characterHistory.ts'
  'src/storage/customPlayerStorage.ts'
  'src/storage/huntStorage.ts'
  'src/storage/soulCoreStorage.ts'
  'src/storage/teamStorage.ts'
  'src/storage/tibiadromeHistory.ts'
)

$apagados = 0
foreach ($caminho in $aApagar) {
  if (Test-Path -LiteralPath $caminho) {
    git rm -r -f -q --ignore-unmatch -- $caminho
    if ($LASTEXITCODE -eq 0) { $apagados++ }
  }
}
Write-Host ("   {0} de {1} caminhos apagados." -f $apagados, $aApagar.Count)

Write-Host ''
Write-Host '== 2/4  Escrever o workflow do GitHub ==' -ForegroundColor Cyan

# Vai aqui dentro porque .github/ e protegido contra escrita remota -- e uma
# protecao sensata (um workflow e codigo que corre sozinho com permissao de
# escrita no repo), por isso passa pela tua mao, nao por cima dela.
$workflow = @'
# Rede de seguranca da recolha de XP -- ja nao e a fonte principal.
#
# A recolha a serio corre no PC (scripts/scrape-xp-local.ps1), porque o
# guildstats.eu responde 403 a todos os IPs dos runners do GitHub. Entre 21 e
# 31 de agosto de 2026 este workflow correu todos os dias, ficou verde todos
# os dias e nao recolheu um unico dia: as 3 tentativas levavam 403 e o script
# tratava isso como falha transitoria e saia com codigo 0. Dez dias de XP
# perdidos sem um unico sinal.
#
# O que este workflow faz agora sao duas coisas separadas:
#
#  1. Tenta a recolha na mesma (continue-on-error) -- se o guildstats algum
#     dia deixar de bloquear os runners, volta a funcionar sozinho, e enquanto
#     bloquear nao custa nada e nao pinta nada de vermelho.
#  2. Verifica se os dados estao atrasados (check-history-freshness.mjs) e
#     falha a VERMELHO se estiverem. Esse e o unico alarme que interessa: nao
#     "o pedido correu mal?", mas "ha quantos dias e que nao entra XP nova?".
#     Apanha tanto o guildstats a mudar como o PC desligado ou a tarefa
#     agendada apagada.
name: Scrape Tibia Experience

on:
  # Uma vez por dia, as 12:00 UTC (13:00 em Lisboa no verao). O guildstats
  # publica o dia anterior por volta das 10:50 UTC. O cron do GitHub costuma
  # atrasar-se horas, o que aqui nao faz diferenca: o scraper so acrescenta
  # dias que faltam e a verificacao de frescura tem 3 dias de folga.
  schedule:
    - cron: '0 12 * * *'
  workflow_dispatch: {}

permissions:
  contents: write

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - run: npm ci

      # continue-on-error: espera-se que isto falhe com 403 enquanto o
      # guildstats bloquear os runners. Nao e isto que decide a cor do job --
      # e a verificacao de frescura, no fim.
      - name: Tentar recolha
        continue-on-error: true
        run: node scripts/scrape-experience.mjs
        env:
          FORCE_SCRAPE: ${{ github.event_name == 'workflow_dispatch' && 'true' || 'false' }}

      - name: Commit do que tiver sido recolhido
        run: |
          git config user.name "tibia-xp-bot"
          git config user.email "actions@users.noreply.github.com"
          git add data/scraped-history
          if git diff --cached --quiet; then
            echo "Sem alteracoes a commitar."
          else
            git commit -m "chore: atualizar histórico de XP ($(date -u +%Y-%m-%d))"
            git pull --rebase
            git push
          fi

      # O verdadeiro alarme. Vermelho aqui = ha 3+ dias que nao entra XP nova,
      # venha ela da Action ou do PC.
      - name: Histórico está a ficar para trás?
        run: node scripts/check-history-freshness.mjs
'@

$destino = Join-Path $repo '.github\workflows\scrape-experience.yml'
New-Item -ItemType Directory -Force -Path (Split-Path $destino) | Out-Null
# UTF-8 sem BOM: o GitHub Actions engasga-se com um BOM no inicio do YAML.
[System.IO.File]::WriteAllText($destino, $workflow, (New-Object System.Text.UTF8Encoding $false))
Write-Host '   .github/workflows/scrape-experience.yml escrito.'

Write-Host ''
Write-Host '== 3/4  Recolher a XP em falta ==' -ForegroundColor Cyan

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  foreach ($c in @("$env:ProgramFiles\nodejs\node.exe", "$env:LOCALAPPDATA\nodejs\node.exe")) {
    if (Test-Path -LiteralPath $c) { $node = $c; break }
  }
}

if (-not $node) {
  Write-Host '   node.exe nao encontrado - salta a recolha. Corre scripts\scrape-xp-local.ps1 depois.' -ForegroundColor Yellow
} else {
  # FORCE_SCRAPE ignora a verificacao das 9h: e uma corrida a mao, e o
  # guildstats ja tem os dias 24 a 30 a espera.
  $env:FORCE_SCRAPE = 'true'
  & $node 'scripts\scrape-experience.mjs'
  Remove-Item Env:\FORCE_SCRAPE -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host '== 4/4  Agendar a recolha de hora a hora ==' -ForegroundColor Cyan

# Nota de 2026-09-15: a recolha de XP ja nao depende desta tarefa do
# Agendador do Windows. Passou para a tarefa 'tibia-xp' do runner do ai-pc
# (30 em 30 min), e a CalculadoraTibia-RecolhaXP criada abaixo ficou
# desativada (ver knowledge/projectos.md). Este passo so mexe se a tarefa
# ainda nao existir, por isso nao reativa nada sozinho -- fica so como
# registo de como a recolha era agendada antes do runner existir.
$tarefa = 'CalculadoraTibia-RecolhaXP'
schtasks /Query /TN $tarefa 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
  Write-Host ("   A tarefa '{0}' ja existe - nao mexo." -f $tarefa)
} else {
  # Sem aspas a volta do caminho: nao tem espacos, e aspas dentro do /TR sao
  # a forma classica de o schtasks se enganar.
  $comando = 'powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File ' + $repo + '\scripts\scrape-xp-local.ps1'
  schtasks /Create /TN $tarefa /TR $comando /SC HOURLY /ST 09:15 /F | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host ("   Tarefa '{0}' criada - corre de hora a hora a partir das 09:15." -f $tarefa)
  } else {
    Write-Host '   Nao consegui criar a tarefa. Cria-a a mao no Agendador de Tarefas, a apontar para scripts\scrape-xp-local.ps1.' -ForegroundColor Yellow
  }
}

Write-Host ''
Write-Host '== Commit ==' -ForegroundColor Cyan

git add -A
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host '   Nada para commitar.'
} else {
  git commit -m "Limpeza: so Baverone e Bluey The Cat, recolha de XP no PC" | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host '   Commit feito. O push-hunts.ps1 envia-o dentro de 5 minutos.'
  } else {
    Write-Host '   O commit falhou - ve o que diz o git status.' -ForegroundColor Yellow
  }
}

Write-Host ''
Write-Host 'Feito. Confirma com:  node scripts\check-history-freshness.mjs' -ForegroundColor Green
Write-Host ''
