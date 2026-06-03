import { useState, useEffect } from "react";
import type { SessionToken, SessionState, SelfCorrectOutput, SelfCorrectResource } from "../../types";
import { Card, CardHeader, CardBody, CardFooter } from "../shared/Card";
import { useSkill } from "../../context/SkillContext";

interface Props {
  token: SessionToken;
  sessionLogId: string | null;
  sessionState: SessionState;
  onSelfCorrectSaved: () => void;
}

type Phase = "locked" | "generating" | "error" | "ready" | "saving" | "done";

const RESOURCE_LABELS: Record<SelfCorrectResource["type"], string> = {
  example: "Example",
  rule: "Rule",
  audio: "Audio",
  video_timestamp: "Video",
  rewrite: "Rewrite",
};

export function SelfCorrectCard({ token, sessionLogId, sessionState, onSelfCorrectSaved }: Props) {
  const { refreshSkill } = useSkill();
  const unlocked = sessionState === "self_correct" || sessionState === "complete";
  const alreadySaved = token.selfCorrectOutput !== null;

  const [phase, setPhase] = useState<Phase>(() => {
    if (!unlocked) return "locked";
    if (alreadySaved) return "done";
    return "generating";
  });

  const [correction, setCorrection] = useState<Omit<SelfCorrectOutput, "completedAt"> | null>(
    alreadySaved ? token.selfCorrectOutput : null,
  );
  const [genError, setGenError] = useState("");
  const [saveError, setSaveError] = useState("");

  // Auto-generate when session_state reaches 'self_correct'
  useEffect(() => {
    if (!unlocked || alreadySaved) return;

    setPhase("generating");
    fetch("/api/ai/generate-self-correct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillId: token.skillId }),
    })
      .then((r) => r.json())
      .then((data: Omit<SelfCorrectOutput, "completedAt"> & { error?: string }) => {
        if (data.error) throw new Error(data.error);
        setCorrection(data);
        setPhase("ready");
      })
      .catch((e: unknown) => {
        setGenError(e instanceof Error ? e.message : String(e));
        setPhase("error");
      });
  // Run when unlocked transitions from false → true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  async function saveSelfCorrect() {
    if (!correction || !sessionLogId) return;
    setPhase("saving");
    setSaveError("");

    try {
      const res = await fetch(`/api/sessions/${sessionLogId}/self-correct`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selfCorrectOutput: {
            ...correction,
            completedAt: new Date().toISOString(),
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error);
      }
      setPhase("done");
      await refreshSkill();
      onSelfCorrectSaved();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : String(e));
      setPhase("ready");
    }
  }

  return (
    <Card locked={!unlocked}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Self-Correct
          </span>
          {!unlocked && (
            <span className="text-xs text-zinc-600">locked</span>
          )}
          {phase === "done" && (
            <span className="text-xs text-green-400 font-medium">Session complete</span>
          )}
          {correction?.retestRequired && unlocked && (
            <span className="text-xs text-amber-400 font-medium">Retest required</span>
          )}
        </div>
      </CardHeader>

      <CardBody className="space-y-3 overflow-y-auto max-h-[420px]">
        {phase === "locked" && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <span className="text-3xl">🔒</span>
            <p className="text-sm text-zinc-500">
              Save your practice output to unlock targeted self-correction.
            </p>
          </div>
        )}

        {phase === "generating" && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <p className="text-xs text-zinc-500">Generating targeted correction...</p>
            {token.practiceOutput && (
              <p className="text-xs text-zinc-600 max-w-xs text-center italic">
                "{token.practiceOutput.whatDidntWork}"
              </p>
            )}
          </div>
        )}

        {phase === "error" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-300">
              {genError}
            </div>
            <button
              type="button"
              onClick={() => {
                setGenError("");
                setPhase("generating");
              }}
              className="text-xs text-zinc-400 hover:text-white underline"
            >
              Retry
            </button>
          </div>
        )}

        {(phase === "ready" || phase === "saving" || phase === "done") && correction && (
          <>
            {/* Targeted issue — must reference whatDidntWork */}
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">
              <p className="text-xs font-semibold text-zinc-400 mb-1">Issue identified</p>
              <p className="text-sm text-zinc-200">{correction.targetedIssue}</p>
            </div>

            {/* The correction */}
            <div className="rounded-lg border border-white/10 bg-zinc-800/50 px-3 py-3">
              <p className="text-xs font-semibold text-zinc-400 mb-1.5">Correction</p>
              <p className="text-sm text-white leading-relaxed">{correction.correction}</p>
            </div>

            {/* Resources */}
            {correction.resources.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Resources
                </p>
                {correction.resources.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs"
                  >
                    <span className="mr-2 rounded bg-zinc-700 px-1.5 py-0.5 text-zinc-400 capitalize">
                      {RESOURCE_LABELS[r.type]}
                    </span>
                    <span className="text-zinc-300">{r.content}</span>
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-400 hover:text-blue-300 underline"
                      >
                        link
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {saveError && (
              <p className="text-xs text-red-400">{saveError}</p>
            )}
          </>
        )}
      </CardBody>

      {(phase === "ready" || phase === "saving") && (
        <CardFooter>
          <button
            type="button"
            onClick={saveSelfCorrect}
            disabled={phase === "saving"}
            className="w-full rounded-lg bg-white py-2 text-sm font-semibold text-zinc-900 disabled:opacity-40 hover:bg-zinc-100"
          >
            {phase === "saving" ? "Saving..." : "Save & Complete Session"}
          </button>
        </CardFooter>
      )}

      {phase === "done" && (
        <CardFooter>
          <p className="text-center text-xs text-green-400 font-medium py-0.5">
            Session complete — plan advanced
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
