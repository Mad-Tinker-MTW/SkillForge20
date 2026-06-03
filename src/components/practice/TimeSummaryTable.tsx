import type { TimeSummary } from "../../types";

interface Props {
  summary: TimeSummary;
}

export function TimeSummaryTable({ summary }: Props) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-2">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Time</p>
      <div className="space-y-1">
        <Row label="Planned" value={`${summary.plannedMinutes}m`} />
        <Row label="Actual on tasks" value={`${summary.actualOnTasks}m`} />
        {summary.extraMinutes > 0 && (
          <Row label="Extra steps" value={`${summary.extraMinutes}m`} />
        )}
        <Row label="Total actual" value={`${summary.totalActual}m`} highlight />
        <Row
          label="Delta"
          value={`${summary.delta >= 0 ? "+" : ""}${summary.delta}m`}
          color={
            summary.delta > 5
              ? "text-amber-400"
              : summary.delta < -5
                ? "text-green-400"
                : "text-zinc-400"
          }
        />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  color,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
}) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className={color ?? (highlight ? "text-white font-medium" : "text-zinc-300")}>
        {value}
      </span>
    </div>
  );
}
