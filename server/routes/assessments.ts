import { Router } from "express";
import { randomUUID } from "crypto";
import { queryAll, queryOne, execute, transaction } from "../lib/db";
import { runAssessmentGeneration } from "../lib/prompts";
import type { SkillRow, SessionLogRow, AssessmentRow } from "../../src/types";

const router = Router();

// Generate assessment content via AI
router.post("/generate", async (req, res) => {
  const { skillId } = req.body as { skillId: string };
  if (!skillId) return res.status(400).json({ error: "skillId required" });

  const skill = queryOne<SkillRow>("SELECT * FROM skills WHERE id = ?", [skillId]);
  if (!skill) return res.status(404).json({ error: "Skill not found" });

  // Get all session logs to extract practiced subskills
  const logs = queryAll<SessionLogRow>(
    "SELECT DISTINCT subskill FROM session_logs WHERE skill_id = ? AND practice_output IS NOT NULL",
    [skillId],
  );
  const practicedSubskills = logs.map((l) => l.subskill);

  try {
    const content = await runAssessmentGeneration({
      skillName: skill.name,
      skillType: skill.type,
      doneFloor: skill.done_floor,
      doneCeiling: skill.done_ceiling,
      hoursLogged: skill.hours_logged,
      practicedSubskills,
    });
    res.json(content);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// Save assessment result and update floor/ceiling cleared
router.post("/:skillId", (req, res) => {
  const { skillId } = req.params;
  const { itemScores, totalScore, floorPassed, ceilingPassed, notes } = req.body as {
    itemScores: Array<{ prompt: string; subskill: string; score: number; maxPoints: number }>;
    totalScore: number;
    floorPassed: boolean;
    ceilingPassed: boolean;
    notes?: string;
  };

  const skill = queryOne<SkillRow>("SELECT * FROM skills WHERE id = ?", [skillId]);
  if (!skill) return res.status(404).json({ error: "Skill not found" });

  const now = new Date().toISOString();
  const assessmentId = randomUUID();

  transaction(() => {
    execute(
      `INSERT INTO assessments (id, skill_id, session_log_id, assessed_at, floor_result, ceiling_result, floor_passed, ceiling_passed, notes)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
      [
        assessmentId, skillId, now,
        JSON.stringify({ score: totalScore, items: itemScores }),
        JSON.stringify({ score: totalScore }),
        floorPassed ? 1 : 0,
        ceilingPassed ? 1 : 0,
        notes ?? null,
      ],
    );

    if (floorPassed && !skill.floor_cleared) {
      execute("UPDATE skills SET floor_cleared = 1, updated_at = ? WHERE id = ?", [now, skillId]);
    }
    if (ceilingPassed && !skill.ceiling_cleared) {
      execute("UPDATE skills SET ceiling_cleared = 1, updated_at = ? WHERE id = ?", [now, skillId]);
    }
  });

  res.json({ ok: true, assessmentId, floorPassed, ceilingPassed });
});

// List assessments for a skill
router.get("/:skillId", (req, res) => {
  const assessments = queryAll<AssessmentRow>(
    "SELECT * FROM assessments WHERE skill_id = ? ORDER BY assessed_at DESC",
    [req.params.skillId],
  );
  res.json(assessments);
});

export default router;
