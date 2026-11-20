# Histórico dos skills — desenho curto (aprovado 20/11/2026)

## Porquê

Palavras do André (20/11/2026): *«quero que ao colocar os skills dos Chars, que
eles fiquem gravados, com isto, podemos avaliar o progresso de evolução dos
Skills ao longo do tempo e até quando há os eventos»*. Hoje a calculadora de
treino guarda só o valor atual no `localStorage` de cada browser: cada escrita
apaga a anterior e o telemóvel não vê o que o PC tem.

## Objetivos

- Cada leitura (data/hora, nível e % em falta de cada skill, Loyalty) fica
  gravada e é vista em **todos os aparelhos** (resposta dele: «Sim, em todos»).
- Gráfico por skill ao longo do tempo, com período à escolha, e o ritmo médio
  por dia.
- Eventos marcados por ele (nome, início, fim): sombreados no gráfico e ritmo
  por dia **dentro vs fora** dos eventos, por skill.

## Não-objetivos

- Ler skills automaticamente do Tibia (não são públicos fora dos highscores).
- Lista automática de eventos (o tibia.com não tem uma lista que se leia sem
  raspar a página).

## Anti-objetivos

- Gravar a cada tecla (enchia o histórico de lixo): só o botão grava.
- Perder uma leitura em silêncio: uma falha de escrita diz-se no ecrã.
- Pôr a chave fora do browser dele ou num ficheiro do repositório.

## Abordagens

1. **Pelo GitHub (escolhida).** O browser escreve direto no repositório pela
   API de conteúdos do GitHub, com uma chave fine-grained só para
   `Baverone/tibiavault` (Contents: read and write), colada por ele uma vez em
   cada aparelho. Não precisa do servidor nem do túnel.
2. Pelo servidor: um serviço novo atrás do cofre de contas, num subdomínio
   novo da Cloudflare. Sem chave nos aparelhos, mas mais uma peça sempre ligada
   e um passo no painel da Cloudflare.

O André deixou a escolha comigo («escolhe a que for mais fácil colocar a
funcionar»): a 1 não precisa de nada fora do repositório.

## O que fica decidido

- Ficheiros: `data/skills-history/<personagem>.json` (lista de leituras) e
  `data/skills-history/eventos.json` (lista de eventos, partilhada pelos dois).
  A tarefa `tibia-push` do servidor nunca escreve nesta pasta; o
  `git pull --rebase --autostash` dela junta os commits do browser sem conflito.
- Leitura: `{ timestamp, loyaltyBonusPercent, skills: { <skill>: { level, percentMissing } } }`
  com os números já validados. Só entram as skills com valores válidos.
- Ler os ficheiros pela API do GitHub (`api.github.com`, com a chave se houver),
  não pelo `raw.githubusercontent.com`, que guarda cache 5 min e fazia a
  leitura acabada de gravar «desaparecer».
- Escrever: GET (sha + conteúdo atual) → juntar → PUT; num 409/422 (alguém
  escreveu entretanto) repete uma vez.
- Ritmo: o nível fracionário `level + (100 − %falta)/100`; ritmo por dia =
  diferença entre a primeira e a última leitura do período a dividir pelos dias.
  Dentro/fora de eventos: soma das subidas entre leituras consecutivas cujo
  intervalo cai todo dentro (ou todo fora) de um evento, a dividir pelos dias
  desses intervalos; intervalos que atravessam a fronteira não entram.
  (Decisão minha: simples e honesto; níveis altos custam mais, mas para comparar
  dias próximos chega.)
- Chave: `localStorage` `tibiavault:github-token`; o campo fica na secção Treino.

## Fica para quem constrói

O desenho do cartão, o sítio exato dos botões, as mensagens.
