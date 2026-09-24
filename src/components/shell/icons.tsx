import { ICON_PATHS, type IconName } from './iconPaths.ts';

export type { IconName };

interface IconProps {
  name: IconName;
  /** 18 por omissão. Qualquer tamanho funciona; o resto do estilo vem do CSS. */
  size?: number;
  className?: string;
}

/**
 * Um ícone do conjunto, em linha. Cor herdada (`currentColor`), traço 1.8.
 *
 * A geometria está em `iconPaths.ts` — ver lá o porquê da separação e o porquê
 * de não haver um único emoji na navegação.
 */
export function Icon({ name, size = 18, className }: IconProps) {
  return (
    <svg
      className={className ? `ico ${className}` : 'ico'}
      style={size === 18 ? undefined : { width: size, height: size }}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
