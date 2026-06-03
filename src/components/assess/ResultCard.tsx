interface ItemResult {
  prompt: string;
  subskill: string;
  score: number;
  maxPoints: number;
}

interface Props {
  totalScore: number;
  floorThreshold: number;
  ceilingThreshold: number;
  floorPassed: boolean;
  ceilingPassed: boolean;
  itemResults: ItemResult[];
  onRetake: () => void;
}

export function ResultCard({ totalScore, floorThreshold, ceilingThreshold, floorPassed, ceilingPassed, itemResults, onRetake }: Props) {
  const pct = Math.round(totalScore);

  return (
    <div className="space-y-4">
      {/* Score summary */}
      <div className={`rounded-xl border-2 px-6 py-5 text-center ${floorPassed ? "border-green-600 bg-green-950" : "border-red-700 bg-red-950"}`}>
        <div className={`text-5xl font-bold mb-1 ${floorPassed ? "text-green-300" : "text-red-300"}`}>
          {pct}%
        </div>
        <div className={`text-sm font-medium ${floorPassed ? "text-green-400" : "text-red-400"}`}>
          {floorPassed ? "Floor cleared" : `Floor not cleared — need ${floorThreshold}%`}
        </div>
        {floorPassed && (
          <div className={`mt-1 text-xs ${ceilingPassed ? "text-green-400" : "text-zinc-400"}`}>
            {ceilingPassed ? `✓ Ceiling cleared (${ceilingThreshold}% target)` : `Ceiling: ${ceilingThreshold}% target — keep going`}
          </div>
        )}
      </div>

      {/* Item breakdown */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">Item Breakdown</p>
        {itemResults.map((item, i) => {
          const hitClass = item.score === 2 ? "text-green-400" : item.score === 1 ? "text-yellow-400" : "text-red-400";
          const hitLabel = item.score === 2 ? "hit" : item.score === 1 ? "partial" : "miss";
          return (
            <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs flex items-start gap-3">
              <span className={`shrink-0 font-semibold w-12 ${hitClass}`}>{hitLabel}</span>
              <div className="min-w-0">
                <div className="text-zinc-500 text-[10px] mb-0.5">{item.subskill}</div>
                <div className="text-zinc-300 line-clamp-2">{item.prompt}</div>
              </div>
              <span className="shrink-0 text-zinc-600">{item.score}/{item.maxPoints}</span>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onRetake}
        className="w-full rounded-lg border border-zinc-700 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
      >
        Retake Assessment
      </button>
    </div>
  );
}
