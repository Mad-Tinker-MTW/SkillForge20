import { Router } from "express";
import { queryOne } from "../lib/db";
import { runDeconstruction, runPracticeGeneration, runSelfCorrectGeneration } from "../lib/prompts";
import { buildSessionToken } from "../lib/token";
import type { SkillRow } from "../../src/types";

const router = Router();

// Run deconstruction for a skill
// Returns subskill draft for user review — does NOT write to DB
router.post("/deconstruct", async (req, res) => {
  const { skillId, availableTools } = req.body as {
    skillId: string;
    availableTools?: string;
  };

  if (!skillId) return res.status(400).json({ error: "skillId required" });

  const skill = queryOne<SkillRow>("SELECT * FROM skills WHERE id = ?", [skillId]);
  if (!skill) return res.status(404).json({ error: "Skill not found" });

  const barriers = (req.body.barriers ?? []) as Array<{ text: string; type: string }>;

  try {
    const result = await runDeconstruction({
      skillName: skill.name,
      skillType: skill.type,
      doneFloor: skill.done_floor,
      doneCeiling: skill.done_ceiling,
      barriers,
      availableTools: availableTools ?? "",
      sessionBudgetMinutes: req.body.sessionBudgetMinutes ?? 45,
    });

    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// Generate practice content for the current session
// Returns ephemeral content — not written to DB
router.post("/generate-practice", async (req, res) => {
  const { skillId, planSessionId } = req.body as {
    skillId: string;
    planSessionId?: string;
  };

  if (!skillId) return res.status(400).json({ error: "skillId required" });

  try {
    const token = buildSessionToken({ skillId, planSessionId });
    const content = await runPracticeGeneration(token);
    res.json(content);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// Generate self-correction for the current session
// Requires practiceOutput to already be saved in the session log
router.post("/generate-self-correct", async (req, res) => {
  const { skillId, planSessionId } = req.body as {
    skillId: string;
    planSessionId?: string;
  };

  if (!skillId) return res.status(400).json({ error: "skillId required" });

  try {
    const token = buildSessionToken({ skillId, planSessionId });

    if (!token.practiceOutput) {
      return res.status(400).json({ error: "practiceOutput must be saved before generating self-correct" });
    }
    if (!token.practiceOutput.whatDidntWork) {
      return res.status(400).json({ error: "practiceOutput.whatDidntWork is required" });
    }

    const result = await runSelfCorrectGeneration(token);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

export default router;
