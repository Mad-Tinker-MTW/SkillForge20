import { useState, useEffect } from "react";
import { SkillTypeSelector } from "./SkillTypeSelector";
import { DoneDefinitionForm } from "./DoneDefinitionForm";
import { BarrierForm, type Barrier } from "./BarrierForm";
import { PhaseBadge, PriorityBadge } from "../shared/Badge";
import { api } from "../../lib/api";
import type { SkillType, SubskillDraft } from "../../types";

interface Props {
  onComplete: (skillId: string) => void;
}

type Step = "basics" | "done" | "barriers" | "deconstructing" | "review" | "confirming";

const STEP_LABELS: Record<Step, string> = {
  basics: "Skill Setup",
  done: "Definition of Done",
  barriers: "Barriers",
  deconstructing: "Analyzing...",
  review: "Review Plan",
  confirming: "Saving...",
};

export function FirstRunWizard({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("basics");

  // Basics
  const [skillName, setSkillName] = useState("");
  const [skillType, setSkillType] = useState<SkillType | "">("");
  const [sessionBudget, setSessionBudget] = useState(45);

  // Done definition
  const [doneFloor, setDoneFloor] = useState("");
  const [doneCeiling, setDoneCeiling] = useState("");
  const [floorError, setFloorError] = useState("");
  const [ceilingError, setCeilingError] = useState("");

  // Barriers
  const [barriers, setBarriers] = useState<Barrier[]>([]);
  const [availableTools, setAvailableTools] = useState("");

  // Deconstruction result
  const [skillId, setSkillId] = useState("");
  const [subskills, setSubskills] = useState<SubskillDraft[]>([]);
  const [deconstructError, setDeconstructError] = useState("");
  const [progressStep, setProgressStep] = useState(0);

  const PROGRESS_STEPS = [
    "Analyzing skill type...",
    "Identifying core subskills...",
    "Validating done criteria...",
    "Assigning priorities...",
    "Building 7-week plan...",
    "Finalizing sessions...",
  ];

  useEffect(() => {
    if (step !== "deconstructing") return;
    setProgressStep(0);
    const id = setInterval(() => {
      setProgressStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 1));
    }, 2200);
    return () => clearInterval(id);
  }, [step]);

  // Step: basics → done
  function submitBasics() {
    if (!skillName.trim() || !skillType) return;
    setStep("done");
  }

  // Step: done → barriers
  function submitDone() {
    if (!doneFloor.trim() || !doneCeiling.trim()) return;
    setStep("barriers");
  }

  // Step: barriers → run deconstruction
  async function submitBarriers() {
    setStep("deconstructing");
    setDeconstructError("");

    try {
      // 1. Create skill row in DB
      const skill = await api.skills.create({
        name: skillName.trim(),
        type: skillType as SkillType,
        doneFloor: doneFloor.trim(),
        doneCeiling: doneCeiling.trim(),
        barriers: barriers.map((b) => ({ text: b.text, type: b.type, mitigation: b.mitigation })),
        sessionBudgetMinutes: sessionBudget,
      });

      setSkillId(skill.id);

      // 2. Run AI deconstruction
      const result = await api.ai.deconstruct({
        skillId: skill.id,
        barriers: barriers.map((b) => ({ text: b.text, type: b.type })),
        availableTools: availableTools.trim(),
        sessionBudgetMinutes: sessionBudget,
      });

      // 3. Check AI validation of done floor/ceiling
      if (!result.validation.valid) {
        setFloorError(result.validation.floor_feedback ?? "");
        setCeilingError(result.validation.ceiling_feedback ?? "");
        setStep("done");
        return;
      }

      setSubskills(result.subskills);
      setStep("review");
    } catch (err: unknown) {
      setDeconstructError(err instanceof Error ? err.message : String(err));
      setStep("barriers");
    }
  }

  function moveSubskill(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= subskills.length) return;
    const next = [...subskills];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setSubskills(next);
  }

  async function confirmPlan() {
    setStep("confirming");
    try {
      await api.skills.confirmPlan(skillId, subskills, sessionBudget);
      onComplete(skillId);
    } catch (err: unknown) {
      setDeconstructError(err instanceof Error ? err.message : String(err));
      setStep("review");
    }
  }

  const stepKeys: Step[] = ["basics", "done", "barriers", "review"];
  const currentIdx = stepKeys.indexOf(step);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">SkillForge20</h1>
          <p className="mt-1 text-sm text-zinc-500">First 20 Hours — {STEP_LABELS[step]}</p>
        </div>

        {/* Step indicators */}
        {step !== "deconstructing" && step !== "confirming" && (
          <div className="mb-6 flex gap-2">
            {stepKeys.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${i <= currentIdx ? "bg-white" : "bg-zinc-700"}`}
              />
            ))}
          </div>
        )}

        {/* Steps */}
        {step === "basics" && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-1">
                What skill are you acquiring?
              </label>
              <input
                autoFocus
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitBasics()}
                className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none"
                placeholder="e.g. Russian basics, fingerstyle guitar, haiku writing"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">Skill type</label>
              <SkillTypeSelector value={skillType} onChange={setSkillType} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-1">
                Session budget (minutes)
              </label>
              <input
                type="number"
                min={15}
                max={180}
                value={sessionBudget}
                onChange={(e) => setSessionBudget(Number(e.target.value))}
                className="w-32 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-white focus:border-zinc-400 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={submitBasics}
              disabled={!skillName.trim() || !skillType}
              className="w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-40 hover:bg-zinc-100"
            >
              Continue
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-6">
            <DoneDefinitionForm
              floor={doneFloor}
              ceiling={doneCeiling}
              onFloorChange={(v) => { setDoneFloor(v); setFloorError(""); }}
              onCeilingChange={(v) => { setDoneCeiling(v); setCeilingError(""); }}
              floorError={floorError}
              ceilingError={ceilingError}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("basics")}
                className="rounded-lg border border-zinc-600 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Back
              </button>
              <button
                type="button"
                onClick={submitDone}
                disabled={!doneFloor.trim() || !doneCeiling.trim()}
                className="flex-1 rounded-lg bg-white py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-40 hover:bg-zinc-100"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === "barriers" && (
          <div className="space-y-6">
            <BarrierForm barriers={barriers} onChange={setBarriers} />

            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-1">
                Available tools and resources
              </label>
              <textarea
                value={availableTools}
                onChange={(e) => setAvailableTools(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none resize-none"
                placeholder="What do you already have access to?"
              />
            </div>

            {deconstructError && (
              <p className="rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
                {deconstructError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("done")}
                className="rounded-lg border border-zinc-600 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Back
              </button>
              <button
                type="button"
                onClick={submitBarriers}
                className="flex-1 rounded-lg bg-white py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
              >
                Analyze Skill
              </button>
            </div>
          </div>
        )}

        {step === "deconstructing" && (
          <div className="text-center py-16 space-y-4">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <p className="text-white font-medium">{PROGRESS_STEPS[progressStep]}</p>
            <div className="flex gap-1 justify-center">
              {PROGRESS_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 w-6 rounded-full transition-colors duration-500 ${i <= progressStep ? "bg-white" : "bg-zinc-700"}`}
                />
              ))}
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              {subskills.length} subskills identified. Reorder if needed, then confirm.
            </p>

            <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {subskills.map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3"
                >
                  <div className="flex flex-col gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => moveSubskill(i, -1)}
                      disabled={i === 0}
                      className="text-zinc-500 hover:text-white disabled:opacity-20 leading-none"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSubskill(i, 1)}
                      disabled={i === subskills.length - 1}
                      className="text-zinc-500 hover:text-white disabled:opacity-20 leading-none"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium text-white text-sm">{s.name}</span>
                      <PriorityBadge priority={s.priority as 1|2|3} />
                      <PhaseBadge phase={s.week_phase as import("../../types").WeekPhase} />
                    </div>
                    <p className="text-xs text-zinc-400">{s.description}</p>
                    {s.needs_resource && (
                      <p className="mt-1 text-xs text-amber-400">
                        Needs: {s.needs_resource}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {deconstructError && (
              <p className="rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
                {deconstructError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("barriers")}
                className="rounded-lg border border-zinc-600 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Back
              </button>
              <button
                type="button"
                onClick={confirmPlan}
                className="flex-1 rounded-lg bg-white py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
              >
                Confirm Plan — Start Session 1
              </button>
            </div>
          </div>
        )}

        {step === "confirming" && (
          <div className="text-center py-16 space-y-4">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <p className="text-zinc-400">Writing plan to database...</p>
          </div>
        )}
      </div>
    </div>
  );
}
