# Bosses e Bosstiary no TibiaVault — desenho (22/11/2026)

## Porquê

O André quer fazer bosses com os dois personagens (Baverone, Royal Paladin 1192, e Bluey The Cat, Exalted Monk 623) por duas razões:

1. **Equipamento.** Bosses que dropam bom equipamento e que dá para fazer **solo**, sempre que o cooldown acaba.
2. **Bosstiary.** Bosses que só valem pelas kills e pelos pontos, até ao patamar seguinte.

Pediu também uma rotação **de team**, à parte, com a mesma divisão.

Quer tudo **dentro do site** (tibia.baverone.com), interativo. Ele indica as kills que já tem, como no Bosstiary do jogo, e a lista vai sendo ajustada: por ele no site e por mim, quando leio as contagens que ele gravou.

## Objetivos

- Uma rotação diária por **áreas**, como um roteiro em que um boss se faz a seguir ao outro. Uma para a **solo** e outra para a **team**, para cada personagem.
- O Bosstiary de cada personagem:
  - kills por boss;
  - o patamar (Prowess, Expertise ou Mastery) e quanto falta para o seguinte;
  - o total de pontos e quanto falta para o 2.º slot (1 500 pontos).
- Cada boss marcado como **«sempre»** (equipamento ou lucro), **«Bosstiary»** (até ao objetivo) ou **«fora»**. A marca é por personagem e ele muda-a com um clique.
- O **boss boosted do dia** em destaque. Uma kill nele conta 3.
- Gravado no GitHub, como os skills (opção A, escolhida por ele): o mesmo no PC e no telemóvel, e legível por mim.

## Fora deste desenho

- A Wheel, os charms, as hunts e o wiki das fórmulas do porfztibia. São projetos seguintes, cada um com o seu desenho.
- Ler o Bosstiary do jogo automaticamente. O tibia.com não o publica. As kills são sempre escritas por ele.
- Combinar grupos para os bosses de team (quem vem, horários). A página só diz o que fazer e o que falta.

## O que faria disto um fracasso

- Uma lista de 150 bosses por dia. A rotação de **hoje** tem de ser curta, só o que está disponível e vale a pena.
- Perder kills: dois aparelhos a gravar ao mesmo tempo, ou um clique que não fica gravado sem ele saber.
- Números inventados apresentados como certos. Os níveis solo estimados aparecem marcados como estimativa.

## Abordagens consideradas

| | Gravação | Prós | Contras |
|---|---|---|---|
| **A (escolhida)** | `data/bosstiary/<personagem>.json` no repositório, pela API do GitHub, com a chave que já está nos aparelhos | igual em todos os aparelhos; eu leio-a para ajustar; o código já existe (`skillsHistoryStore.ts`) | cada gravação demora ~1 s e precisa da chave |
| B | `localStorage` do aparelho | instantâneo e simples | cada aparelho com a sua contagem; eu não a vejo |
| C | Folha de cálculo | fácil de editar | fora do site e não interativo; ele pediu o site |

O André escolheu a **A** a 22/11/2026.

## Os dados

### Catálogo (fixo, no código)

Fica em `src/data/bosses/`. Gero-o a partir das duas pesquisas de 22/11:

- **157 bosses solo**, de TibiaWiki (pelo mirror tibiawiki.dev), TibiaPal, TibiaQA e TibiaData;
- **104 bosses de team**.

Cada boss tem:

- nome, área, região;
- categoria: Bane, Archfoe ou Nemesis;
- cooldown em horas;
- acesso, numa linha;
- tipo: `solo` (`sim` ou `difícil`) ou `team` (tamanho mínimo e típico);
- nível mínimo estimado para o RP e para o Monk;
- loot de destaque;
- valor: `equipamento`, `lucro` ou `bosstiary`;
- **bloco da rota** e ordem dentro dele;
- `incerto`, mais as fontes.

Os blocos vêm das pesquisas.

**Solo do RP, diário:**
1. Edron/Isle of Ada e Bounac
2. cemitérios de Edron e Cormaya
3. Ingol
4. Farmine (Falcon Bastion)
5. Ankrahmun (Cobra Bastion)
6. Port Hope (Iksupan)
7. Marapur
8. Kazordoon (Warzones 4–6)

Há ainda um bloco «endgame a testar»: Soul War, Rotten Blood, Brainstealer, Magma Bubble e Roost of the Graveborn.

**Monk:** a sua própria seleção dos mesmos blocos, dentro do nível dele.

**Varrimento do Bosstiary:** um bloco por dia da semana, por cidade.

**Team:** as 13 sessões por área da pesquisa, de Rotten Blood aos especiais semanais.

**Regras do Bosstiary**, confirmadas nas duas pesquisas:

| Categoria | Kills (P/E/M) | Pontos (P/E/M) |
|---|---|---|
| Bane | 25/100/300 | 5/15/30 |
| Archfoe | 5/20/60 | 10/30/60 |
| Nemesis | 1/3/5 | 10/30/60 |

### Estado de cada personagem (no GitHub)

O ficheiro é `data/bosstiary/<royal-paladin|exalted-monk>.json`:

```json
{
  "bosses": {
    "Grand Master Oberon": { "kills": 37, "ultimaKill": "2026-11-22T19:40:00Z", "acesso": true, "marca": "sempre", "objetivo": "mastery" }
  }
}
```

- Os campos que faltam usam o valor do catálogo. Uma marca, um acesso ou um objetivo só são gravados quando ele muda o valor que vem do catálogo.
- As gravações juntam-se: os cliques ficam numa fila e gravam-se num commit só, ~2 s depois do último. Aparece um indicador «a gravar… / gravado / falhou — tentar outra vez».
- Os conflitos tratam-se como nos skills: em 409/422 lê outra vez, volta a aplicar a alteração e repete. A alteração é aplicada como diferença (+1 kill, nova marca), nunca escrevendo por cima do ficheiro inteiro.

### Boss boosted

Vem de `https://api.tibiadata.com/v4/boostablebosses`, lido ao abrir a página. Se a leitura falhar, a página funciona sem ele e diz isso.

## A página

Há uma página nova, **«Bosses»**, com uma secção própria na barra lateral. No topo tem a escolha do personagem (Baverone / Bluey) e três separadores.

```
Bosses                                   [Baverone ▾]   gravado ✓
 Boosted hoje: Unaz the Mean (conta 3) — está no varrimento de quarta (Venore); feito hoje vale ×3
 [ Hoje · solo ]  [ Team ]  [ Bosstiary ]

 Hoje · solo — 2 h 10 estimadas
 1 Edron · Isle of Ada / Bounac
   ☐ Court Warlock      Archfoe  12/20 Expertise   sempre   [+1]
   ☐ Drume              Archfoe  60/60 ✔ Mastery    sempre   [+1]
 2 Cemitérios Edron/Cormaya
   ⏳ Count Vlarkorth   volta às 21:40
 …
 Bosstiary de hoje (domingo: Edron extra)
   ☐ Inkwing            Bane      8/25 Prowess       [+1]
```

**«Hoje · solo»**
- Mostra os blocos pela ordem da rota.
- Inclui os bosses marcados «sempre», mais os «Bosstiary» que ainda não chegaram ao objetivo e são do bloco do dia da semana.
- Esconde os que estão sem acesso ou «fora».
- Um boss em cooldown fica cinzento, com a hora a que volta.
- O boosted sobe para o topo.
- `+1` soma uma kill (3 se for o boosted) e guarda a hora da kill.

**«Team»**
- Tem a mesma estrutura, com as sessões de team.
- Mostra o tamanho do grupo e o acesso que todos precisam de ter.
- Os finais de 68 h, 44 h e 14 dias aparecem só no dia em que estão disponíveis.

**«Bosstiary»**
- É a tabela completa, com filtros: categoria, solo/team, marca e «falta para o patamar».
- Cada boss tem:
  - as kills, num campo editável, para ele escrever de uma vez o que já tem no jogo;
  - uma barra até ao patamar seguinte;
  - a marca (sempre / Bosstiary / fora), o acesso e o objetivo.
- No topo: o total de pontos, os pontos que faltam para os 1 500 do 2.º slot e o bónus de loot estimado.

**Objetivo por omissão** dos bosses «Bosstiary» (escolha minha, ele muda boss a boss):
- Archfoe e Nemesis: **Mastery**. São 100 pontos cada, e a Mastery dá +25 % de loot no slot.
- Bane: **Prowess**. Fazer 300 kills para 50 pontos raramente compensa.

**Níveis estimados.** Um nível que é estimativa aparece com «~» e uma nota «estimado, não confirmado». Para o Monk, quase todos estão nessa situação.

## Regras de omissão (decididas por mim depois da revisão de 22/11; ele corrige no site)

1. **O que entra em «Hoje · solo».**
   - **Todos os dias:** os 8 blocos diários da pesquisa. Só os bosses de **equipamento** ficam marcados «sempre».
   - **Varrimento do dia da semana:** os bosses de **lucro** que estão fora desses blocos (os 4 da Inquisition, Sir Baeloc e Sir Nictros, o trio do Netherworld, os 4 túmulos de Issavi, Brokul, Duke Krule). Ficam marcados «sempre», mas entram só no bloco do dia em que esse varrimento passa pela cidade deles.
   - **Bloco «endgame a testar»:** aparece fechado no fim da lista. Cada boss tem um botão «passou». Quando ele carrega, o boss entra na rota diária.
   - Corrigi o esboço: o Unaz é do varrimento de quarta (Venore), não do bloco 4.
2. **O que entra em «Team».**
   - Mostra todas as sessões de **equipamento ou lucro** com pelo menos um boss disponível, ordenadas pelo valor.
   - Os finais de 68 h, 44 h e 14 dias aparecem só quando estão disponíveis.
   - As sessões só de Bosstiary ficam numa lista fechada por baixo.
   - Não há escolha obrigatória: ele faz a que o grupo conseguir.
3. **Acesso.**
   - Um boss com kills maiores que 0 tem acesso.
   - Um boss com 0 kills fica com o acesso «?». Aparece na rota com um botão «sem acesso» que o esconde, e com «tenho» o «?» desaparece.
   - Assim, quando ele escrever as kills do Bosstiary do jogo, a maior parte dos acessos fica resolvida de uma vez.
4. **Monk.**
   - É um filtro vivo pelo nível: entra o boss cujo nível mínimo estimado para o Monk é menor ou igual ao nível atual (lido do histórico de XP que o site já tem).
   - Sobe sozinho à medida que o Bluey sobe de nível.
   - Um boss sem nível estimado para o Monk usa o do RP com +150 e fica marcado como estimativa.
   - O varrimento do dia da semana vale para os dois, com o mesmo filtro.
5. **A marca é por boss e por modo (solo ou team).** As kills são do boss: contam as mesmas na solo e na team. No ficheiro:
   ```json
   { "kills": 12, "ultimaKill": "…", "acesso": true, "marcaSolo": "sempre", "marcaTeam": "bosstiary", "objetivo": "mastery", "passou": true }
   ```
6. **Pontos.**
   - A página calcula o total a partir das kills do catálogo.
   - Há também um campo **«pontos no jogo»**, onde ele escreve o total que vê no Bosstiary do jogo. Quando está preenchido, é esse que conta para os 1 500 do 2.º slot, e a diferença mostra que há bosses fora do catálogo.

## Ajustes ao longo do tempo

- **Ele ajusta no site:** a marca, o acesso, o objetivo e as kills.
- **Eu ajusto no catálogo:**
  - quando um boss chega ao objetivo, sai da rota sozinho;
  - quando um update traz bosses novos (Winter Update 2026, Banner's Return), acrescento-os;
  - quando ele me diz que um boss «difícil» passou ou falhou, mudo-o de bloco.
- O README do tibiavault fica com a nota de onde vivem os dados e como se atualiza o catálogo.

## O que fica para quem constrói

- A forma exata dos componentes e dos ficheiros, desde que siga o que o site já faz: `PAGES` em `navigation/pages.ts`, a casca, os testes `node --test` no `domain/`.
- O formato interno do catálogo (TS ou JSON importado).
- A estimativa de tempo por bloco: um número por boss no catálogo, somado. As estimativas da pesquisa não têm fonte e são apresentadas como aproximadas.
