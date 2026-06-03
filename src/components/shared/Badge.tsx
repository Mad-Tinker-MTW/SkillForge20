import type { SkillType, WeekPhase } from "../../types";

const SKILL_COLORS: Record<SkillType, string> = {
  language: "bg-blue-900 text-blue-200 border-blue-700",
  instrument_song: "bg-amber-900 text-amber-200 border-amber-700",
  skill_concept: "bg-violet-900 text-violet-200 border-violet-700",
  create_something: "bg-green-900 text-green-200 border-green-700",
  fix_something: "bg-orange-900 text-orange-200 border-orange-700",
  do_something: "bg-red-900 text-red-200 border-red-700",
};

const SKILL_LABELS: Record<SkillType, string> = {
  language: "Language",
  instrument_song: "Instrument/Song",
  skill_concept: "Skill/Concept",
  create_something: "Create",
  fix_something: "Fix",
  do_something: "Do",
};

const PHASE_COLORS: Record<WeekPhase, string> = {
  foundation: "bg-zinc-700 text-zinc-200 border-zinc-600",
  depth: "bg-blue-900 text-blue-200 border-blue-700",
  stress: "bg-orange-900 text-orange-200 border-orange-700",
  assess: "bg-green-900 text-green-200 border-green-700",
};

export function SkillBadge({ type }: { type: SkillType }) {
  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-medium ${SKILL_COLORS[type]}`}>
      {SKILL_LABELS[type]}
    </span>
  );
}

export function PhaseBadge({ phase }: { phase: WeekPhase }) {
  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-medium capitalize ${PHASE_COLORS[phase]}`}>
      {phase}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: 1 | 2 | 3 }) {
  const labels = { 1: "Must Clear", 2: "Important", 3: "Depth" };
  const colors = {
    1: "bg-red-900 text-red-200 border-red-700",
    2: "bg-yellow-900 text-yellow-200 border-yellow-700",
    3: "bg-zinc-700 text-zinc-300 border-zinc-600",
  };
  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-medium ${colors[priority]}`}>
      P{priority} {labels[priority]}
    </span>
  );
}
