import { useState } from "react";
import type {
  SessionLogRow,
  PracticeOutput,
  PracticeContent,
  SelfCorrectOutput,
  SelfCorrectResource,
} from "../../types";
import { PracticeOutputForm } from "../practice/PracticeOutputForm";

interface Props {
  log: SessionLogRow;
  onChanged: () => void;
}

const RATING_COLOR: Record<string, string> = {
  hit: "text-green-400",
  partial: "text-yellow-400",
  miss: "text-red-400",
};

const RESOURCE_LABEL: Record<SelfCorrectResource["type"], string> = {
  example: "Example",
  rule: "Rule",
  audio: "Audio",
  video_timestamp: "Video",
  rewrite: "Rewrite",
};

export function SessionLogEntry({ log, onChanged }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const po = log.practice_output ? (JSON.parse(log.practice_output) as PracticeOutput) : null;
  const pc = log.practice_content ? (JSON.parse(log.practice_content) as PracticeContent) : null;
  const sc = log.self_correct_output
    ? (JSON.parse(log.self_correct_output) as SelfCorrectOutput)
    : null;

  const date = new Date(log.started_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  async function handleDelete() {
    setDeleting(true);
    setActionError("");
    try {
      const res = await fetch(`/api/sessions/${log.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error);
      }
      onChanged();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleEditSave(
    output: Omit<PracticeOutput, "completedAt">,
    minutesLogged: number,
  ) {
    setEditSaving(true);
    setActionError("");
    try {
      const res = await fetch(`/api/sessions/${log.id}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practiceOutput: output, minutesLogged }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error);
      }
      setEditing(false);
      onChanged();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 text-xs overflow-hidden">
      {/* Collapsed row — always visible */}
      <button
        type="button"
        onClick={() => { setExpanded((v) => !v); setEditing(false); setConfirmDelete(false); }}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-zinc-800/50 transition-colors text-left"
      >
        <span className="text-zinc-500 shrink-0 w-8">S{log.session_number}</span>
        <span className="font-semibold text-white flex-1 truncate">{log.subskill}</span>
        <div className="flex items-center gap-2 shrink-0">
          {po && (
            <span className={`font-semibold capitalize ${RATING_COLOR[po.selfRating] ?? "text-zinc-400"}`}>
              {po.selfRating}
            </span>
          )}
          {log.ready_to_advance === 1 && <span className="text-green-400">↑</span>}
          <span className="text-zinc-600">{date}</span>
          {log.minutes_logged !== null && (
            <span className="text-zinc-500">{log.minutes_logged}m</span>
          )}
          <span className="text-zinc-600 ml-1">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-3 space-y-4">
          {editing && pc ? (
            <>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Edit Practice Output
              </p>
              <PracticeOutputForm
                practiceContent={pc}
                saving={editSaving}
                initialOutput={po ?? undefined}
                onSave={handleEditSave}
              />
              <button
                type="button"
                onClick={() => { setEditing(false); setActionError(""); }}
                className="text-xs text-zinc-500 hover:text-white underline"
              >
                Cancel edit
              </button>
            </>
          ) : (
            <>
              {/* Practice content (read-only) */}
              {pc && (
                <section className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                    Practice Instructions
                  </p>
                  <p className="text-zinc-400">{pc.subskill}</p>
                  <p className="text-green-400">✓ {pc.successCriterion}</p>
                  <div className="space-y-0.5 mt-1">
                    {pc.tasks.map((t, i) => (
                      <div key={t.id} className="flex gap-2">
                        <span className="text-zinc-600 w-4">{i + 1}.</span>
                        <span className="text-zinc-400 flex-1">{t.taskName}</span>
                        <span className="text-zinc-600">{t.plannedMinutes}m</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Practice output */}
              {po && (
                <section className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                    Practice Output
                  </p>

                  {/* v2.0: task results table */}
                  {po.taskResults && po.taskResults.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] border-collapse">
                        <thead>
                          <tr className="text-zinc-600 border-b border-zinc-800">
                            <th className="text-left py-1 pr-2 font-medium">Task</th>
                            <th className="text-center py-1 px-1 font-medium">S</th>
                            <th className="text-center py-1 px-1 font-medium">C</th>
                            <th className="text-right py-1 px-1 font-medium">Plan</th>
                            <th className="text-right py-1 px-1 font-medium">Actual</th>
                            <th className="text-left py-1 pl-2 font-medium">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {po.taskResults.map((r) => (
                            <tr key={r.taskId} className="border-b border-zinc-800/50">
                              <td className="py-1 pr-2 text-zinc-300">{r.taskName}</td>
                              <td className="py-1 px-1 text-center">
                                {r.started ? (
                                  <span className="text-green-400">✓</span>
                                ) : (
                                  <span className="text-zinc-700">—</span>
                                )}
                              </td>
                              <td className="py-1 px-1 text-center">
                                {r.completed ? (
                                  <span className="text-green-400">✓</span>
                                ) : (
                                  <span className="text-zinc-700">—</span>
                                )}
                              </td>
                              <td className="py-1 px-1 text-right text-zinc-500">{r.plannedMinutes}m</td>
                              <td className="py-1 px-1 text-right text-zinc-300">
                                {r.actualMinutes !== null ? `${r.actualMinutes}m` : "—"}
                              </td>
                              <td className="py-1 pl-2 text-zinc-500">{r.notes || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Extra steps */}
                  {po.extraSteps && po.extraSteps.length > 0 && (
                    <div>
                      <p className="text-[10px] text-zinc-600 font-medium mb-1">Extra steps</p>
                      {po.extraSteps.map((s) => (
                        <div key={s.id} className="flex gap-2 py-0.5">
                          <span className="text-zinc-400 flex-1">{s.stepName}</span>
                          <span className="text-zinc-500">
                            {s.actualMinutes !== null ? `${s.actualMinutes}m` : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Time summary */}
                  {po.timeSummary && (
                    <div className="flex gap-3 text-zinc-500">
                      <span>Plan {po.timeSummary.plannedMinutes}m</span>
                      <span>Actual {po.timeSummary.totalActual}m</span>
                      <span
                        className={
                          po.timeSummary.delta > 5
                            ? "text-amber-400"
                            : po.timeSummary.delta < -5
                              ? "text-green-400"
                              : ""
                        }
                      >
                        Δ{po.timeSummary.delta >= 0 ? "+" : ""}
                        {po.timeSummary.delta}m
                      </span>
                    </div>
                  )}

                  <div className="space-y-1 pt-1">
                    <div>
                      <span className="text-zinc-600">Worked: </span>
                      <span className="text-zinc-300">{po.whatWorked}</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">Missed: </span>
                      <span className="text-zinc-300">{po.whatDidntWork}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`font-semibold capitalize ${RATING_COLOR[po.selfRating] ?? "text-zinc-400"}`}>
                      {po.selfRating}
                    </span>
                    {po.readyToAdvance && (
                      <span className="text-green-400">↑ ready to advance</span>
                    )}
                    {po.proofArtifact && (
                      <span className="text-zinc-500 truncate">Proof: {po.proofArtifact}</span>
                    )}
                  </div>
                </section>
              )}

              {/* Self-correct output */}
              {sc && (
                <section className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                    Self-Correct
                  </p>
                  <div className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2">
                    <p className="text-zinc-500 mb-0.5">Issue</p>
                    <p className="text-zinc-200">{sc.targetedIssue}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2">
                    <p className="text-zinc-500 mb-0.5">Correction</p>
                    <p className="text-zinc-200">{sc.correction}</p>
                  </div>
                  {sc.resources.length > 0 && (
                    <div className="space-y-1">
                      {sc.resources.map((r, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <span className="rounded bg-zinc-700 px-1 py-0.5 text-[10px] text-zinc-400 shrink-0">
                            {RESOURCE_LABEL[r.type]}
                          </span>
                          <span className="text-zinc-400">{r.content}</span>
                          {r.url && (
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 shrink-0"
                            >
                              link
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Error */}
              {actionError && (
                <p className="text-red-400">{actionError}</p>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
                {pc && po && (
                  <button
                    type="button"
                    onClick={() => { setEditing(true); setConfirmDelete(false); setActionError(""); }}
                    className="rounded border border-zinc-700 px-3 py-1 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
                  >
                    Edit
                  </button>
                )}
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="rounded border border-zinc-700 px-3 py-1 text-zinc-400 hover:text-red-400 hover:border-red-800 transition-colors"
                  >
                    Delete
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400">Delete this session?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="rounded border border-red-800 px-3 py-1 text-red-400 hover:bg-red-950 disabled:opacity-40 transition-colors"
                    >
                      {deleting ? "Deleting..." : "Confirm"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="text-zinc-500 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
