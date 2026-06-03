import { useState } from "react";
import type { AssessmentContent, SkillRow } from "../../types";
import { AssessmentRunner } from "./AssessmentRunner";
import { ResultCard } from "./ResultCard";
import { useSkill } from "../../context/SkillContext";

interface Props {
  skillId: string;
  skill: SkillRow | null;
  onAssessmentSaved: () => void;
}

type Phase = "intro" | "generating" | "running" | "saving" | "done";

interface ItemResult {
  prompt: string;
  subskill: string;
  score: number;
  maxPoints: number;
}

export function AssessTab({ skillId, onAssessmentSaved }: Props) {
  const { skill } = useSkill();
  const [phase, setPhase] = useState<Phase>("intro");
  const [content, setContent] = useState<AssessmentContent | null>(null);
  const [genError, setGenError] = useState("");
  const [itemResults, setItemResults] = useState<ItemResult[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [floorPassed, setFloorPassed] = useState(false);
  const [ceilingPassed, setCeilingPassed] = useState(false);
  const [saveError, setSaveError] = useState("");

  const hoursLogged = skill?.hours_logged ?? 0;
  const weeksElapsed = skill
    ? Math.max(1, Math.ceil((Date.now() - new Date(skill.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000)))
    : 1;
  const conditionsMet = hoursLogged >= 20 && weeksElapsed >= 7;
  const showDualWarning = !conditionsMet;

  async function generate() {
    setGenError("");
    setPhase("generating");
    try {
      const res = await fetch("/api/assessments/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId }),
      });
      const data = await res.json() as AssessmentContent & { error?: string };
      if (data.error) throw new Error(data.error);
      setContent(data);
      setPhase("running");
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : String(e));
      setPhase("intro");
    }
  }

  async function handleComplete(results: ItemResult[], score: number) {
    if (!content) return;
    const floor = score >= content.floorThreshold;
    const ceiling = score >= content.ceilingThreshold;
    setItemResults(results);
    setTotalScore(score);
    setFloorPassed(floor);
    setCeilingPassed(ceiling);
    setPhase("saving");
    setSaveError("");

    try {
      const res = await fetch(`/api/assessments/${skillId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemScores: results, totalScore: score, floorPassed: floor, ceilingPassed: ceiling }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error);
      }
      setPhase("done");
      onAssessmentSaved();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : String(e));
      setPhase("done");
    }
  }

  function retake() {
    setPhase("intro");
    setContent(null);
    setItemResults([]);
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto w-full max-w-2xl mx-auto">
      {phase === "intro" && (
        <>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-white">Assessment</h2>
            <div className="text-xs text-zinc-400 space-y-1">
              <p><span className="text-zinc-600">Floor:</span> {skill?.done_floor ?? "—"}</p>
              <p><span className="text-zinc-600">Ceiling:</span> {skill?.done_ceiling ?? "—"}</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">Hours logged:</span>
              <span className={`font-semibold ${hoursLogged >= 20 ? "text-green-400" : "text-zinc-300"}`}>
                {hoursLogged.toFixed(1)}h / 20h
              </span>
            </div>
            {showDualWarning && (
              <div className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-400">
                Both conditions should be met before final submission:{" "}
                <span className={hoursLogged >= 20 ? "text-green-400" : "text-zinc-300"}>
                  20 hours logged (current: {hoursLogged.toFixed(1)}h)
                </span>{" "}
                and{" "}
                <span className={weeksElapsed >= 7 ? "text-green-400" : "text-zinc-300"}>
                  7 weeks of practice (current: Week {weeksElapsed} of 7)
                </span>.
              </div>
            )}
            {genError && (
              <p className="text-xs text-red-400">{genError}</p>
            )}
          </div>

          <button
            type="button"
            onClick={generate}
            className="w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-40"
          >
            Generate Assessment
          </button>
        </>
      )}

      {phase === "generating" && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <p className="text-xs text-zinc-500">Generating assessment from your done criteria...</p>
        </div>
      )}

      {phase === "running" && content && (
        <>
          {content.tooEarlyWarning && (
            <div className="rounded-lg border border-amber-700 bg-amber-950 px-3 py-2 text-xs text-amber-300">
              {content.tooEarlyWarning}
            </div>
          )}
          <AssessmentRunner content={content} onComplete={handleComplete} />
        </>
      )}

      {(phase === "saving" || phase === "done") && content && (
        <>
          {phase === "saving" && (
            <div className="flex items-center justify-center py-4 gap-2 text-xs text-zinc-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving results...
            </div>
          )}
          {saveError && (
            <p className="text-xs text-red-400">{saveError}</p>
          )}
          {phase === "done" && (
            <ResultCard
              totalScore={totalScore}
              floorThreshold={content.floorThreshold}
              ceilingThreshold={content.ceilingThreshold}
              floorPassed={floorPassed}
              ceilingPassed={ceilingPassed}
              itemResults={itemResults}
              onRetake={retake}
            />
          )}
        </>
      )}
    </div>
  );
}
