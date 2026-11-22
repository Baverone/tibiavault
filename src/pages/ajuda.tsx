import type { ReactNode } from 'react';
import type { PageId } from '../navigation/pages';

/**
 * O «Como ler esta página» de cada página, fechado por omissão.
 *
 * Estes textos existiam — mas espalhados pela interface, sempre abertos, à
 * frente dos números. A regra da identidade comum é a do mtgvault: explicação
 * longa vive num `<details>`, porque é texto que se lê UMA vez e depois é só
 * distância até ao fim da página.
 */

const personagem: ReactNode = (
  <>
    <p>
      <b>Nível.</b> Sai da fórmula oficial do Tibia aplicada à XP total mais recente — não de uma tabela. O «range de
      Share Exp» é o intervalo de níveis com quem dá para partilhar experiência.
    </p>
    <p>
      <b>Progressão.</b> Cada barra é a XP feita nesse dia (a diferença para o dia anterior com leitura), não a XP
      acumulada. Barras vermelhas são dias em que se perdeu XP — mortes. O período é ancorado à leitura mais recente e
      não a «hoje»: se a recolha falhar dois dias, «7 dias» continua a mostrar sete dias de dados.
    </p>
    <p>
      <b>Previsão.</b> A janela é simétrica: para saber onde estarás daqui a N dias usa-se a média dos últimos N dias.
      É isso que faz a previsão longa ser lenta a mudar de ideias, em vez de multiplicar uma semana boa por oito.
    </p>
    <p>
      <b>Calculadora de hunt.</b> A XP/h é a bruta, a 100%; os bónus (stamina verde, XP Boost, evento de dobro) são
      aplicados por cima. Cada XP Boost vale uma hora de caça.
    </p>
    <p>
      <b>Varinhas de treino.</b> A conta é feita sobre o nível BASE, sem Loyalty: a Loyalty infla o número que aparece
      no jogo, não acelera o treino real. Se tiveres Loyalty, a tabela mostra as duas leituras.
    </p>
  </>
);

export const PAGE_AJUDA: Partial<Record<PageId, ReactNode>> = {
  inicio: (
    <>
      <p>
        <b>De onde vêm os números.</b> A XP é raspada do guildstats.eu uma vez por dia, por uma tarefa que corre no PC
        do André (o guildstats responde <code>403</code> aos servidores do GitHub). O resultado é publicado no
        repositório e a app lê-o directamente de lá — não há base de dados nem servidor próprio.
      </p>
      <p>
        <b>«Último dia» e não «ontem».</b> O guildstats só publica o dia anterior, e por volta das 10:50 UTC. O cartão
        diz sempre de que dia está a falar. Se a leitura mais recente tiver três dias ou mais, aparece um aviso no topo:
        é o sinal de que a recolha parou.
      </p>
      <p>
        <b>A semana são sete dias com leitura</b>, ancorados ao dia mais recente. A nota por baixo do número diz quantos
        dias entraram mesmo na conta.
      </p>
      <p>
        <b>O gráfico</b> põe os dois bonecos lado a lado, agrupados por dia. Não são barras empilhadas de propósito: a
        soma dos dois responderia a uma pergunta que ninguém fez e esconderia o dia mau de um por trás do dia bom do
        outro.
      </p>
    </>
  ),
  baverone: personagem,
  bluey: personagem,
  bosses: (
    <>
      <p>
        <b>A rota de hoje.</b> Os blocos vêm pela ordem das áreas, para se fazer um boss a seguir ao outro. Todos os dias
        entram os bosses de equipamento; o varrimento do Bosstiary muda com o dia da semana (o dia de Tibia, que vira no
        server save). Um boss em cooldown fica a cinzento com a hora a que volta. O Monk só vê os bosses do nível dele.
      </p>
      <p>
        <b>As marcas.</b> «sempre» = fazer sempre que o cooldown acaba; «Bosstiary» = fazer até ao objetivo (Mastery nos
        Archfoe e Nemesis, Prowess nos Bane, por omissão) e depois sai da rota sozinho; «fora» = nunca. A marca é por
        personagem e separada para solo e team; as kills são as mesmas.
      </p>
      <p>
        <b>O acesso.</b> Um boss com kills conta como tendo acesso. Sem kills aparece «acesso?»: «sem acesso» esconde-o.
        Escrever no separador Bosstiary as kills que o jogo mostra resolve a maior parte de uma vez.
      </p>
      <p>
        <b>O boosted</b> vem da TibiaData: o +1 passa a +3, como no jogo. <b>A gravação</b> faz-se no GitHub, como a dos
        skills, 2 s depois do último clique, num commit só; o canto diz se está gravado.
      </p>
      <p>
        <b>De onde vêm os dados.</b> Duas pesquisas de 22/11/2026 (TibiaWiki pelo tibiawiki.dev, TibiaPal, TibiaQA,
        TibiaData). Os níveis solo e os tempos são estimativas — os níveis do Monk quase todos — e estão marcados com «~».
      </p>
    </>
  ),
  partilha: (
    <>
      <p>
        <b>A regra (tibia.com).</b> Numa party, o boneco mais baixo tem de ter pelo menos 2/3 dos níveis do mais alto
        para a XP ser partilhada. Por isso o alvo não é fixo: cada nível que o mais alto sobe puxa o alvo 2/3 de nível
        para cima.
      </p>
      <p>
        <b>A conta.</b> Dia a dia, até dez anos para a frente: cada um soma a sua XP por dia, o nível sai da fórmula
        oficial, e o primeiro dia em que os dois níveis cumprem a regra é a resposta. Se nunca cumprirem, diz-se isso
        em vez de inventar uma data.
      </p>
      <p>
        <b>O ritmo</b> é a média da XP feita no período escolhido (a mesma conta da Previsão, ancorada à leitura mais
        recente). Escrever outro número nos campos experimenta um ritmo diferente sem mexer em nada.
      </p>
      <p>
        <b>«Quanto precisa por dia»</b> conta com o mais alto a continuar ao ritmo dele: o alvo é o nível que ele terá
        nesse dia, não o de hoje.
      </p>
    </>
  ),
  stamina: (
    <>
      <p>
        <b>As regras (TibiaWiki).</b> A regenerar offline ganha-se 1 minuto de stamina por cada 3 minutos até às 39h, e
        por cada 6 minutos entre as 39h e as 42h — e só passados 10 minutos offline. Caçar gasta 1:1.
      </p>
      <p>
        <b>As zonas.</b> Acima de 39h (com Premium) a XP é a 150%; entre 14h e 39h é a 100%; abaixo de 14h entra a
        penalização.
      </p>
      <p>As horas usam o relógio do teu dispositivo, não o do servidor.</p>
    </>
  ),
  flechas: (
    <>
      <p>
        <b>A conta.</b> Flechas a dividir por minutos. A tabela ao lado é a mesma conta ao contrário: quantas flechas
        dá cada ritmo ao fim de N minutos, para as taxas mais comuns.
      </p>
      <p>A linha e a coluna que mais se aproximam do que escreveste ficam marcadas.</p>
    </>
  ),
  mundo: (
    <>
      <p>
        <b>O dia de Tibia</b> só avança no server save, às 9:00 de Lisboa — antes disso o dia ainda é o anterior. É por
        isso que o Rashid pode estar numa cidade às 8:59 e noutra às 9:01, e é essa a conta que a app faz (com o fuso
        <code>Europe/Lisbon</code>, que se ajusta sozinho a verão/inverno).
      </p>
      <p>
        <b>A rotação do Tibiadrome</b> é contada a partir de uma data-âncora conhecida, de duas em duas semanas (14 dias).
      </p>
    </>
  ),
};
