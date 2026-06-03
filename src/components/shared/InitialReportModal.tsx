import { useState } from "react";

interface Props {
  skillId: string;
  onClose: () => void;
}

export function InitialReportModal({ skillId, onClose }: Props) {
  const [saving, setSaving] = useState(false);

  const flagKey = `sf20-initial-saved-${skillId}`;

  function dismiss() {
    localStorage.setItem(flagKey, "1");
    onClose();
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/export/${skillId}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "SF20-initial.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent — user can still dismiss
    } finally {
      setSaving(false);
      dismiss();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-6 py-5 w-80 flex flex-col gap-4 shadow-xl">
        <div>
          <p className="text-sm font-semibold text-white">Your 7-week plan is ready</p>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Save your initial report now for your records.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-white py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Initial Report"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
