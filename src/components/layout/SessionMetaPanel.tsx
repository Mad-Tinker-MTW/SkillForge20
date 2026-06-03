import { useEffect, useState } from "react";
import type { SessionToken, SessionLogRow, PracticeOutput } from "../../types";
import { PhaseBadge } from "../shared/Badge";
import { ProgressBar } from "../shared/ProgressBar";
import { useSkill } from "../../context/SkillContext";

interface Props {
  token: SessionToken | null;
  skillId: string | null;
}

export function SessionMetaPanel({ token, skillId }: Props) {
  const { skill } = useSkill();
  const [lastLog, setLastLog] = useState<SessionLogRow | null>(null);

  useEffect(() => {
    if (!skillId) { setLastLog(null); return; }
    fetch(`/api/sessions/skill/${skillId}?limit=1`)
      .then((r) => r.json())
      .then((logs: SessionLogRow[]) => setLastLog(logs[0] ?? null))
      .catch(() => {});
  }, [skillId]);

  if (!token || !skill) return null;

  const hoursLogged = skill.hours_logged;

  // Pace indicator
  const weeksElapsed = Math.max(
    1,
    Math.ceil((Date.now() - new Date(skill.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000)),
  );
  const expectedHours = weeksElapsed * (20 / 7);
  const delta = hoursLogged - expectedHours;

  let paceLabel = "On pace";
  let paceColor = "text-zinc-500";
  let paceSub = "";
  if (delta > 0.5) {
    paceLabel = "Ahead";
    paceColor = "text-amber-400";
    paceSub = "spread remaining sessions";
  } else if (delta < -0.5) {
    const remainingHours = Math.max(0, 20 - hoursLogged);
    const remainingWeeks = Math.max(1, 7 - weeksElapsed);
    const sessionsLeft = Math.max(1, remainingWeeks * 4);
    const addMin = Math.ceil((remainingHours * 60) / sessionsLeft);
    paceLabel = "Behind";
    paceColor = "text-blue-400";
    paceSub = `add ${addMin}m/session to finish`;
  }

  // Last session micro-line
  let lastLine = "";
  if (lastLog) {
    const po = lastLog.practice_output
      ? (JSON.parse(lastLog.practice_output) as PracticeOutput)
      : null;
    const rating = po?.selfRating
      ? ({ hit: "Hit", partial: "Part", miss: "Miss" } as const)[po.selfRating]
      : "";
    const mins = lastLog.minutes_logged != null ? `${lastLog.minutes_logged}m` : "";
    lastLine = `Last: S${lastLog.session_number}${rating ? ` ${rating}` : ""}${mins ? ` ${mins}` : ""}`;
  }

  return (
    <div className="mt-2 border-t border-zinc-800 pt-2 px-2 space-y-2 text-xs">
      {/* Session + phase */}
      <div className="flex items-center justify-between">
        <span className="text-zinc-500">
          Session <span className="text-zinc-300 font-medium">{token.sessionNumber}</span>/28
        </span>
        <PhaseBadge phase={token.weekPhase} />
      </div>

      {/* Week */}
      <div className="text-zinc-500">
        Week <span className="text-zinc-300 font-medium">{token.weekNumber}</span> of 7
      </div>

      {/* Hours progress — from SkillContext */}
      <ProgressBar value={hoursLogged} max={20} label="Hours" />

      {/* Floor / Ceiling */}
      <div className="flex gap-3">
        <span className={token.floorCleared ? "text-green-400" : "text-zinc-600"}>
          {token.floorCleared ? "✓" : "○"} Floor
        </span>
        <span className={token.ceilingCleared ? "text-green-400" : "text-zinc-600"}>
          {token.ceilingCleared ? "✓" : "○"} Ceiling
        </span>
      </div>

      {/* Pace indicator */}
      <div>
        <span className={`font-medium ${paceColor}`}>{paceLabel}</span>
        {paceSub && <span className="text-zinc-600"> — {paceSub}</span>}
      </div>

      {/* Last session micro-line */}
      {lastLine && <div className="text-zinc-600">{lastLine}</div>}

      {/* Definition of Done */}
      <div className="border-t border-zinc-800 pt-2 space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          Definition of Done
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-600 mb-0.5">Floor</div>
          <div className="text-xs text-zinc-400 break-words leading-relaxed">{skill.done_floor}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-600 mb-0.5">Ceiling</div>
          <div className="text-xs text-zinc-400 break-words leading-relaxed">{skill.done_ceiling}</div>
        </div>
      </div>
    </div>
  );
}
