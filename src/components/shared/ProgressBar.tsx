interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, max, label, className = "" }: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex justify-between text-xs text-zinc-400">
          <span>{label}</span>
          <span>
            {value.toFixed(1)} / {max}
          </span>
        </div>
      )}
      <div className="h-1.5 rounded-full bg-zinc-700">
        <div
          className="h-1.5 rounded-full bg-white transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
