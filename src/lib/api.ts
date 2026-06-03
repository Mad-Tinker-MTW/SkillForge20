import type { SkillRow, DeconstructResult, SubskillDraft, SessionToken, PracticeContent, PracticeOutput, SessionLogRow, PlanSessionRow, PlanSessionDetail } from "../types";

const BASE = "/api";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json() as T & { error?: string };
  if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText);
  return data;
}

export const api = {
  skills: {
    list: () => req<SkillRow[]>("/skills"),
    get: (id: string) =>
      req<{ skill: SkillRow; subskills: unknown[]; nextSession: unknown }>(`/skills/${id}`),
    create: (body: {
      name: string;
      type: string;
      doneFloor: string;
      doneCeiling: string;
      barriers: Array<{ text: string; type: string; mitigation?: string }>;
      sessionBudgetMinutes: number;
    }) =>
      req<SkillRow>("/skills", { method: "POST", body: JSON.stringify(body) }),
    confirmPlan: (
      id: string,
      subskills: SubskillDraft[],
      sessionBudgetMinutes: number,
    ) =>
      req<{ ok: boolean; sessionsCreated: number }>(`/skills/${id}/confirm-plan`, {
        method: "POST",
        body: JSON.stringify({ subskills, sessionBudgetMinutes }),
      }),
  },

  ai: {
    deconstruct: (body: {
      skillId: string;
      barriers: Array<{ text: string; type: string }>;
      availableTools: string;
      sessionBudgetMinutes: number;
    }) =>
      req<DeconstructResult>("/ai/deconstruct", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    generatePractice: (skillId: string, planSessionId?: string) =>
      req<PracticeContent>("/ai/generate-practice", {
        method: "POST",
        body: JSON.stringify({ skillId, planSessionId }),
      }),
  },

  sessions: {
    start: (skillId: string, planSessionId: string) =>
      req<{ sessionId: string }>("/sessions/start", {
        method: "POST",
        body: JSON.stringify({ skillId, planSessionId }),
      }),
    savePractice: (sessionId: string, practiceOutput: Omit<PracticeOutput, "completedAt">, minutesLogged: number) =>
      req<{ ok: boolean }>(`/sessions/${sessionId}/practice`, {
        method: "PATCH",
        body: JSON.stringify({ practiceOutput, minutesLogged }),
      }),
    recent: (skillId: string, limit = 5) =>
      req<SessionLogRow[]>(`/sessions/skill/${skillId}?limit=${limit}`),
  },

  plan: {
    sessions: (skillId: string) => req<PlanSessionDetail[]>(`/skills/${skillId}/plan`),
    checkAdvance: (skillId: string) =>
      req<{ recommendation: string; reason: string; subskill: string | null; readyCount: number; missCount: number; sessionsChecked: number }>(`/sessions/skill/${skillId}/advance`, { method: "POST", body: "{}" }),
    confirmAdvance: (skillId: string) =>
      req<{ ok: boolean; advanced: boolean; subskill: string }>(`/sessions/skill/${skillId}/advance`, {
        method: "POST",
        body: JSON.stringify({ confirm: true }),
      }),
  },

  export: {
    download: (skillId: string) => fetch(`${BASE}/export/${skillId}`),
    import: (data: unknown) =>
      req<{ ok: boolean; mode: string; skillId: string; skillName: string }>("/export/import", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  assessments: {
    generate: (skillId: string) =>
      req<import("../types").AssessmentContent>("/assessments/generate", {
        method: "POST",
        body: JSON.stringify({ skillId }),
      }),
    submit: (
      skillId: string,
      body: {
        itemScores: Array<{ prompt: string; subskill: string; score: number; maxPoints: number }>;
        totalScore: number;
        floorPassed: boolean;
        ceilingPassed: boolean;
      },
    ) =>
      req<{ ok: boolean; assessmentId: string; floorPassed: boolean; ceilingPassed: boolean }>(
        `/assessments/${skillId}`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    list: (skillId: string) =>
      req<import("../types").AssessmentRow[]>(`/assessments/${skillId}`),
  },

  token: (skillId: string) => req<SessionToken>(`/skills/${skillId}/token`),
};
