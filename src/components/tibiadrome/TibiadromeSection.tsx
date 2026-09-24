import { useRotationClock } from '../../hooks/useRotationClock';
import { ROTATION_ANCHOR } from '../../data/tibiadrome/rotationAnchor';
import { RotationCard } from './RotationCard';

/**
 * O Tibiadrome ficou reduzido à contagem decrescente da rotação.
 *
 * Havia também um registo de modificadores, mas o formulário na app só lia o
 * anúncio in-game e devolvia um comando para colar num terminal — quem
 * guardava era um script à parte. Uma funcionalidade que precisa de um
 * terminal a meio não é uma funcionalidade da app.
 */
export function TibiadromeSection() {
  const state = useRotationClock(ROTATION_ANCHOR);

  // A caixa (o `.card`) é da página; aqui fica só o conteúdo.
  return <RotationCard state={state} now={Date.now()} />;
}
