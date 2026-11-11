interface ProgressBarProps {
  percent: number;
  accentColor: string;
}

// Vírgula decimal, não ponto: é uma app em português. Era `toFixed(2)`, que
// escreve sempre à americana independentemente da língua da página.
const percentFormatter = new Intl.NumberFormat('pt-PT', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function ProgressBar({ percent, accentColor }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className="progress-bar">
      <div className="progress-bar__fill" style={{ width: `${clamped}%`, backgroundColor: accentColor }} />
      {/* Arredonda para baixo (11/11/2026): 99,996 % escrevia «100,00 %» com o nível ainda por subir. */}
      <span className="progress-bar__label">{percentFormatter.format(Math.floor(clamped * 100) / 10000)}</span>
    </div>
  );
}
