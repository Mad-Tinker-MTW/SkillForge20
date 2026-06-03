import { useCallback, useEffect, useState } from "react";

type BarrierType = "physical" | "mental" | "emotional" | "logistical";

interface BarrierRow {
  id: string;
  skill_id: string;
  barrier_text: string;
  barrier_type: string;
  mitigation: string | null;
  resolved: number;
}

const BARRIER_TYPES: BarrierType[] = ["physical", "mental", "emotional", "logistical"];

const TYPE_COLOR: Record<string, string> = {
  physical:    "bg-orange-900 text-orange-300",
  mental:      "bg-violet-900 text-violet-300",
  emotional:   "bg-blue-900 text-blue-300",
  logistical:  "bg-zinc-800 text-zinc-400",
};

interface Props {
  skillId: string;
}

export function BarriersPanel({ skillId }: Props) {
  const [barriers, setBarriers] = useState<BarrierRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form state
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [newType, setNewType] = useState<BarrierType>("logistical");
  const [saving, setSaving] = useState(false);

  // Per-row mitigation draft state (local while editing)
  const [mitigationDrafts, setMitigationDrafts] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    fetch(`/api/barriers?skillId=${encodeURIComponent(skillId)}`)
      .then((r) => r.json())
      .then((rows: BarrierRow[]) => {
        setBarriers(rows);
        // Initialize drafts from DB values
        const drafts: Record<string, string> = {};
        for (const b of rows) drafts[b.id] = b.mitigation ?? "";
        setMitigationDrafts(drafts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [skillId]);

  useEffect(() => { load(); }, [load]);

  async function toggleResolved(barrier: BarrierRow) {
    const newVal = barrier.resolved ? 0 : 1;
    setBarriers((prev) =>
      prev.map((b) => (b.id === barrier.id ? { ...b, resolved: newVal } : b)),
    );
    await fetch(`/api/barriers/${barrier.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: newVal }),
    }).catch(() => {
      // revert on error
      setBarriers((prev) =>
        prev.map((b) => (b.id === barrier.id ? { ...b, resolved: barrier.resolved } : b)),
      );
    });
  }

  async function saveMitigation(barrier: BarrierRow) {
    const text = mitigationDrafts[barrier.id] ?? "";
    if (text === (barrier.mitigation ?? "")) return; // no change
    await fetch(`/api/barriers/${barrier.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mitigation: text || null }),
    })
      .then(() => {
        setBarriers((prev) =>
          prev.map((b) => (b.id === barrier.id ? { ...b, mitigation: text || null } : b)),
        );
      })
      .catch(() => {});
  }

  async function addBarrier() {
    const text = newText.trim();
    if (!text) return;
    setSaving(true);
    try {
      const res = await fetch("/api/barriers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId, text, type: newType }),
      });
      const row = (await res.json()) as BarrierRow;
      setBarriers((prev) => [...prev, row]);
      setMitigationDrafts((prev) => ({ ...prev, [row.id]: "" }));
      setNewText("");
      setNewType("logistical");
      setAdding(false);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-2">
        Barriers
      </p>

      {barriers.length === 0 && !adding && (
        <p className="text-xs text-zinc-700 py-2">No barriers logged.</p>
      )}

      <div className="space-y-2">
        {barriers.map((b) => (
          <div
            key={b.id}
            className={`rounded-lg border px-3 py-3 space-y-2 transition-colors ${
              b.resolved
                ? "border-zinc-800 bg-zinc-900/40"
                : "border-zinc-700 bg-zinc-900"
            }`}
          >
            {/* Top row: checkbox + badge + text */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={b.resolved === 1}
                onChange={() => toggleResolved(b)}
                className="mt-0.5 shrink-0 accent-green-500 cursor-pointer"
              />
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${
                  TYPE_COLOR[b.barrier_type] ?? TYPE_COLOR.logistical
                }`}
              >
                {b.barrier_type}
              </span>
              <span
                className={`text-xs leading-relaxed ${
                  b.resolved ? "line-through text-zinc-600" : "text-zinc-300"
                }`}
              >
                {b.barrier_text}
              </span>
            </div>

            {/* Mitigation field */}
            <div className="pl-5">
              <input
                type="text"
                value={mitigationDrafts[b.id] ?? ""}
                onChange={(e) =>
                  setMitigationDrafts((prev) => ({ ...prev, [b.id]: e.target.value }))
                }
                onBlur={() => saveMitigation(b)}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                placeholder="Mitigation notes..."
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add barrier form */}
      {adding ? (
        <div className="mt-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 space-y-2">
          <div className="flex gap-2">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as BarrierType)}
              className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-xs text-white focus:outline-none shrink-0"
            >
              {BARRIER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addBarrier()}
              placeholder="Describe the barrier..."
              autoFocus
              className="flex-1 rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setAdding(false); setNewText(""); }}
              className="rounded px-3 py-1 text-xs text-zinc-500 hover:text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addBarrier}
              disabled={saving || !newText.trim()}
              className="rounded bg-zinc-700 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-600 disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          + Add Barrier
        </button>
      )}
    </div>
  );
}
