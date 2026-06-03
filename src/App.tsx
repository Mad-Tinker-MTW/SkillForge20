import { useEffect, useRef, useState, useCallback } from "react";
import { FirstRunWizard } from "./components/wizard/FirstRunWizard";
import { TopBar } from "./components/layout/TopBar";
import { TodayTab } from "./components/today/TodayTab";
import { PlanTab } from "./components/plan/PlanTab";
import { LogTab } from "./components/log/LogTab";
import { AssessTab } from "./components/assess/AssessTab";
import { useSessionToken } from "./hooks/useSessionToken";
import { api } from "./lib/api";
import type { SkillRow, SkillType } from "./types";
import { SkillProvider } from "./context/SkillContext";
import { SessionMetaPanel } from "./components/layout/SessionMetaPanel";

type View = "loading" | "wizard" | "app";

const SKILL_TYPE_DOT: Record<SkillType, string> = {
  language: "bg-blue-400",
  instrument_song: "bg-amber-400",
  skill_concept: "bg-violet-400",
  create_something: "bg-green-400",
  fix_something: "bg-orange-400",
  do_something: "bg-red-400",
};

export default function App() {
  const [view, setView] = useState<View>("loading");
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const [skills, setSkills] = useState<SkillRow[]>([]);

  function loadSkills() {
    return api.skills.list().then((list) => {
      setSkills(list);
      return list;
    });
  }

  useEffect(() => {
    loadSkills()
      .then((list) => {
        if (list.length === 0) {
          setView("wizard");
        } else {
          setActiveSkillId(list[0]!.id);
          setView("app");
        }
      })
      .catch(() => setView("wizard"));
  }, []);

  function onWizardComplete(skillId: string) {
    loadSkills();
    setActiveSkillId(skillId);
    setView("app");
  }

  function onImportComplete(skillId: string) {
    loadSkills().then(() => {
      setActiveSkillId(skillId);
      setView("app");
    });
  }

  if (view === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (view === "wizard") {
    return <FirstRunWizard onComplete={onWizardComplete} />;
  }

  return (
    <MainApp
      skills={skills}
      activeSkillId={activeSkillId}
      setActiveSkillId={setActiveSkillId}
      onNewSkill={() => setView("wizard")}
      onImportComplete={onImportComplete}
      refreshSkills={loadSkills}
    />
  );
}

function MainApp({
  skills,
  activeSkillId,
  setActiveSkillId,
  onNewSkill,
  onImportComplete,
  refreshSkills,
}: {
  skills: SkillRow[];
  activeSkillId: string | null;
  setActiveSkillId: (id: string | null) => void;
  onNewSkill: () => void;
  onImportComplete: (skillId: string) => void;
  refreshSkills: () => Promise<SkillRow[]>;
}) {
  const { token, refresh: refreshToken } = useSessionToken(activeSkillId);
  const [tab, setTab] = useState<"today" | "plan" | "log" | "assess">("today");
  const importRef = useRef<HTMLInputElement>(null);

  const RAIL_MIN = 200;
  const RAIL_MAX = 400;
  const RAIL_DEFAULT = 208;
  const [railWidth, setRailWidth] = useState(() => {
    const saved = localStorage.getItem("sf20-rail-width");
    return saved ? Math.min(RAIL_MAX, Math.max(RAIL_MIN, parseInt(saved, 10))) : RAIL_DEFAULT;
  });
  const railWidthRef = useRef(railWidth);
  useEffect(() => { railWidthRef.current = railWidth; }, [railWidth]);

  const handleRailDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = railWidthRef.current;
    function onMove(ev: MouseEvent) {
      const w = Math.min(RAIL_MAX, Math.max(RAIL_MIN, startWidth + ev.clientX - startX));
      railWidthRef.current = w;
      setRailWidth(w);
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      localStorage.setItem("sf20-rail-width", String(railWidthRef.current));
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);
  const [importing, setImporting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean | null>(null);

  const activeSkill = skills.find((s) => s.id === activeSkillId) ?? null;

  // Check API key status when settings panel opens
  useEffect(() => {
    if (!showSettings || apiKeyConfigured !== null) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: { apiKeyConfigured: boolean }) => setApiKeyConfigured(d.apiKeyConfigured))
      .catch(() => setApiKeyConfigured(false));
  }, [showSettings, apiKeyConfigured]);

  async function deleteSkill(skillId: string, skillName: string) {
    if (!confirm(`Delete "${skillName}" and all its sessions? This cannot be undone.`)) return;
    await fetch(`/api/skills/${skillId}`, { method: "DELETE" });
    const updated = await refreshSkills();
    if (activeSkillId === skillId) {
      setActiveSkillId(updated[0]?.id ?? null);
      if (updated.length === 0) onNewSkill();
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data: unknown = JSON.parse(text);
      const result = await api.export.import(data);
      onImportComplete(result.skillId);
    } catch {
      // silent — LogTab shows its own error
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  }

  return (
    <SkillProvider skillId={activeSkillId}>
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white">
      {/* TopBar — always present, skeleton when token not yet loaded */}
      {token ? (
        <TopBar token={token} />
      ) : (
        <header className="flex items-center gap-4 border-b border-zinc-800 bg-zinc-950 px-5 py-2.5 h-[45px]">
          <div className="h-4 w-40 rounded bg-zinc-800 animate-pulse" />
          <div className="h-4 w-16 rounded bg-zinc-800 animate-pulse" />
          <div className="h-4 w-16 rounded bg-zinc-800 animate-pulse" />
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left rail */}
        <aside
          className="relative border-r border-zinc-800 flex flex-col p-3 gap-1 shrink-0"
          style={{ width: railWidth }}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-600 px-2 mb-1">
            Skills
          </div>
          {skills.map((s) => (
            <div key={s.id} className="group relative flex items-center">
              <button
                type="button"
                onClick={() => { setActiveSkillId(s.id); setTab("today"); }}
                className={`flex flex-1 items-start gap-2 rounded-lg px-3 py-2 text-left text-sm min-w-0 transition-colors ${
                  activeSkillId === s.id
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <span className={`shrink-0 mt-0.5 h-2 w-2 rounded-full ${SKILL_TYPE_DOT[s.type] ?? "bg-zinc-500"}`} />
                <span className="break-words min-w-0">{s.name}</span>
              </button>
              <button
                type="button"
                onClick={() => deleteSkill(s.id, s.name)}
                className="absolute right-1 hidden group-hover:flex items-center justify-center h-5 w-5 rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors text-xs"
                title="Delete skill"
              >
                ✕
              </button>
            </div>
          ))}

          {/* Session meta — visible when a skill is active */}
          <SessionMetaPanel token={token} skillId={activeSkillId} />

          <div className="mt-auto flex flex-col gap-1">
            <button
              type="button"
              onClick={onNewSkill}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-left text-sm text-zinc-500 hover:text-white hover:border-zinc-500 transition-colors"
            >
              + New Skill
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              disabled={importing}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-left text-sm text-zinc-500 hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-40"
            >
              {importing ? "Importing..." : "Import Skill"}
            </button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${showSettings ? "border-zinc-500 text-white bg-zinc-800" : "border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500"}`}
            >
              Settings
            </button>

            {/* Settings panel */}
            {showSettings && (
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-xs space-y-2">
                <p className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">Settings</p>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">API Key:</span>
                  {apiKeyConfigured === null ? (
                    <span className="text-zinc-600">checking...</span>
                  ) : apiKeyConfigured ? (
                    <span className="text-green-400">✓ configured</span>
                  ) : (
                    <span className="text-red-400">✗ missing</span>
                  )}
                </div>
                {apiKeyConfigured === false && (
                  <p className="text-zinc-600 text-[10px] leading-relaxed">
                    Add ANTHROPIC_API_KEY to the .env file in the project root and restart the server.
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Version:</span>
                  <span className="text-zinc-400">SkillForge20 v1.0</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">DB:</span>
                  <span className="text-zinc-400">local SQLite</span>
                </div>
              </div>
            )}
          </div>
          {/* Drag handle */}
          <div
            onMouseDown={handleRailDragStart}
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-zinc-600 transition-colors z-10"
          />
        </aside>

        {/* Main area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-zinc-800 px-4 shrink-0">
            {(["today", "plan", "log", "assess"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm capitalize transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? "border-white text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex flex-1 overflow-hidden">
            {activeSkillId && (
              <>
                {tab === "today" && (
                  <TodayTab skillId={activeSkillId} />
                )}
                {tab === "plan" && (
                  <PlanTab skillId={activeSkillId} token={token} onNavigateToday={() => setTab("today")} />
                )}
                {tab === "log" && (
                  <LogTab
                    skillId={activeSkillId}
                    skill={activeSkill}
                    onImportComplete={(id) => { onImportComplete(id); refreshSkills(); }}
                  />
                )}
                {tab === "assess" && (
                  <AssessTab
                    skillId={activeSkillId}
                    skill={activeSkill}
                    onAssessmentSaved={refreshToken}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </SkillProvider>
  );
}
