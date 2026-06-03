import { useState, useEffect } from "react";
import type { SessionToken, SessionState, PracticeContent, PracticeOutput } from "../../types";
import { AudioPhrase } from "../practice/AudioPhrase";
import { PracticeOutputForm } from "../practice/PracticeOutputForm";

interface Props {
  token: SessionToken;
  planSessionId: string;
  sessionLogId: string | null;
  sessionState: SessionState;
  practiceContent: PracticeContent | null;
  onStateChange: () => void;
}

type Phase = "idle" | "generating" | "active" | "logging" | "done" | "error";

function stateToPhase(state: SessionState): Phase {
  switch (state) {
    case "idle":         return "idle";
    case "active":       return "active";
    case "logging":      return "logging";
    case "self_correct":
    case "complete":     return "done";
  }
}

export function PracticeCard({
  token,
  planSessionId,
  sessionLogId,
  sessionState,
  practiceContent,
  onStateChange,
}: Props) {
  const [phase, setPhase] = useState<Phase>(() => stateToPhase(sessionState));
  const [content, setContent] = useState<PracticeContent | null>(practiceContent);
  const [genError, setGenError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showFull, setShowFull] = useState(false);

  // Sync phase when parent reloads with new sessionState
  useEffect(() => {
    const incoming = stateToPhase(sessionState);
    if (phase !== "generating" && phase !== "error") {
      setPhase(incoming);
    }
    if (practiceContent && !content) {
      setContent(practiceContent);
    }
  }, [sessionState, practiceContent]); // eslint-disable-line react-hooks/exhaustive-deps

  async function startSession() {
    setPhase("generating");
    setGenError("");

    let generated: PracticeContent;
    try {
      const genRes = await fetch("/api/ai/generate-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId: token.skillId, planSessionId }),
      });
      const genData = await genRes.json() as PracticeContent & { error?: string };
      if (genData.error) throw new Error(genData.error);
      generated = genData;
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : String(e));
      setPhase("error");
      return;
    }

    try {
      const startRes = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId: token.skillId, planSessionId, practiceContent: generated }),
      });
      const startData = await startRes.json() as { sessionId: string; error?: string };
      if (!startRes.ok) throw new Error(startData.error ?? "Failed to start session");

      setContent(generated);
      setPhase("active");
      onStateChange();
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  async function donePracticing() {
    if (!sessionLogId) return;
    setPhase("logging");
    await fetch(`/api/sessions/${sessionLogId}/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "logging" }),
    }).catch(() => {/* non-fatal */});
  }

  async function handleSave(output: Omit<PracticeOutput, "completedAt">, minutesLogged: number) {
    if (!sessionLogId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionLogId}/practice`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practiceOutput: output, minutesLogged }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error);
      }
      onStateChange();
    } finally {
      setSaving(false);
    }
  }

  return (
    // Full-height flex column — fills the right panel. Footer is always at bottom.
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header — shrink-0 so it never scrolls away */}
      <div className="border-b border-zinc-700 px-5 py-3 shrink-0 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Practice
        </span>
        {phase === "done" && (
          <span className="text-xs text-green-400 font-medium">Saved</span>
        )}
      </div>

      {/* Body — flex-1, scrolls when content overflows (full instructions view) */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

        {phase === "generating" && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <p className="text-xs text-zinc-500">Generating practice activity...</p>
          </div>
        )}

        {phase === "error" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
              {genError}
            </div>
            <button
              type="button"
              onClick={() => { setGenError(""); setPhase("idle"); }}
              className="text-xs text-zinc-400 hover:text-white underline"
            >
              Retry
            </button>
          </div>
        )}

        {phase === "idle" && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <p className="text-sm text-zinc-400">
              Ready to practice{" "}
              <span className="text-white font-medium">{token.subskill}</span>
            </p>
            <p className="text-xs text-zinc-600">{token.sessionBudgetMinutes} min budget</p>
          </div>
        )}

        {/* Active / logging / done: show frozen practice content */}
        {(phase === "active" || phase === "logging" || phase === "done") && content && (
          <>
            {/* Subskill + success criterion */}
            <div>
              <p className="text-sm font-medium text-white">{content.subskill}</p>
              <p className="text-xs text-green-400 mt-0.5">✓ {content.successCriterion}</p>
            </div>

            {/* Summary view: task list with Goal chips — no scroll needed */}
            {phase === "active" && !showFull && (
              <>
                <div className="space-y-1.5">
                  {content.tasks.map((t, i) => (
                    <div key={t.id} className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-600 w-4 shrink-0">{i + 1}.</span>
                      <span className="text-zinc-300 flex-1">{t.taskName}</span>
                      <span className="rounded bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-500 shrink-0">
                        Goal: {t.plannedMinutes}m
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowFull(true)}
                  className="text-xs text-zinc-500 hover:text-white underline self-start"
                >
                  Show Full Instructions
                </button>
              </>
            )}

            {/* Full instructions — body scrolls, no internal max-h */}
            {phase === "active" && showFull && (
              <>
                <pre className="text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed font-sans border-t border-zinc-700 pt-3">
                  {content.fullInstructions}
                </pre>
                <button
                  type="button"
                  onClick={() => setShowFull(false)}
                  className="text-xs text-zinc-500 hover:text-white underline self-start"
                >
                  Show Summary
                </button>
              </>
            )}

            {/* Logging / done: compact task reference */}
            {(phase === "logging" || phase === "done") && (
              <div className="space-y-1">
                {content.tasks.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-600 w-4 shrink-0">{i + 1}.</span>
                    <span className="text-zinc-400 flex-1">{t.taskName}</span>
                    <span className="text-zinc-600 shrink-0">Goal: {t.plannedMinutes}m</span>
                  </div>
                ))}
              </div>
            )}

            {/* Language phrases — active phase only */}
            {content.phrases && content.phrases.length > 0 && content.ttsVoice && phase === "active" && (
              <div className="space-y-2 border-t border-zinc-700 pt-3">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Phrases — tap ▶ to hear
                </p>
                {content.phrases.map((p, i) => (
                  <AudioPhrase key={i} phrase={p} lang={content.ttsVoice!} index={i} />
                ))}
              </div>
            )}

            {/* Logging phase: practice output form */}
            {phase === "logging" && (
              <PracticeOutputForm
                practiceContent={content}
                saving={saving}
                onSave={handleSave}
              />
            )}
          </>
        )}

        {phase === "done" && (
          <p className="text-xs text-zinc-500 text-center py-2">
            Practice output saved. Self-correct unlocked.
          </p>
        )}
      </div>

      {/* Footer — shrink-0, always sticks to bottom */}
      <div className="border-t border-zinc-700 px-5 py-3 shrink-0">
        {phase === "idle" && (
          <button
            type="button"
            onClick={startSession}
            className="w-full rounded-lg bg-white py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
          >
            Start Session
          </button>
        )}
        {phase === "active" && (
          <button
            type="button"
            onClick={donePracticing}
            className="w-full rounded-lg bg-zinc-700 py-2 text-sm font-medium text-white hover:bg-zinc-600"
          >
            Done Practicing — Log Outcome
          </button>
        )}
        {phase === "generating" && (
          <div className="h-9" /> /* placeholder to keep layout stable */
        )}
        {(phase === "logging" || phase === "done") && (
          <p className="text-center text-xs text-zinc-600 py-1">
            {phase === "done" ? "Session complete" : "Fill in your outcome above"}
          </p>
        )}
      </div>
    </div>
  );
}
