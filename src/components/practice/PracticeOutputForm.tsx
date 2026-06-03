import { useState, useMemo } from "react";
import type {
  PracticeContent,
  PracticeOutput,
  PracticeTaskResult,
  ExtraStep,
  TimeSummary,
} from "../../types";
import { PracticeTaskRow } from "./PracticeTaskRow";
import { ExtraStepRow } from "./ExtraStepRow";
import { TimeSummaryTable } from "./TimeSummaryTable";

interface Props {
  practiceContent: PracticeContent;
  saving: boolean;
  initialOutput?: PracticeOutput;
  onSave: (output: Omit<PracticeOutput, "completedAt">, minutesLogged: number) => Promise<void>;
}

function initTaskResults(content: PracticeContent, initial?: PracticeOutput): PracticeTaskResult[] {
  return content.tasks.map((t) => {
    const existing = initial?.taskResults?.find((r) => r.taskId === t.id);
    return existing ?? {
      taskId: t.id,
      taskName: t.taskName,
      plannedMinutes: t.plannedMinutes,
      started: false,
      completed: false,
      actualMinutes: null,
      notes: "",
      blocker: "",
    };
  });
}

export function PracticeOutputForm({ practiceContent, saving, initialOutput, onSave }: Props) {
  const [taskResults, setTaskResults] = useState<PracticeTaskResult[]>(() =>
    initTaskResults(practiceContent, initialOutput),
  );
  const [extraSteps, setExtraSteps] = useState<ExtraStep[]>(() => initialOutput?.extraSteps ?? []);
  const [whatWorked, setWhatWorked] = useState(initialOutput?.whatWorked ?? "");
  const [whatDidntWork, setWhatDidntWork] = useState(initialOutput?.whatDidntWork ?? "");
  const [selfRating, setSelfRating] = useState<"hit" | "partial" | "miss">(initialOutput?.selfRating ?? "partial");
  const [readyToAdvance, setReadyToAdvance] = useState(initialOutput?.readyToAdvance ?? false);
  const [proofArtifact, setProofArtifact] = useState(initialOutput?.proofArtifact ?? "");
  const [saveError, setSaveError] = useState("");

  const timeSummary = useMemo((): TimeSummary => {
    const plannedMinutes = taskResults.reduce((s, t) => s + t.plannedMinutes, 0);
    const actualOnTasks = taskResults.reduce((s, t) => s + (t.actualMinutes ?? 0), 0);
    const extraMinutes = extraSteps.reduce((s, e) => s + (e.actualMinutes ?? 0), 0);
    const totalActual = actualOnTasks + extraMinutes;
    return { plannedMinutes, actualOnTasks, extraMinutes, totalActual, delta: totalActual - plannedMinutes };
  }, [taskResults, extraSteps]);

  function updateTask(i: number, updated: PracticeTaskResult) {
    setTaskResults((prev) => prev.map((t, idx) => (idx === i ? updated : t)));
  }

  function addExtraStep() {
    setExtraSteps((prev) => [
      ...prev,
      { id: `extra-${Date.now()}`, stepName: "", reason: "", actualMinutes: null, notes: "", completed: false },
    ]);
  }

  function updateExtraStep(i: number, updated: ExtraStep) {
    setExtraSteps((prev) => prev.map((s, idx) => (idx === i ? updated : s)));
  }

  function removeExtraStep(i: number) {
    setExtraSteps((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (!whatDidntWork.trim()) { setSaveError("What didn't work is required."); return; }
    if (!whatWorked.trim()) { setSaveError("What worked is required."); return; }
    setSaveError("");

    const output: Omit<PracticeOutput, "completedAt"> = {
      taskResults,
      extraSteps: extraSteps.length > 0 ? extraSteps : undefined,
      timeSummary,
      whatWorked: whatWorked.trim(),
      whatDidntWork: whatDidntWork.trim(),
      selfRating,
      readyToAdvance,
      proofArtifact: proofArtifact.trim() || undefined,
    };

    const minutesLogged = timeSummary.totalActual;
    await onSave(output, minutesLogged);
  }

  return (
    <div className="space-y-4 border-t border-zinc-700 pt-3">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Log Outcome</p>

      {/* Task results */}
      <div className="space-y-2">
        <p className="text-xs text-zinc-500 font-medium">Tasks</p>
        {taskResults.map((result, i) => (
          <PracticeTaskRow key={result.taskId} result={result} onChange={(u) => updateTask(i, u)} />
        ))}
      </div>

      {/* Extra steps */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 font-medium">Extra steps</p>
          <button
            type="button"
            onClick={addExtraStep}
            className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded px-2 py-0.5"
          >
            + Add
          </button>
        </div>
        {extraSteps.length === 0 ? (
          <p className="text-xs text-zinc-600 italic">None</p>
        ) : (
          extraSteps.map((step, i) => (
            <ExtraStepRow
              key={step.id}
              step={step}
              onChange={(u) => updateExtraStep(i, u)}
              onDelete={() => removeExtraStep(i)}
            />
          ))
        )}
      </div>

      {/* Time summary */}
      <TimeSummaryTable summary={timeSummary} />

      {/* Overall fields */}
      <div className="space-y-3 border-t border-zinc-700 pt-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">
            What worked <span className="text-red-400">*</span>
          </label>
          <textarea
            value={whatWorked}
            onChange={(e) => setWhatWorked(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none"
            placeholder="What felt right or clicked?"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">
            What didn't work <span className="text-red-400">*</span>
          </label>
          <textarea
            value={whatDidntWork}
            onChange={(e) => setWhatDidntWork(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none"
            placeholder="Be specific — feeds self-correction."
          />
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs text-zinc-400">Rating:</span>
          {(["hit", "partial", "miss"] as const).map((r) => (
            <label key={r} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="pof-rating"
                value={r}
                checked={selfRating === r}
                onChange={() => setSelfRating(r)}
                className="accent-white"
              />
              <span className="text-xs capitalize text-zinc-300">{r}</span>
            </label>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={readyToAdvance}
            onChange={(e) => setReadyToAdvance(e.target.checked)}
            className="accent-white"
          />
          <span className="text-xs text-zinc-300">Ready to advance to next subskill</span>
        </label>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Proof artifact (optional)</label>
          <input
            type="text"
            value={proofArtifact}
            onChange={(e) => setProofArtifact(e.target.value)}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
            placeholder="Screenshot path, recording URL, etc."
          />
        </div>

        {saveError && <p className="text-xs text-red-400">{saveError}</p>}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !whatDidntWork.trim()}
        className="w-full rounded-lg bg-white py-2 text-sm font-semibold text-zinc-900 disabled:opacity-40 hover:bg-zinc-100"
      >
        {saving ? "Saving..." : "Save Practice Output"}
      </button>
    </div>
  );
}
