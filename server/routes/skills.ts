import { Router } from "express";
import { randomUUID } from "crypto";
import { queryAll, queryOne, execute, transaction } from "../lib/db";
import type { SkillRow, SubskillRow, PlanSessionRow } from "../../src/types";
import type { SubskillDraft } from "../lib/prompts";
import { runDeconstruction } from "../lib/prompts";
import { buildSessionToken } from "../lib/token";

const router = Router();

// List all skills
router.get("/", (_req, res) => {
  const skills = queryAll<SkillRow>("SELECT * FROM skills ORDER BY created_at DESC");
  res.json(skills);
});

// Get one skill with its subskills and current plan session
router.get("/:id", (req, res) => {
  const skill = queryOne<SkillRow>("SELECT * FROM skills WHERE id = ?", [req.params.id]);
  if (!skill) return res.status(404).json({ error: "Skill not found" });

  const subskills = queryAll<SubskillRow>(
    "SELECT * FROM subskills WHERE skill_id = ? ORDER BY priority, week_phase",
    [req.params.id],
  );

  const nextSession = queryOne<PlanSessionRow>(
    `SELECT * FROM plan_sessions
     WHERE skill_id = ? AND status IN ('planned','active')
     ORDER BY session_number ASC LIMIT 1`,
    [req.params.id],
  );

  res.json({ skill, subskills, nextSession });
});

// Get session token for active plan session
router.get("/:id/token", (req, res) => {
  try {
    const token = buildSessionToken({ skillId: req.params.id });
    res.json(token);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(404).json({ error: msg });
  }
});

// Create skill + barriers (step 1 of intake)
router.post("/", (req, res) => {
  const { name, type, doneFloor, doneCeiling, barriers, sessionBudgetMinutes, startDate } =
    req.body as {
      name: string;
      type: string;
      doneFloor: string;
      doneCeiling: string;
      barriers: Array<{ text: string; type: string; mitigation?: string }>;
      sessionBudgetMinutes?: number;
      startDate?: string;
    };

  if (!name || !type || !doneFloor || !doneCeiling) {
    return res.status(400).json({ error: "name, type, doneFloor, doneCeiling required" });
  }

  const skillId = randomUUID();
  const now = new Date().toISOString();

  transaction(() => {
    execute(
      `INSERT INTO skills (id, name, type, done_floor, done_ceiling, hours_logged, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [skillId, name, type, doneFloor, doneCeiling, now, now],
    );

    for (const b of barriers ?? []) {
      execute(
        `INSERT INTO barriers (id, skill_id, barrier_text, barrier_type, mitigation, resolved)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [randomUUID(), skillId, b.text, b.type, b.mitigation ?? null],
      );
    }
  });

  const skill = queryOne<SkillRow>("SELECT * FROM skills WHERE id = ?", [skillId]);
  res.status(201).json(skill);
});

// Confirm plan: write subskills + 28 plan_sessions atomically
router.post("/:id/confirm-plan", (req, res) => {
  const skill = queryOne<SkillRow>("SELECT * FROM skills WHERE id = ?", [req.params.id]);
  if (!skill) return res.status(404).json({ error: "Skill not found" });

  const {
    subskills,
    sessionBudgetMinutes = 45,
  }: { subskills: SubskillDraft[]; sessionBudgetMinutes?: number } = req.body;

  if (!subskills || subskills.length < 6 || subskills.length > 24) {
    return res.status(400).json({ error: "subskills must have 6-24 items" });
  }

  const now = new Date().toISOString();

  transaction(() => {
    // Clear any existing plan for this skill (re-run scenario)
    execute("DELETE FROM plan_sessions WHERE skill_id = ?", [req.params.id]);
    execute("DELETE FROM subskills WHERE skill_id = ?", [req.params.id]);

    // Insert subskills in order (the client may have reordered them)
    const subskillIds: string[] = [];
    for (const sub of subskills) {
      const subId = randomUUID();
      subskillIds.push(subId);
      execute(
        `INSERT INTO subskills (id, skill_id, name, description, priority, week_phase, cleared, cleared_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, NULL)`,
        [subId, req.params.id, sub.name, sub.description, sub.priority, sub.week_phase],
      );
    }

    // Build 4 assess subskills and 28 plan sessions
    const assessRefs = insertAssessSubskills(req.params.id, skill.done_floor, skill.done_ceiling);
    const allRefs = [
      ...subskills.map((s, i) => ({ id: subskillIds[i]!, week_phase: s.week_phase, priority: s.priority })),
      ...assessRefs,
    ];
    const sessions = distributeSessions(allRefs, sessionBudgetMinutes, req.params.id);

    for (const s of sessions) {
      execute(
        `INSERT INTO plan_sessions
         (id, skill_id, subskill_id, session_number, week_number, week_phase, scheduled_date, budget_minutes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned')`,
        [
          s.id, s.skill_id, s.subskill_id,
          s.session_number, s.week_number, s.week_phase,
          s.scheduled_date, s.budget_minutes,
        ],
      );
    }

    execute("UPDATE skills SET updated_at = ? WHERE id = ?", [now, req.params.id]);
  });

  const plan = queryAll<PlanSessionRow>(
    "SELECT * FROM plan_sessions WHERE skill_id = ? ORDER BY session_number",
    [req.params.id],
  );

  res.json({ ok: true, sessionsCreated: plan.length });
});

// Delete a skill and all its related data
router.delete("/:id", (req, res) => {
  const skill = queryOne<SkillRow>("SELECT * FROM skills WHERE id = ?", [req.params.id]);
  if (!skill) return res.status(404).json({ error: "Skill not found" });

  transaction(() => {
    execute("DELETE FROM assessments WHERE skill_id = ?", [req.params.id]);
    execute("DELETE FROM session_logs WHERE skill_id = ?", [req.params.id]);
    execute("DELETE FROM plan_sessions WHERE skill_id = ?", [req.params.id]);
    execute("DELETE FROM subskills WHERE skill_id = ?", [req.params.id]);
    execute("DELETE FROM barriers WHERE skill_id = ?", [req.params.id]);
    execute("DELETE FROM skills WHERE id = ?", [req.params.id]);
  });

  res.json({ ok: true });
});

// Get full plan with subskill names (for plan grid)
router.get("/:id/plan", (req, res) => {
  const sessions = queryAll<PlanSessionRow & { subskill_name: string; subskill_priority: number }>(
    `SELECT ps.*, sub.name as subskill_name, sub.priority as subskill_priority
     FROM plan_sessions ps
     JOIN subskills sub ON sub.id = ps.subskill_id
     WHERE ps.skill_id = ?
     ORDER BY ps.session_number`,
    [req.params.id],
  );
  res.json(sessions);
});

// Regenerate plan for an existing skill (fixes duplicate subskills)
router.post("/:id/regenerate-plan", async (req, res) => {
  const skill = queryOne<SkillRow>("SELECT * FROM skills WHERE id = ?", [req.params.id]);
  if (!skill) return res.status(404).json({ error: "Skill not found" });

  const firstSession = queryOne<{ budget_minutes: number }>(
    "SELECT budget_minutes FROM plan_sessions WHERE skill_id = ? LIMIT 1",
    [req.params.id],
  );
  const sessionBudgetMinutes = firstSession?.budget_minutes ?? 45;

  const barriers = queryAll<{ barrier_text: string; barrier_type: string }>(
    "SELECT barrier_text, barrier_type FROM barriers WHERE skill_id = ?",
    [req.params.id],
  );

  try {
    const result = await runDeconstruction({
      skillName: skill.name,
      skillType: skill.type,
      doneFloor: skill.done_floor,
      doneCeiling: skill.done_ceiling,
      barriers: barriers.map((b) => ({ text: b.barrier_text, type: b.barrier_type })),
      availableTools: "",
      sessionBudgetMinutes,
    });

    if (!result.validation.valid) {
      return res.status(400).json({ error: "AI validation failed — done criteria may be too vague to regenerate plan" });
    }

    const { subskills } = result;
    const now = new Date().toISOString();

    transaction(() => {
      execute("DELETE FROM plan_sessions WHERE skill_id = ?", [req.params.id]);
      execute("DELETE FROM subskills WHERE skill_id = ?", [req.params.id]);

      const subskillIds: string[] = [];
      for (const sub of subskills) {
        const subId = randomUUID();
        subskillIds.push(subId);
        execute(
          `INSERT INTO subskills (id, skill_id, name, description, priority, week_phase, cleared, cleared_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, NULL)`,
          [subId, req.params.id, sub.name, sub.description, sub.priority, sub.week_phase],
        );
      }

      const assessRefs = insertAssessSubskills(req.params.id, skill.done_floor, skill.done_ceiling);
      const allRefs = [
        ...subskills.map((s, i) => ({ id: subskillIds[i]!, week_phase: s.week_phase, priority: s.priority })),
        ...assessRefs,
      ];
      const sessions = distributeSessions(allRefs, sessionBudgetMinutes, req.params.id);

      for (const s of sessions) {
        execute(
          `INSERT INTO plan_sessions (id, skill_id, subskill_id, session_number, week_number, week_phase, scheduled_date, budget_minutes, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned')`,
          [s.id, s.skill_id, s.subskill_id, s.session_number, s.week_number, s.week_phase, s.scheduled_date, s.budget_minutes],
        );
      }

      execute("UPDATE skills SET updated_at = ? WHERE id = ?", [now, req.params.id]);
    });

    res.json({ ok: true, subskillsCreated: subskills.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// --- Plan distribution logic ---

interface SubskillRef {
  id: string;
  week_phase: string;
  priority: number;
}

// Creates 4 dedicated assessment subskills in the DB and returns their refs.
// Must be called inside an active transaction.
function insertAssessSubskills(skillId: string, doneFloor: string, doneCeiling: string): SubskillRef[] {
  const items = [
    { name: "Floor Assessment",      desc: `Evaluate performance against the floor criteria: ${doneFloor}` },
    { name: "Ceiling Assessment",    desc: `Evaluate performance against the ceiling criteria: ${doneCeiling}` },
    { name: "Weak Subskill Review",  desc: "Targeted review of the lowest-rated subskills from prior session logs" },
    { name: "Final Composite",       desc: `Produce the final artifact defined in the done floor: ${doneFloor}` },
  ];
  return items.map((item) => {
    const id = randomUUID();
    execute(
      `INSERT INTO subskills (id, skill_id, name, description, priority, week_phase, cleared, cleared_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NULL)`,
      [id, skillId, item.name, item.desc, 1, "assess"],
    );
    return { id, week_phase: "assess", priority: 1 };
  });
}

function distributeSessions(
  subskills: SubskillRef[],
  budgetMinutes: number,
  skillId: string,
): Omit<PlanSessionRow, "status">[] {
  type PhaseKey = "foundation" | "depth" | "stress" | "assess";

  const phaseRanges: Record<PhaseKey, { start: number; end: number }> = {
    foundation: { start: 1, end: 8 },
    depth: { start: 9, end: 16 },
    stress: { start: 17, end: 24 },
    assess: { start: 25, end: 28 },
  };

  const sessions: Omit<PlanSessionRow, "status">[] = [];

  for (const [phase, range] of Object.entries(phaseRanges) as [PhaseKey, { start: number; end: number }][]) {
    const count = range.end - range.start + 1;

    let pool = subskills.filter((s) => s.week_phase === phase);

    // Fallback: if nothing assigned to this phase, use priority 1 subskills
    if (pool.length === 0) {
      pool = subskills.filter((s) => s.priority === 1);
    }

    // Last fallback: use all subskills
    if (pool.length === 0) {
      pool = subskills;
    }

    for (let i = 0; i < count; i++) {
      const sessionNum = range.start + i;
      const weekNum = Math.ceil(sessionNum / 4);

      let sub: SubskillRef;
      if (i < pool.length) {
        // First pass: each subskill once in priority order
        sub = pool[i]!;
      } else {
        // Overflow: repeat priority-1 subskills only
        const p1 = pool.filter((s) => s.priority === 1);
        const overflow = p1.length > 0 ? p1 : pool;
        sub = overflow[(i - pool.length) % overflow.length]!;
      }

      sessions.push({
        id: randomUUID(),
        skill_id: skillId,
        subskill_id: sub.id,
        session_number: sessionNum,
        week_number: weekNum,
        week_phase: phase,
        scheduled_date: null,
        budget_minutes: budgetMinutes,
      });
    }
  }

  return sessions;
}

export default router;
