# A unica porta de saida do TibiaVault para o GitHub (tarefa tibia-push do
# ai-pc, 10:20/13:20/20:20). Commita as janelas de hunt se mudaram (a recolha
# do Discord esta desligada desde 15/09/2026) e envia os commits que as outras
# tarefas deixaram por enviar (a XP do tibia-xp e do tibia-xp-chrome). Sai em
# silencio quando nao ha nada a fazer. (Cabecalho revisto a 11/11/2026: falava
# do Vercel e de 5 em 5 minutos.)
#
# Licoes aprendidas, todas do mesmo feitio -- o modo de falha perigoso nao e
# rebentar, e ficar calado:
#
#  1. (26/08/2026) `git pull --rebase` recusa-se a correr se houver QUALQUER
#     alteracao por commitar na arvore -- mesmo em ficheiros que nao nos dizem
#     respeito, como src/ a meio de uma edicao. Dai o --autostash: guarda,
#     rebase, repoe.
#  2. (26/08/2026) Nao basta olhar para o que ha para commitar. Se um push
#     falhou antes, os commits ficam parados localmente e nunca mais ha "nada
#     de novo" para disparar o envio. Por isso verificamos tambem se estamos a
#     frente do origin, e empurramos na mesma.
#  3. (07/09/2026) Um `.git\index.lock` obsoleto, deixado por uma corrida
#     interrompida, fez todos os `git add` falharem durante 19 horas. Como o
#     erro era engolido e nada chegava a ser commitado, nao havia nada "por
#     enviar" e a tarefa do ai-pc dizia "ok / teste pass" o tempo todo.
#     Agora: qualquer erro do git sai com codigo != 0 e escreve no stderr, e
#     um lock que seja comprovadamente obsoleto (vazio, com mais de 15 min e
#     sem nenhum processo git vivo) e removido -- com registo no log --
#     antes de desistir. Um lock que nao cumpra os tres criterios faz falhar:
#     pode haver um git a serio a trabalhar do outro lado.
#  4. (11/11/2026, auditoria com o Codex) O `git diff --cached` e o `git commit`
#     nao tinham pathspec: qualquer coisa que outra sessao deixasse em staging
#     ia no commit «janelas de hunt» e seguia para o site (aconteceu a 01/09,
#     commit 9302a38, com ~70 ficheiros apagados). Agora so os $publicados
#     entram nesse commit. Tambem: so publica a partir do `main` (o site le o
#     main), e se o --autostash nao conseguir repor o que la estava (conflito)
#     falha em vez de dizer «publicado» com marcas de conflito na arvore.

$ErrorActionPreference = 'Continue'
$repo       = 'C:\Users\Catarina\tibiavault'
$log        = Join-Path $repo 'scripts\push-hunts.log'
$lock       = Join-Path $repo '.git\index.lock'
$publicados = @('data/celesta-hunts.json', 'public/celesta-hunts.json')

function Write-Log($msg) {
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -LiteralPath $log -Value "$stamp  $msg"
}

# Verdade acima de verde: um passo que nao fez o que devia falha alto -- log,
# stderr (e o stderr fica gravado em runs.db pelo runner) e codigo 1.
function Falhar($msg) {
  Write-Log "FALHOU: $msg"
  [Console]::Error.WriteLine("push-hunts: $msg")
  exit 1
}

# Corre o git e devolve stdout+stderr numa string de uma linha, deixando
# $LASTEXITCODE intacto para quem chamou. O ToString() e de proposito: sem ele,
# o stderr de um .exe redirecionado vem embrulhado em ErrorRecord e o log
# enche-se de "At line:.. CategoryInfo:.." em vez da mensagem do git.
function Invoke-Git([string[]]$GitArgs) {
  $linhas = & git @GitArgs 2>&1 | ForEach-Object { $_.ToString().Trim() }
  return (($linhas | Where-Object { $_ }) -join ' | ')
}

# Devolve $true se removeu um lock obsoleto (e ha motivo para tentar outra
# vez). Se o lock existir mas nao for obsoleto, nao volta: falha aqui mesmo.
function Resolve-LockObsoleto([string]$contexto) {
  if (-not (Test-Path -LiteralPath $lock)) { return $false }

  $f      = Get-Item -LiteralPath $lock -Force
  $idade  = ((Get-Date) - $f.LastWriteTime).TotalMinutes
  $vivos  = @(Get-Process -Name git -ErrorAction SilentlyContinue).Count
  $quando = $f.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')

  if ($f.Length -ne 0) {
    Falhar "existe .git/index.lock com $($f.Length) byte(s), de $quando - ha um git a meio de uma operacao, nao lhe toco. $contexto"
  }
  if ($idade -le 15) {
    Falhar ("existe .git/index.lock vazio mas recente ({0:n0} min, de $quando) - pode ser um git ainda a arrancar. $contexto" -f $idade)
  }
  if ($vivos -gt 0) {
    Falhar ("existe .git/index.lock vazio com {0:n0} min mas ha $vivos processo(s) git vivo(s) - nao lhe toco. $contexto" -f $idade)
  }

  Remove-Item -LiteralPath $lock -Force -ErrorAction SilentlyContinue
  if (Test-Path -LiteralPath $lock) {
    Falhar "nao consegui remover o .git/index.lock obsoleto de $quando. $contexto"
  }
  Write-Log ("removido .git/index.lock obsoleto (vazio, {0:n0} min, de $quando, nenhum processo git vivo) -- $contexto" -f $idade)
  return $true
}

Set-Location -LiteralPath $repo
if (-not $?) { Falhar "nao consegui entrar em $repo" }

$ramo = Invoke-Git @('rev-parse', '--abbrev-ref', 'HEAD')
if ($LASTEXITCODE -ne 0) { Falhar "git rev-parse falhou: $ramo" }
if ($ramo -ne 'main') { Falhar "a arvore esta no ramo '$ramo', nao no main - o site le o main, nao publico daqui" }

$argsAdd = @('add', '--') + $publicados
$saida = Invoke-Git $argsAdd
if ($LASTEXITCODE -ne 0) {
  if (Resolve-LockObsoleto "git add tinha falhado: $saida") {
    $saida = Invoke-Git $argsAdd
  }
  if ($LASTEXITCODE -ne 0) { Falhar "git add falhou: $saida" }
}

# --quiet devolve 0 quando NAO ha nada em staging, 1 quando ha, >1 se rebentou.
$argsDiff = @('diff', '--cached', '--quiet', '--') + $publicados
& git @argsDiff
$cod = $LASTEXITCODE
if ($cod -gt 1) { Falhar "git diff --cached falhou (codigo $cod)" }
if ($cod -eq 1) {
  $saida = Invoke-Git (@('commit', '-m', 'chore: janelas de hunt livres do Celesta', '--') + $publicados)
  if ($LASTEXITCODE -ne 0) { Falhar "git commit falhou: $saida" }
}

# Ha commits nossos por enviar? (inclui os de corridas anteriores que falharam)
$saida = Invoke-Git @('fetch', '--quiet')
if ($LASTEXITCODE -ne 0) { Falhar "git fetch falhou (rede? credenciais?): $saida" }

$ahead = Invoke-Git @('rev-list', '--count', '@{u}..HEAD')
if ($LASTEXITCODE -ne 0) { Falhar "sem upstream configurado: $ahead" }
if ([int]$ahead -eq 0) { exit 0 }

$stashAntes = @(git stash list).Count
$saida = Invoke-Git @('pull', '--rebase', '--autostash')
if ($LASTEXITCODE -ne 0) {
  git rebase --abort 2>&1 | Out-Null
  Falhar "rebase falhou com $ahead commit(s) por enviar - abortado, resolver a mao: $saida"
}
$conflitos = Invoke-Git @('diff', '--name-only', '--diff-filter=U')
if ($conflitos -or @(git stash list).Count -gt $stashAntes) {
  Falhar "o --autostash nao conseguiu repor as alteracoes locais (conflito em: $conflitos) - ficaram no git stash, resolver a mao antes de publicar"
}

$saida = Invoke-Git @('push')
if ($LASTEXITCODE -ne 0) { Falhar "push falhou com $ahead commit(s) pendentes: $saida" }

Write-Log "publicado ($ahead commit(s))"
