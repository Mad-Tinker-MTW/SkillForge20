import { useState } from "react";
import type { AssessmentContent } from "../../types";

interface ItemResult {
  prompt: string;
  subskill: string;
  score: number;
  maxPoints: number;
}

interface Props {
  content: AssessmentContent;
  onComplete: (itemResults: ItemResult[], totalScore: number) => void;
}

type ItemPhase = "attempt" | "scored";

interface ItemState {
  response: string;
  phase: ItemPhase;
  score: number;
}

export function AssessmentRunner({ content, onComplete }: Props) {
  const [current, setCurrent] = useState(0);
  const [items, setItems] = useState<ItemState[]>(
    content.items.map(() => ({ response: "", phase: "attempt", score: -1 })),
  );

  const item = content.items[current];
  const state = items[current];

  if (!item || !state) return null;

  const allScored = items.every((s) => s.score >= 0);
  const completedCount = items.filter((s) => s.score >= 0).length;

  function reveal() {
    setItems((prev) =>
      prev.map((s, i) => (i === current ? { ...s, phase: "scored" } : s)),
    );
  }

  function score(val: number) {
    const next = items.map((s, i) => (i === current ? { ...s, score: val } : s));
    setItems(next);
    if (current < content.items.length - 1) {
      setCurrent((c) => c + 1);
    }
  }

  function submit() {
    const results: ItemResult[] = content.items.map((it, i) => ({
      prompt: it.prompt,
      subskill: it.subskill,
      score: items[i]!.score,
      maxPoints: it.points,
    }));
    const earned = results.reduce((sum, r) => sum + r.score, 0);
    const max = results.reduce((sum, r) => sum + r.maxPoints, 0);
    const totalScore = max > 0 ? (earned / max) * 100 : 0;
    onComplete(results, totalScore);
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{content.title}</span>
        <span>{completedCount}/{content.items.length} scored</span>
      </div>
      <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-white transition-all"
          style={{ width: `${(completedCount / content.items.length) * 100}%` }}
        />
      </div>

      {/* Scoring guide (collapsed) */}
      <details className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs">
        <summary className="cursor-pointer text-zinc-500 select-none">Scoring guide</summary>
        <p className="mt-2 text-zinc-400">{content.scoringGuide}</p>
      </details>

      {/* Current item */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">{item.subskill}</span>
          <span className="text-xs text-zinc-600">{current + 1} / {content.items.length}</span>
        </div>

        <p className="text-sm font-medium text-white">{item.prompt}</p>

        {state.phase === "attempt" && (
          <>
            <textarea
              value={state.response}
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((s, i) => (i === current ? { ...s, response: e.target.value } : s)),
                )
              }
              rows={3}
              placeholder="Write or describe your attempt..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none resize-none"
            />
            <button
              type="button"
              onClick={reveal}
              className="w-full rounded-lg bg-zinc-700 py-2 text-xs font-medium text-white hover:bg-zinc-600"
            >
              Reveal Model Answer
            </button>
          </>
        )}

        {state.phase === "scored" && (
          <>
            {state.response && (
              <div className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-400 italic">
                Your attempt: {state.response}
              </div>
            )}
            <div className="rounded-lg border border-blue-800 bg-blue-950 px-3 py-2 text-xs text-blue-300">
              <span className="font-semibold text-blue-200">Model answer: </span>
              {item.modelAnswer}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 shrink-0">Score this:</span>
              {([ [0, "miss", "border-red-700 bg-red-950 text-red-300 hover:bg-red-900"],
                  [1, "partial", "border-yellow-700 bg-yellow-950 text-yellow-300 hover:bg-yellow-900"],
                  [2, "hit", "border-green-700 bg-green-950 text-green-300 hover:bg-green-900"],
              ] as const).map(([val, label, cls]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => score(val)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors ${cls}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}

        {state.score >= 0 && state.phase === "scored" && (
          <div className="flex justify-end">
            {current < content.items.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrent((c) => c + 1)}
                className="rounded-lg bg-zinc-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-600"
              >
                Next →
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Item nav dots */}
      <div className="flex gap-1.5 justify-center flex-wrap">
        {content.items.map((_, i) => {
          const s = items[i]!;
          const dotColor =
            s.score === 2 ? "bg-green-500" :
            s.score === 1 ? "bg-yellow-500" :
            s.score === 0 ? "bg-red-500" :
            i === current ? "bg-white" : "bg-zinc-700";
          return (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              className={`h-2 w-2 rounded-full transition-colors ${dotColor}`}
              title={`Item ${i + 1}`}
            />
          );
        })}
      </div>

      {/* Submit */}
      {allScored && (
        <button
          type="button"
          onClick={submit}
          className="w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
        >
          Calculate Score
        </button>
      )}
    </div>
  );
}
