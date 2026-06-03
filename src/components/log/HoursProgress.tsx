interface Props {
  hoursLogged: number;
  goal?: number;
}

export function HoursProgress({ hoursLogged, goal = 20 }: Props) {
  const pct = Math.min(100, (hoursLogged / goal) * 100);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Hours Toward {goal}h
        </span>
        <span className="text-sm font-mono text-white">
          {hoursLogged.toFixed(1)}<span className="text-zinc-500">/{goal}h</span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-white transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-zinc-600">{pct.toFixed(0)}% complete</p>
    </div>
  );
}
