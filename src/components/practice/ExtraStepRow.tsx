import type { ExtraStep } from "../../types";

interface Props {
  step: ExtraStep;
  onChange: (updated: ExtraStep) => void;
  onDelete: () => void;
}

export function ExtraStepRow({ step, onChange, onDelete }: Props) {
  function update(patch: Partial<ExtraStep>) {
    onChange({ ...step, ...patch });
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-2 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={step.stepName}
          onChange={(e) => update({ stepName: e.target.value })}
          className="flex-1 rounded border border-zinc-700 bg-zinc-700/50 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:outline-none"
          placeholder="Step name"
        />
        <button
          type="button"
          onClick={onDelete}
          className="text-zinc-600 hover:text-red-400 text-xs px-1"
          aria-label="Remove step"
        >
          ✕
        </button>
      </div>

      <input
        type="text"
        value={step.reason}
        onChange={(e) => update({ reason: e.target.value })}
        className="w-full rounded border border-zinc-700 bg-zinc-700/50 px-2 py-1 text-xs text-zinc-400 placeholder-zinc-600 focus:outline-none"
        placeholder="Why was this step needed?"
      />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500">Actual:</span>
          <input
            type="number"
            min="0"
            value={step.actualMinutes ?? ""}
            onChange={(e) =>
              update({ actualMinutes: e.target.value !== "" ? Number(e.target.value) : null })
            }
            className="w-14 rounded border border-zinc-600 bg-zinc-700 px-2 py-1 text-xs text-white text-center focus:outline-none"
            placeholder="—"
          />
          <span className="text-xs text-zinc-500">min</span>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={step.completed}
            onChange={(e) => update({ completed: e.target.checked })}
            className="accent-white"
          />
          <span className="text-xs text-zinc-400">Complete</span>
        </label>
      </div>

      <input
        type="text"
        value={step.notes}
        onChange={(e) => update({ notes: e.target.value })}
        className="w-full rounded border border-zinc-700 bg-zinc-700/50 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:outline-none"
        placeholder="Notes (optional)"
      />
    </div>
  );
}
