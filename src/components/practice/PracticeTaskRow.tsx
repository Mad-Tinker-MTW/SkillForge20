import type { PracticeTaskResult } from "../../types";

interface Props {
  result: PracticeTaskResult;
  onChange: (updated: PracticeTaskResult) => void;
}

export function PracticeTaskRow({ result, onChange }: Props) {
  function update(patch: Partial<PracticeTaskResult>) {
    onChange({ ...result, ...patch });
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white">{result.taskName}</span>
        <span className="text-xs text-zinc-500">Goal: {result.plannedMinutes}m</span>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={result.started}
            onChange={(e) => update({ started: e.target.checked })}
            className="accent-white"
          />
          <span className="text-xs text-zinc-400">Started</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={result.completed}
            onChange={(e) => update({ completed: e.target.checked })}
            className="accent-white"
          />
          <span className="text-xs text-zinc-400">Complete</span>
        </label>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-zinc-500">Actual:</span>
          <input
            type="number"
            min="0"
            value={result.actualMinutes ?? ""}
            onChange={(e) =>
              update({ actualMinutes: e.target.value !== "" ? Number(e.target.value) : null })
            }
            className="w-14 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-xs text-white text-center focus:outline-none"
            placeholder="—"
          />
          <span className="text-xs text-zinc-500">min</span>
        </div>
      </div>

      <input
        type="text"
        value={result.notes}
        onChange={(e) => update({ notes: e.target.value })}
        className="w-full rounded border border-zinc-700 bg-zinc-700/50 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:outline-none"
        placeholder="Notes (optional)"
      />

      {result.started && !result.completed && (
        <input
          type="text"
          value={result.blocker ?? ""}
          onChange={(e) => update({ blocker: e.target.value })}
          className="w-full rounded border border-amber-900/40 bg-amber-950/20 px-2 py-1 text-xs text-amber-300 placeholder-amber-700 focus:outline-none"
          placeholder="What blocked completion? (optional)"
        />
      )}
    </div>
  );
}
