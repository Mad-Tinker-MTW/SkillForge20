import { useState, useEffect, useCallback, useRef } from "react";
import type { SessionToken, SessionState, PracticeContent, SessionLogRow, PracticeOutput } from "../../types";
import { PracticeCard } from "./PracticeCard";
import { SelfCorrectCard } from "./SelfCorrectCard";
import { InitialReportModal } from "../shared/InitialReportModal";

interface Props {
  skillId: string;
}

interface TodayData {
  token: SessionToken;
  planSessionId: string;
  sessionLogId: string | null;
  sessionState: SessionState;
  practiceContent: PracticeContent | null;
}

const RATING_COLOR: Record<string, string> = {
  hit: "text-green-400",
  partial: "text-amber-400",
  miss: "text-red-400",
};

export function TodayTab({ skillId }: Props) {
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInitialPrompt, setShowInitialPrompt] = useState(false);

  // Resizable columns
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(35);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    function onMove(ev: MouseEvent) {
      const rect = (container as HTMLDivElement).getBoundingClientRect();
      const raw = ((ev.clientX - rect.left) / rect.width) * 100;
      const minPct = (200 / rect.width) * 100;
      setLeftPct(Math.min(45, Math.max(minPct, raw)));
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError("");

    Promise.all([
      fetch(`/api/skills/${skillId}/token`).then((r) => r.json()),
      fetch(`/api/skills/${skillId}`).then((r) => r.json()),
    ])
      .then(async ([token, detail]: [
        SessionToken & { error?: string },
        { nextSession: { id: string } | null }
      ]) => {
        if (token.error) throw new Error(token.error);
        if (!detail.nextSession) throw new Error("No active plan session.");

        const planSessionId = detail.nextSession.id;

        const log: SessionLogRow | null = await fetch(
          `/api/sessions/active?skillId=${encodeURIComponent(skillId)}&planSessionId=${encodeURIComponent(planSessionId)}`
        ).then((r) => r.json());

        setData({
          token,
          planSessionId,
          sessionLogId: log?.id ?? null,
          sessionState: (log?.session_state as SessionState) ?? "idle",
          practiceContent: log?.practice_content
            ? (JSON.parse(log.practice_content) as PracticeContent)
            : null,
        });

        // Show one-time initial report prompt on first visit after plan generation
        const flagKey = `sf20-initial-saved-${skillId}`;
        if (!localStorage.getItem(flagKey) && token.hoursLogged === 0) {
          setShowInitialPrompt(true);
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [skillId]);

  useEffect(() => { load(); }, [load]);

  function onStateChange() { load(); }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-400">{error}</p>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-400 hover:text-white hover:border-zinc-500"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { token, sessionState } = data;
  const practiceOutput = token.practiceOutput;

  return (
    <>
    {showInitialPrompt && (
      <InitialReportModal
        skillId={skillId}
        onClose={() => setShowInitialPrompt(false)}
      />
    )}
    <div ref={containerRef} className="flex flex-1 overflow-hidden">
      {/* Left column — state-driven */}
      <div
        style={{ width: `${leftPct}%` }}
        className="flex flex-col overflow-hidden shrink-0 min-w-[200px]"
      >
        {(sessionState === "idle" || sessionState === "active" || sessionState === "logging") && (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <p className="text-xs text-zinc-600 leading-relaxed">
              Complete practice to unlock self-correct
            </p>
          </div>
        )}

        {sessionState === "self_correct" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <SelfCorrectCard
              token={data.token}
              sessionLogId={data.sessionLogId}
              sessionState={data.sessionState}
              onSelfCorrectSaved={onStateChange}
            />
          </div>
        )}

        {sessionState === "complete" && (
          <div className="flex flex-col flex-1 p-4 gap-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Session Complete
            </p>

            {/* Session summary */}
            <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 space-y-2 text-xs">
              <p className="font-medium text-white truncate">{token.subskill}</p>
              {practiceOutput && (
                <>
                  <p className={`font-semibold capitalize ${RATING_COLOR[practiceOutput.selfRating] ?? "text-zinc-400"}`}>
                    {practiceOutput.selfRating}
                  </p>
                  {practiceOutput.timeSummary && (
                    <p className="text-zinc-500">
                      {practiceOutput.timeSummary.totalActual}m logged
                    </p>
                  )}
                  {practiceOutput.readyToAdvance && (
                    <p className="text-green-400">↑ ready to advance</p>
                  )}
                </>
              )}
            </div>

            {/* Advance / Repeat */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={load}
                className="rounded-lg bg-white py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-100"
              >
                Continue →
              </button>
              <button
                type="button"
                onClick={load}
                className="rounded-lg border border-zinc-700 py-2 text-xs text-zinc-400 hover:text-white hover:border-zinc-500"
              >
                Repeat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={handleDragStart}
        className="w-1.5 bg-zinc-800 hover:bg-zinc-600 active:bg-zinc-500 cursor-col-resize transition-colors shrink-0 select-none"
        title="Drag to resize"
      />

      {/* Right column — practice, full height */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <PracticeCard
          token={data.token}
          planSessionId={data.planSessionId}
          sessionLogId={data.sessionLogId}
          sessionState={data.sessionState}
          practiceContent={data.practiceContent}
          onStateChange={onStateChange}
        />
      </div>
    </div>
    </>
  );
}
