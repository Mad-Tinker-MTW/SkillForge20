import { Router } from "express";
import { queryAll, queryOne, execute, transaction } from "../lib/db";
import type { SkillRow, SubskillRow, PlanSessionRow, SessionLogRow } from "../../src/types";

const router = Router();

// Export skill as downloadable JSON
router.get("/:skillId", (req, res) => {
  const skill = queryOne<SkillRow>("SELECT * FROM skills WHERE id = ?", [req.params.skillId]);
  if (!skill) return res.status(404).json({ error: "Skill not found" });

  const barriers = queryAll("SELECT * FROM barriers WHERE skill_id = ?", [req.params.skillId]);
  const subskills = queryAll<SubskillRow>("SELECT * FROM subskills WHERE skill_id = ?", [req.params.skillId]);
  const planSessions = queryAll<PlanSessionRow>("SELECT * FROM plan_sessions WHERE skill_id = ? ORDER BY session_number", [req.params.skillId]);
  const sessionLogs = queryAll<SessionLogRow>("SELECT * FROM session_logs WHERE skill_id = ? ORDER BY started_at", [req.params.skillId]);
  const assessments = queryAll("SELECT * FROM assessments WHERE skill_id = ?", [req.params.skillId]);

  const filename = `skillforge-${skill.name.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.json`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/json");
  res.json({ version: 1, exportedAt: new Date().toISOString(), skill, barriers, subskills, planSessions, sessionLogs, assessments });
});

// Import skill from JSON
router.post("/import", (req, res) => {
  const data = req.body as {
    version: number;
    skill: SkillRow;
    barriers: Array<{ id: string; skill_id: string; barrier_text: string; barrier_type: string; mitigation: string | null; resolved: number }>;
    subskills: SubskillRow[];
    planSessions: PlanSessionRow[];
    sessionLogs: SessionLogRow[];
    assessments: Array<{ id: string; skill_id: string; session_log_id: string | null; assessed_at: string; floor_result: string | null; ceiling_result: string | null; floor_passed: number | null; ceiling_passed: number | null; notes: string | null }>;
  };

  if (!data?.skill?.id || !data.version) {
    return res.status(400).json({ error: "Invalid export file — missing skill or version" });
  }

  const existing = queryOne<{ id: string }>("SELECT id FROM skills WHERE id = ?", [data.skill.id]);
  const mode = existing ? "replace" : "insert";

  transaction(() => {
    if (mode === "replace") {
      execute("DELETE FROM assessments WHERE skill_id = ?", [data.skill.id]);
      execute("DELETE FROM session_logs WHERE skill_id = ?", [data.skill.id]);
      execute("DELETE FROM plan_sessions WHERE skill_id = ?", [data.skill.id]);
      execute("DELETE FROM subskills WHERE skill_id = ?", [data.skill.id]);
      execute("DELETE FROM barriers WHERE skill_id = ?", [data.skill.id]);
      execute("DELETE FROM skills WHERE id = ?", [data.skill.id]);
    }

    execute(
      `INSERT INTO skills (id, name, type, done_floor, done_ceiling, floor_cleared, ceiling_cleared, hours_logged, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.skill.id, data.skill.name, data.skill.type, data.skill.done_floor, data.skill.done_ceiling,
       data.skill.floor_cleared ?? 0, data.skill.ceiling_cleared ?? 0, data.skill.hours_logged ?? 0,
       data.skill.created_at, data.skill.updated_at],
    );

    for (const b of data.barriers ?? []) {
      execute(
        `INSERT INTO barriers (id, skill_id, barrier_text, barrier_type, mitigation, resolved) VALUES (?, ?, ?, ?, ?, ?)`,
        [b.id, b.skill_id, b.barrier_text, b.barrier_type, b.mitigation ?? null, b.resolved ?? 0],
      );
    }

    for (const sub of data.subskills ?? []) {
      execute(
        `INSERT INTO subskills (id, skill_id, name, description, priority, week_phase, cleared, cleared_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [sub.id, sub.skill_id, sub.name, sub.description, sub.priority, sub.week_phase, sub.cleared ?? 0, sub.cleared_at ?? null],
      );
    }

    for (const ps of data.planSessions ?? []) {
      execute(
        `INSERT INTO plan_sessions (id, skill_id, subskill_id, session_number, week_number, week_phase, scheduled_date, budget_minutes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ps.id, ps.skill_id, ps.subskill_id, ps.session_number, ps.week_number, ps.week_phase, ps.scheduled_date ?? null, ps.budget_minutes, ps.status ?? "planned"],
      );
    }

    for (const sl of data.sessionLogs ?? []) {
      execute(
        `INSERT INTO session_logs (id, skill_id, plan_session_id, session_number, subskill, subskill_target, started_at, ended_at, minutes_logged, practice_output, self_correct_output, ready_to_advance, plan_advanced, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sl.id, sl.skill_id, sl.plan_session_id ?? null, sl.session_number, sl.subskill, sl.subskill_target,
         sl.started_at, sl.ended_at ?? null, sl.minutes_logged ?? null, sl.practice_output ?? null,
         sl.self_correct_output ?? null, sl.ready_to_advance ?? 0, sl.plan_advanced ?? 0, sl.notes ?? null],
      );
    }

    for (const a of data.assessments ?? []) {
      execute(
        `INSERT INTO assessments (id, skill_id, session_log_id, assessed_at, floor_result, ceiling_result, floor_passed, ceiling_passed, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.id, a.skill_id, a.session_log_id ?? null, a.assessed_at,
         a.floor_result ?? null, a.ceiling_result ?? null, a.floor_passed ?? null, a.ceiling_passed ?? null, a.notes ?? null],
      );
    }
  });

  res.json({ ok: true, mode, skillId: data.skill.id, skillName: data.skill.name });
});

export default router;
