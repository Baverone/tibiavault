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
      <span className="progress-bar__label">{percentFormatter.format(clamped / 100)}</span>
    </div>
  );
}
