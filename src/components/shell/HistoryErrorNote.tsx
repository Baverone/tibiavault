import { Icon } from './icons';

/**
 * A leitura do histórico falhou (rede, GitHub, ficheiro estragado). Diz o quê
 * e deixa tentar outra vez — antes, a falha era mostrada como «ainda não há
 * histórico» e mandava ver a recolha no PC (auditoria de 11/11/2026).
 */
export function HistoryErrorNote({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <p className="aviso warn" role="alert">
      <Icon name="aviso" size={17} />
      <span>
        Não consegui ler o histórico ({error}).{' '}
        <button type="button" className="link-botao" onClick={onRetry}>
          Tentar outra vez
        </button>
      </span>
    </p>
  );
}
