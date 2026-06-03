import { useEffect, useState } from "react";
import type { PlanSessionDetail, SessionToken } from "../../types";
import { WeekGrid } from "./WeekGrid";

interface Props {
  skillId: string;
  token: SessionToken | null;
  onNavigateToday: () => void;
}

interface AdvanceResult {
  recommendation?: "advance" | "repeat" | "review" | "done";
  reason?: string;
  subskill?: string | null;
  readyCount?: number;
  missCount?: number;
  sessionsChecked?: number;
  ok?: boolean;
  advanced?: boolean;
}

export function PlanTab({ skillId, token, onNavigateToday }: Props) {
  const [sessions, setSessions] = useState<PlanSessionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [advanceResult, setAdvanceResult] = useState<AdvanceResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/skills/${skillId}/plan`)
      .then((r) => r.json())
      .then((data: PlanSessionDetail[]) => {
        setSessions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [skillId]);

  async function checkAdvance() {
    setChecking(true);
    setAdvanceResult(null);
    try {
      const res = await fetch(`/api/sessions/skill/${skillId}/advance`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json() as AdvanceResult;
      setAdvanceResult(data);
    } finally {
      setChecking(false);
    }
  }

  async function confirmAdvance() {
    setAdvancing(true);
    try {
      const res = await fetch(`/api/sessions/skill/${skillId}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json() as AdvanceResult;
      setAdvanceResult(data);
      // Refresh plan
      const plan = await fetch(`/api/skills/${skillId}/plan`).then((r) => r.json()) as PlanSessionDetail[];
      setSessions(plan);
    } finally {
      setAdvancing(false);
    }
  }

  async function regeneratePlan() {
    setRegenerating(true);
    setRegenError("");
    try {
      const res = await fetch(`/api/skills/${skillId}/regenerate-plan`, { method: "POST" });
      const data = await res.json() as { ok: boolean; subskillsCreated?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Regeneration failed");
      const plan = await fetch(`/api/skills/${skillId}/plan`).then((r) => r.json()) as PlanSessionDetail[];
      setSessions(plan);
      setConfirmRegen(false);
    } catch (err: unknown) {
      setRegenError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  }

  const currentWeek = token?.weekNumber ?? 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">
        Loading plan...
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-600 text-sm">
        No plan sessions yet. Complete intake to generate the plan.
      </div>
    );
  }

  const advanceColor =
    advanceResult?.recommendation === "advance"
      ? "border-green-700 bg-green-950 text-green-300"
      : advanceResult?.recommendation === "review"
        ? "border-amber-700 bg-amber-950 text-amber-300"
        : "border-zinc-700 bg-zinc-800 text-zinc-300";

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto w-full">
      {/* Advancement panel */}
      <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-zinc-400 mb-1">Current subskill</p>
          <p className="text-sm font-medium text-white truncate">
            {token?.subskill ?? "—"}
          </p>
          {advanceResult && !advanceResult.advanced && (
            <div className={`mt-2 rounded-lg border px-3 py-2 text-xs ${advanceColor}`}>
              <span className="font-semibold capitalize">{advanceResult.recommendation}:</span>{" "}
              {advanceResult.reason}
            </div>
          )}
          {advanceResult?.advanced && (
            <div className="mt-2 rounded-lg border border-green-700 bg-green-950 px-3 py-2 text-xs text-green-300">
              Subskill advanced — moved to next in the plan.
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {!advanceResult || advanceResult.advanced ? (
            <button
              type="button"
              onClick={checkAdvance}
              disabled={checking}
              className="rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-600 disabled:opacity-40"
            >
              {checking ? "Checking..." : "Check Advance"}
            </button>
          ) : (
            <>
              {advanceResult.recommendation === "advance" && (
                <button
                  type="button"
                  onClick={confirmAdvance}
                  disabled={advancing}
                  className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-40"
                >
                  {advancing ? "Advancing..." : "Confirm Advance"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setAdvanceResult(null)}
                className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      </div>

      {/* Regenerate plan */}
      {!confirmRegen ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { setConfirmRegen(true); setRegenError(""); }}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 hover:text-white hover:border-zinc-500 transition-colors"
          >
            Regenerate Plan
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-700 bg-amber-950/30 p-3 space-y-2">
          <p className="text-xs text-amber-300">
            This will re-run AI deconstruction and rebuild the 28-session plan with distinct subskills per phase. Existing session logs are preserved.
          </p>
          {regenError && <p className="text-xs text-red-400">{regenError}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={regeneratePlan}
              disabled={regenerating}
              className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-40"
            >
              {regenerating ? "Regenerating..." : "Confirm Regenerate"}
            </button>
            <button
              type="button"
              onClick={() => { setConfirmRegen(false); setRegenError(""); }}
              disabled={regenerating}
              className="text-xs text-zinc-500 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Week grid */}
      <WeekGrid sessions={sessions} currentWeek={currentWeek} onNavigateToday={onNavigateToday} />
    </div>
  );
}
