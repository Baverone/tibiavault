import { CELESTA_COLLECTION_OFF_SINCE } from '../config';
import { CelestaHuntsPanel } from '../components/hunt/CelestaHuntsPanel';
import { Icon } from '../components/shell/icons';

/**
 * As janelas livres dos spots do Celesta.
 *
 * **A recolha está desligada desde 15/09/2026**, por ordem do André («tira a
 * pesquisa de hunts pelo discord, para já não quero a funcionar»). O código
 * fica todo onde estava — o «para já» dele é para respeitar nos dois sentidos —
 * mas a página tem de o dizer.
 *
 * Sem este aviso, o painel mostrava o vermelho de «Dados parados há Xh — a
 * recolha do Discord pode ter parado», que é uma frase para uma AVARIA. Aqui
 * não há avaria nenhuma: está desligado porque ele mandou desligar, e um aviso
 * que grita por uma coisa que está certa é um aviso que se aprende a ignorar.
 */
export function CelestaPage() {
  return (
    <>
      <p className="aviso">
        <Icon name="desligado" size={17} />
        <span>
          <b>A recolha está desligada</b> desde {CELESTA_COLLECTION_OFF_SINCE} — foi o André que a mandou parar, não
          é uma avaria. As janelas abaixo são as últimas que entraram e não voltam a mudar enquanto isto estiver
          assim. Para as ligar outra vez é preciso voltar a pôr de pé as tarefas <code>tibia-celesta</code> e{' '}
          <code>tibia-reservas</code> no PC.
        </span>
      </p>

      <div className="card">
        <CelestaHuntsPanel collectionOff />
      </div>
    </>
  );
}
