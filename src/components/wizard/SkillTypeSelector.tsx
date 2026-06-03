import type { SkillType } from "../../types";

const TYPES: Array<{ value: SkillType; label: string; desc: string; color: string }> = [
  { value: "language", label: "Language", desc: "Speak, read, or write in another language", color: "border-blue-600 bg-blue-950 hover:border-blue-400" },
  { value: "instrument_song", label: "Instrument / Song", desc: "Learn to play an instrument or a specific piece", color: "border-amber-600 bg-amber-950 hover:border-amber-400" },
  { value: "skill_concept", label: "Skill / Concept", desc: "Physical technique, theory, or conceptual knowledge", color: "border-violet-600 bg-violet-950 hover:border-violet-400" },
  { value: "create_something", label: "Create Something", desc: "Produce a defined artifact: poem, design, code project", color: "border-green-600 bg-green-950 hover:border-green-400" },
  { value: "fix_something", label: "Fix Something", desc: "Diagnose and repair a system, device, or process", color: "border-orange-600 bg-orange-950 hover:border-orange-400" },
  { value: "do_something", label: "Do Something", desc: "Execute a defined outcome: cook a dish, run a race", color: "border-red-600 bg-red-950 hover:border-red-400" },
];

interface Props {
  value: SkillType | "";
  onChange: (v: SkillType) => void;
}

export function SkillTypeSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {TYPES.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={`rounded-lg border-2 p-4 text-left transition-all cursor-pointer ${t.color} ${value === t.value ? "ring-2 ring-white" : ""}`}
        >
          <div className="font-semibold text-white">{t.label}</div>
          <div className="mt-1 text-sm text-zinc-400">{t.desc}</div>
        </button>
      ))}
    </div>
  );
}
