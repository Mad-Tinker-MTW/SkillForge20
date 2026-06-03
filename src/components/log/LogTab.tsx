import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionLogRow, SkillRow } from "../../types";
import { HoursProgress } from "./HoursProgress";
import { SessionHistory } from "./SessionHistory";
import { BarriersPanel } from "./BarriersPanel";
import { useSkill } from "../../context/SkillContext";

interface Props {
  skillId: string;
  skill: SkillRow | null; // kept for App.tsx compat; context used internally
  onImportComplete: (skillId: string) => void;
}

export function LogTab({ skillId, onImportComplete }: Props) {
  const { skill, refreshSkill } = useSkill();
  const [logs, setLogs] = useState<SessionLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const refreshLogs = useCallback(() => {
    fetch(`/api/sessions/skill/${skillId}?limit=100`)
      .then((r) => r.json())
      .then((logsData: SessionLogRow[]) => {
        setLogs(logsData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [skillId]);

  // After any hours-changing operation: refresh context skill + reload log list
  const handleChanged = useCallback(async () => {
    await refreshSkill();
    refreshLogs();
  }, [refreshSkill, refreshLogs]);

  useEffect(() => {
    setLoading(true);
    refreshLogs();
  }, [refreshLogs]);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/export/${skillId}`);
      const blob = await res.blob();
      const filename = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "skillforge-export.json";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError("");

    try {
      const text = await file.text();
      const data: unknown = JSON.parse(text);
      const res = await fetch("/api/export/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json() as { ok: boolean; mode: string; skillId: string; skillName: string; error?: string };
      if (!res.ok) throw new Error(result.error ?? "Import failed");
      onImportComplete(result.skillId);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto w-full">
      {/* Hours progress — reads from SkillContext */}
      <HoursProgress hoursLogged={skill?.hours_logged ?? 0} />

      {/* Action bar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:border-zinc-500 disabled:opacity-40 transition-colors"
        >
          {exporting ? "Exporting..." : "Export JSON"}
        </button>
        <button
          type="button"
          onClick={() => importRef.current?.click()}
          disabled={importing}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:border-zinc-500 disabled:opacity-40 transition-colors"
        >
          {importing ? "Importing..." : "Import JSON"}
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
        {importError && (
          <span className="text-xs text-red-400">{importError}</span>
        )}
        <span className="ml-auto text-xs text-zinc-600">{logs.length} session{logs.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Floor / ceiling status */}
      {skill && (
        <div className="flex gap-3">
          <div className={`flex-1 rounded-xl border px-3 py-2 text-xs ${skill.floor_cleared ? "border-green-700 bg-green-950 text-green-300" : "border-zinc-800 bg-zinc-900 text-zinc-500"}`}>
            <span className="font-semibold">Floor </span>
            {skill.floor_cleared ? "✓ cleared" : "not cleared"}
          </div>
          <div className={`flex-1 rounded-xl border px-3 py-2 text-xs ${skill.ceiling_cleared ? "border-green-700 bg-green-950 text-green-300" : "border-zinc-800 bg-zinc-900 text-zinc-500"}`}>
            <span className="font-semibold">Ceiling </span>
            {skill.ceiling_cleared ? "✓ cleared" : "not cleared"}
          </div>
        </div>
      )}

      {/* Session history */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-2">
          Session History
        </p>
        {loading ? (
          <div className="text-xs text-zinc-600 py-4 text-center">Loading...</div>
        ) : (
          <SessionHistory logs={logs} onChanged={handleChanged} />
        )}
      </div>

      {/* Barriers */}
      <BarriersPanel skillId={skillId} />
    </div>
  );
}
