import type { PlanSessionDetail } from "../../types";

interface Props {
  session: PlanSessionDetail;
  onNavigateToday: () => void;
}

const statusStyles: Record<string, string> = {
  complete: "border-green-700 bg-green-950",
  active: "border-blue-600 bg-blue-950",
  skipped: "border-zinc-700 bg-zinc-900 opacity-50",
  planned: "border-zinc-700 bg-zinc-800",
};

const priorityLabel: Record<number, string> = { 1: "P1", 2: "P2", 3: "P3" };
const priorityColor: Record<number, string> = {
  1: "text-white bg-zinc-600",
  2: "text-zinc-300 bg-zinc-700",
  3: "text-zinc-500 bg-zinc-800",
};

export function SessionSlot({ session, onNavigateToday }: Props) {
  const isClickable = session.status === "planned" || session.status === "active";

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={isClickable ? onNavigateToday : undefined}
      className={`w-full rounded-lg border px-2 py-2 text-left text-xs transition-colors
        ${statusStyles[session.status] ?? statusStyles.planned}
        ${isClickable ? "hover:border-zinc-500 cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-zinc-500 shrink-0">S{session.session_number}</span>
        <span
          className={`rounded px-1 py-0.5 text-[10px] font-semibold shrink-0 ${priorityColor[session.subskill_priority] ?? priorityColor[3]}`}
        >
          {priorityLabel[session.subskill_priority] ?? "P?"}
        </span>
      </div>
      <div
        className={`truncate font-medium ${session.status === "complete" ? "text-green-300" : session.status === "active" ? "text-blue-300" : "text-zinc-300"}`}
        title={session.subskill_name}
      >
        {session.subskill_name}
      </div>
      {session.status === "complete" && (
        <div className="text-[10px] text-green-600 mt-0.5">✓ done</div>
      )}
      {session.status === "skipped" && (
        <div className="text-[10px] text-zinc-600 mt-0.5">skipped</div>
      )}
      {session.status === "active" && (
        <div className="text-[10px] text-blue-500 mt-0.5">● active</div>
      )}
    </button>
  );
}
