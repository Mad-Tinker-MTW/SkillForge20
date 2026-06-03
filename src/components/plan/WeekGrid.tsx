import type { PlanSessionDetail } from "../../types";
import { SessionSlot } from "./SessionSlot";

interface Props {
  sessions: PlanSessionDetail[];
  currentWeek: number;
  onNavigateToday: () => void;
}

const phaseLabel: Record<number, string> = {
  1: "Foundation", 2: "Foundation",
  3: "Depth", 4: "Depth",
  5: "Stress", 6: "Stress",
  7: "Assess",
};

const phaseColor: Record<number, string> = {
  1: "text-violet-400", 2: "text-violet-400",
  3: "text-blue-400", 4: "text-blue-400",
  5: "text-amber-400", 6: "text-amber-400",
  7: "text-green-400",
};

export function WeekGrid({ sessions, currentWeek, onNavigateToday }: Props) {
  const weeks = Array.from({ length: 7 }, (_, i) => i + 1);

  return (
    <div className="space-y-2">
      {weeks.map((weekNum) => {
        const weekSessions = sessions.filter((s) => s.week_number === weekNum);
        const isCurrentWeek = weekNum === currentWeek;

        return (
          <div
            key={weekNum}
            className={`rounded-xl border p-3 ${isCurrentWeek ? "border-white/20 bg-zinc-800/60" : "border-zinc-800 bg-zinc-900"}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-xs font-semibold ${isCurrentWeek ? "text-white" : "text-zinc-500"}`}>
                Week {weekNum}
              </span>
              <span className={`text-xs ${phaseColor[weekNum] ?? "text-zinc-500"}`}>
                {phaseLabel[weekNum]}
              </span>
              {isCurrentWeek && (
                <span className="ml-auto text-[10px] font-semibold text-white bg-zinc-700 rounded px-1.5 py-0.5">
                  current
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {weekSessions.length > 0
                ? weekSessions.map((s) => (
                    <SessionSlot key={s.id} session={s} onNavigateToday={onNavigateToday} />
                  ))
                : Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-xs text-zinc-700">
                      —
                    </div>
                  ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
