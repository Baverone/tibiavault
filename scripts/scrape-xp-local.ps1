# Recolha diaria da XP -- a correr AQUI, no PC, e nao no GitHub Actions.
#
# Porque aqui: o guildstats.eu responde 403 a todos os IPs dos runners do
# GitHub. Entre 21 e 31 de agosto de 2026 a Action correu todos os dias, ficou
# verde todos os dias, e nao recolheu um unico dia -- as tres tentativas
# levavam 403 e o script tratava isso como "falha transitoria" e saia com
# codigo 0. Do IP de casa o guildstats responde normalmente; foi por isso que
# funcionou quando o Andre forcou a recolha a mao a 25/08.
#
# Corre de hora a hora (Agendador de Tarefas). Nao ha problema em correr
# muitas vezes: o scraper so acrescenta datas que ainda nao tem, por isso
# quase todas as corridas nao fazem rigorosamente nada. Correr de hora a hora
# em vez de uma vez por dia e de proposito -- o guildstats so publica o dia
# anterior por volta das 10:50 UTC, e assim nao interessa a que horas o PC
# esta ligado.
#
# Nao faz push. Deixa os commits feitos e o push-hunts.ps1, que ja corre de 5
# em 5 minutos, envia-os -- ele ja verifica se ha commits a frente do origin,
# precisamente para apanhar envios falhados. Um unico script a fazer push
# significa zero corridas entre os dois.

$ErrorActionPreference = 'Continue'
$repo = 'C:\Users\Catarina\tibiavault'
$log  = Join-Path $repo 'scripts\scrape-xp.log'

function Write-Log($msg) {
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -LiteralPath $log -Value "$stamp  $msg"
}

Set-Location -LiteralPath $repo

# O Agendador de Tarefas nao herda o PATH da sessao interativa, por isso o
# node pode nao estar la. Procurar nos sitios do costume antes de desistir.
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  foreach ($candidate in @("$env:ProgramFiles\nodejs\node.exe", "${env:ProgramFiles(x86)}\nodejs\node.exe", "$env:LOCALAPPDATA\nodejs\node.exe")) {
    if (Test-Path -LiteralPath $candidate) { $node = $candidate; break }
  }
}
if (-not $node) { Write-Log 'node.exe nao encontrado - recolha nao correu'; exit 1 }

$falhas = 0
$saida = & $node 'scripts\scrape-experience.mjs' 2>&1
if ($LASTEXITCODE -ne 0) {
  $falhas++
  # So a ultima linha: o log e para ser lido de relance, o resto do detalhe
  # esta sempre a uma corrida manual de distancia.
  $motivo = ($saida | Select-Object -Last 1)
  Write-Log "recolha falhou: $motivo"
}

# Antes das 9h de Lisboa o scraper sai sem fazer nada (server save do Tibia);
# nesse caso nao ha nada para commitar e saimos em silencio.
git add -- data/scraped-history
if ($LASTEXITCODE -ne 0) { Write-Log 'git add falhou'; exit 1 }

# --quiet devolve 0 quando NAO ha nada em staging, 1 quando ha, >1 se rebentou.
# So olha (e so commita) o data/scraped-history: o que outra sessao tenha
# deixado em staging nao entra neste commit (auditoria de 11/11/2026).
git diff --cached --quiet -- data/scraped-history
if ($LASTEXITCODE -gt 1) { Write-Log 'git diff falhou'; exit 1 }
if ($LASTEXITCODE -eq 0) {
  if ($falhas -gt 0) { exit 1 }
  exit 0
}

$hoje = Get-Date -Format 'yyyy-MM-dd'
git commit -m "chore: atualizar historico de XP ($hoje)" -- data/scraped-history | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Log 'commit falhou'; exit 1 }

Write-Log "XP recolhida e commitada ($hoje) - o push-hunts.ps1 envia dentro de 5 min"
if ($falhas -gt 0) { exit 1 }
