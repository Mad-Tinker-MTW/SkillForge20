import { Router } from "express";
import { randomUUID } from "crypto";
import { queryAll, queryOne, execute, transaction } from "../lib/db";
import type { SessionLogRow, PracticeOutput, PracticeContent, PlanSessionRow } from "../../src/types";

const router = Router();

// Get active session log for a skill + plan session, if one exists
router.get("/active", (req, res) => {
  const { skillId, planSessionId } = req.query as { skillId: string; planSessionId: string };

  if (!skillId || !planSessionId) {
    return res.status(400).json({ error: "skillId and planSessionId required" });
  }

  const log = queryOne<SessionLogRow>(
    `SELECT * FROM session_logs WHERE skill_id = ? AND plan_session_id = ? ORDER BY started_at DESC LIMIT 1`,
    [skillId, planSessionId],
  );

  res.json(log ?? null);
});

// Start a session — creates session_log row with started_at and frozen practice_content
router.post("/start", (req, res) => {
  try {
    const { skillId, planSessionId, practiceContent } = req.body as {
      skillId: string;
      planSessionId: string;
      practiceContent?: PracticeContent;
    };

    if (!skillId || !planSessionId) {
      return res.status(400).json({ error: "skillId and planSessionId required" });
    }

    const plan = queryOne<PlanSessionRow>(
      "SELECT id, skill_id, subskill_id, session_number, week_number, week_phase, budget_minutes, status FROM plan_sessions WHERE id = ?",
      [planSessionId],
    );
    if (!plan) return res.status(404).json({ error: "Plan session not found" });

    // Fetch subskill name and description
    const sub = queryOne<{ name: string; description: string }>(
      "SELECT name, description FROM subskills WHERE id = ?",
      [plan.subskill_id],
    );
    if (!sub) return res.status(404).json({ error: "Subskill not found" });

    const weekNumber = plan.week_number ?? 1;
    const sessionId = randomUUID();
    const now = new Date().toISOString();

    transaction(() => {
      execute(
        `INSERT INTO session_logs
         (id, skill_id, plan_session_id, session_number, week_number, subskill, subskill_target,
          started_at, ended_at, minutes_logged, practice_content, session_state,
          practice_output, self_correct_output, ready_to_advance, plan_advanced, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, 'active', NULL, NULL, 0, 0, NULL)`,
        [
          sessionId, skillId, planSessionId,
          plan.session_number, weekNumber, sub.name, sub.description,
          now,
          practiceContent ? JSON.stringify(practiceContent) : null,
        ],
      );

      // Mark plan session as active
      execute(
        "UPDATE plan_sessions SET status = 'active' WHERE id = ? AND status = 'planned'",
        [planSessionId],
      );
    });

    return res.status(201).json({ sessionId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
});

// Update session state — used for client-driven transitions (e.g. active -> logging)
router.patch("/:id/state", (req, res) => {
  const { state } = req.body as { state: string };
  const allowed = ["idle", "active", "logging", "self_correct", "complete"];
  if (!allowed.includes(state)) {
    return res.status(400).json({ error: `Invalid state: ${state}` });
  }

  const log = queryOne<SessionLogRow>(
    "SELECT id FROM session_logs WHERE id = ?",
    [req.params.id],
  );
  if (!log) return res.status(404).json({ error: "Session log not found" });

  execute("UPDATE session_logs SET session_state = ? WHERE id = ?", [state, req.params.id]);
  res.json({ ok: true });
});

// Save practice output — updates session_log with practice result and advances state
router.patch("/:id/practice", (req, res) => {
  const { practiceOutput, minutesLogged } = req.body as {
    practiceOutput: PracticeOutput;
    minutesLogged: number;
  };

  if (!practiceOutput) return res.status(400).json({ error: "practiceOutput required" });
  if (!practiceOutput.whatDidntWork) {
    return res.status(400).json({ error: "practiceOutput.whatDidntWork is required" });
  }

  const log = queryOne<SessionLogRow>(
    "SELECT * FROM session_logs WHERE id = ?",
    [req.params.id],
  );
  if (!log) return res.status(404).json({ error: "Session log not found" });

  const now = new Date().toISOString();
  const completedOutput: PracticeOutput = { ...practiceOutput, completedAt: now };

  transaction(() => {
    execute(
      `UPDATE session_logs
       SET practice_output = ?, ended_at = ?, minutes_logged = ?, ready_to_advance = ?,
           session_state = 'self_correct'
       WHERE id = ?`,
      [
        JSON.stringify(completedOutput),
        now,
        minutesLogged ?? 0,
        completedOutput.readyToAdvance ? 1 : 0,
        req.params.id,
      ],
    );

    // Recalculate hours_logged as exact sum — never incremental
    execute(
      `UPDATE skills SET hours_logged = (
         SELECT COALESCE(SUM(minutes_logged), 0) / 60.0
         FROM session_logs
         WHERE skill_id = ? AND minutes_logged IS NOT NULL
       ), updated_at = ? WHERE id = ?`,
      [log.skill_id, now, log.skill_id],
    );
  });

  res.json({ ok: true });
});

// Save self-correct output — completes the session log entry
router.patch("/:id/self-correct", (req, res) => {
  const { selfCorrectOutput } = req.body as {
    selfCorrectOutput: import("../../src/types").SelfCorrectOutput;
  };

  if (!selfCorrectOutput) return res.status(400).json({ error: "selfCorrectOutput required" });

  const log = queryOne<SessionLogRow>(
    "SELECT * FROM session_logs WHERE id = ?",
    [req.params.id],
  );
  if (!log) return res.status(404).json({ error: "Session log not found" });

  const now = new Date().toISOString();
  const completed = { ...selfCorrectOutput, completedAt: now };

  transaction(() => {
    execute(
      "UPDATE session_logs SET self_correct_output = ?, session_state = 'complete' WHERE id = ?",
      [JSON.stringify(completed), req.params.id],
    );

    // Mark plan session complete
    if (log.plan_session_id) {
      execute(
        "UPDATE plan_sessions SET status = 'complete' WHERE id = ?",
        [log.plan_session_id],
      );
    }

    // Recalculate hours_logged as exact sum — ensures top bar is accurate after session complete
    execute(
      `UPDATE skills SET hours_logged = (
         SELECT COALESCE(SUM(minutes_logged), 0) / 60.0
         FROM session_logs
         WHERE skill_id = ? AND minutes_logged IS NOT NULL
       ), updated_at = ? WHERE id = ?`,
      [log.skill_id, now, log.skill_id],
    );
  });

  res.json({ ok: true });
});

// Plan advancement check — reads last 3 logs for current subskill
router.post("/skill/:skillId/advance", (req, res) => {
  const { confirm } = (req.body ?? {}) as { confirm?: boolean };
  const { skillId } = req.params;

  const nextPlan = queryOne<PlanSessionRow & { subskill_name: string; subskill_id: string }>(
    `SELECT ps.*, sub.name as subskill_name, ps.subskill_id
     FROM plan_sessions ps
     JOIN subskills sub ON sub.id = ps.subskill_id
     WHERE ps.skill_id = ? AND ps.status IN ('planned','active')
     ORDER BY ps.session_number ASC LIMIT 1`,
    [skillId],
  );

  if (!nextPlan) {
    return res.json({ recommendation: "done", reason: "No more sessions remaining.", subskill: null });
  }

  const recentLogs = queryAll<SessionLogRow>(
    `SELECT * FROM session_logs WHERE skill_id = ? AND subskill = ? ORDER BY started_at DESC LIMIT 3`,
    [skillId, nextPlan.subskill_name],
  );

  let readyCount = 0;
  let missCount = 0;
  for (const log of recentLogs) {
    if (log.ready_to_advance === 1) readyCount++;
    if (log.practice_output) {
      const po = JSON.parse(log.practice_output) as PracticeOutput;
      if (po.selfRating === "miss") missCount++;
    }
  }

  let recommendation: "advance" | "repeat" | "review";
  let reason: string;
  if (readyCount >= 2) {
    recommendation = "advance";
    reason = `${readyCount} of last ${recentLogs.length} sessions marked ready to advance.`;
  } else if (missCount >= 2) {
    recommendation = "review";
    reason = `${missCount} of last ${recentLogs.length} sessions rated miss. Check barriers before continuing.`;
  } else {
    recommendation = "repeat";
    reason = `Keep practicing. ${readyCount} of ${recentLogs.length} sessions ready to advance.`;
  }

  if (confirm && recommendation === "advance") {
    execute(
      `UPDATE plan_sessions SET status = 'skipped'
       WHERE skill_id = ? AND subskill_id = ? AND status = 'planned'`,
      [skillId, nextPlan.subskill_id],
    );
    return res.json({ ok: true, advanced: true, subskill: nextPlan.subskill_name });
  }

  res.json({ recommendation, reason, readyCount, missCount, subskill: nextPlan.subskill_name, sessionsChecked: recentLogs.length });
});

// Get recent session logs for a skill
router.get("/skill/:skillId", (req, res) => {
  const limit = Number(req.query["limit"] ?? 5);
  const logs = queryAll<SessionLogRow>(
    `SELECT * FROM session_logs WHERE skill_id = ? ORDER BY started_at DESC LIMIT ?`,
    [req.params.skillId, limit],
  );
  res.json(logs);
});

// Edit a session log's practice output — does not change session_state
router.patch("/:id/edit", (req, res) => {
  const { practiceOutput, minutesLogged } = req.body as {
    practiceOutput: PracticeOutput;
    minutesLogged: number;
  };

  if (!practiceOutput) return res.status(400).json({ error: "practiceOutput required" });
  if (!practiceOutput.whatDidntWork) {
    return res.status(400).json({ error: "practiceOutput.whatDidntWork is required" });
  }

  const log = queryOne<SessionLogRow>(
    "SELECT * FROM session_logs WHERE id = ?",
    [req.params.id],
  );
  if (!log) return res.status(404).json({ error: "Session log not found" });

  const now = new Date().toISOString();
  const updatedOutput: PracticeOutput = { ...practiceOutput, completedAt: practiceOutput.completedAt || now };

  transaction(() => {
    execute(
      `UPDATE session_logs
       SET practice_output = ?, minutes_logged = ?, ready_to_advance = ?
       WHERE id = ?`,
      [
        JSON.stringify(updatedOutput),
        minutesLogged ?? log.minutes_logged ?? 0,
        updatedOutput.readyToAdvance ? 1 : 0,
        req.params.id,
      ],
    );

    execute(
      `UPDATE skills SET hours_logged = (
         SELECT COALESCE(SUM(minutes_logged), 0) / 60.0
         FROM session_logs WHERE skill_id = ? AND minutes_logged IS NOT NULL
       ), updated_at = ? WHERE id = ?`,
      [log.skill_id, now, log.skill_id],
    );
  });

  res.json({ ok: true });
});

// Delete a session log and recalculate hours
router.delete("/:id", (req, res) => {
  const log = queryOne<SessionLogRow>(
    "SELECT * FROM session_logs WHERE id = ?",
    [req.params.id],
  );
  if (!log) return res.status(404).json({ error: "Session log not found" });

  const now = new Date().toISOString();

  transaction(() => {
    execute("DELETE FROM session_logs WHERE id = ?", [req.params.id]);

    execute(
      `UPDATE skills SET hours_logged = (
         SELECT COALESCE(SUM(minutes_logged), 0) / 60.0
         FROM session_logs WHERE skill_id = ? AND minutes_logged IS NOT NULL
       ), updated_at = ? WHERE id = ?`,
      [log.skill_id, now, log.skill_id],
    );
  });

  res.json({ ok: true });
});

export default router;
