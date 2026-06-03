interface Props {
  floor: string;
  ceiling: string;
  onFloorChange: (v: string) => void;
  onCeilingChange: (v: string) => void;
  floorError?: string;
  ceilingError?: string;
}

export function DoneDefinitionForm({
  floor, ceiling, onFloorChange, onCeilingChange, floorError, ceilingError,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-zinc-300 mb-1">
          Done Floor — minimum success
        </label>
        <p className="text-xs text-zinc-500 mb-2">
          Specific and measurable. "Score 70% on a 100-question test." Not "get better at it."
        </p>
        <textarea
          value={floor}
          onChange={(e) => onFloorChange(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none resize-none"
          placeholder="What does minimum success look like? Be specific."
        />
        {floorError && (
          <p className="mt-1 text-xs text-red-400">{floorError}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-zinc-300 mb-1">
          Done Ceiling — aspirational success
        </label>
        <p className="text-xs text-zinc-500 mb-2">
          What would excellent look like? This drives subskill prioritization.
        </p>
        <textarea
          value={ceiling}
          onChange={(e) => onCeilingChange(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none resize-none"
          placeholder="What would excellent look like?"
        />
        {ceilingError && (
          <p className="mt-1 text-xs text-red-400">{ceilingError}</p>
        )}
      </div>
    </div>
  );
}
