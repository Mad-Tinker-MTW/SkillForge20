import { useState } from "react";

export interface Barrier {
  text: string;
  type: "physical" | "mental" | "emotional" | "logistical";
  mitigation?: string;
}

interface Props {
  barriers: Barrier[];
  onChange: (barriers: Barrier[]) => void;
}

const TYPES: Barrier["type"][] = ["physical", "mental", "emotional", "logistical"];

export function BarrierForm({ barriers, onChange }: Props) {
  const [text, setText] = useState("");
  const [type, setType] = useState<Barrier["type"]>("logistical");

  function add() {
    const t = text.trim();
    if (!t) return;
    onChange([...barriers, { text: t, type }]);
    setText("");
  }

  function remove(i: number) {
    onChange(barriers.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        What might get in the way? List real barriers. The AI will factor these into the plan.
      </p>

      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as Barrier["type"])}
          className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="flex-1 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none"
          placeholder="Describe the barrier..."
        />
        <button
          type="button"
          onClick={add}
          className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600"
        >
          Add
        </button>
      </div>

      {barriers.length > 0 && (
        <ul className="space-y-2">
          {barriers.map((b, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
            >
              <span>
                <span className="mr-2 rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400 capitalize">
                  {b.type}
                </span>
                <span className="text-zinc-200">{b.text}</span>
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-3 text-zinc-500 hover:text-red-400"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
