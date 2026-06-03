import { Router } from "express";
import { randomUUID } from "crypto";
import { queryAll, queryOne, execute } from "../lib/db";

const router = Router();

interface BarrierRow {
  id: string;
  skill_id: string;
  barrier_text: string;
  barrier_type: string;
  mitigation: string | null;
  resolved: number;
}

// List barriers for a skill
router.get("/", (req, res) => {
  const { skillId } = req.query as { skillId?: string };
  if (!skillId) return res.status(400).json({ error: "skillId required" });

  const rows = queryAll<BarrierRow>(
    "SELECT * FROM barriers WHERE skill_id = ? ORDER BY rowid ASC",
    [skillId],
  );
  res.json(rows);
});

// Update mitigation and/or resolved on an existing barrier
router.patch("/:id", (req, res) => {
  const { mitigation, resolved } = req.body as {
    mitigation?: string | null;
    resolved?: number;
  };

  const row = queryOne<BarrierRow>("SELECT * FROM barriers WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Barrier not found" });

  const newMitigation = mitigation !== undefined ? mitigation : row.mitigation;
  const newResolved = resolved !== undefined ? resolved : row.resolved;

  execute(
    "UPDATE barriers SET mitigation = ?, resolved = ? WHERE id = ?",
    [newMitigation ?? null, newResolved, req.params.id],
  );

  res.json({ ok: true });
});

// Add a new barrier to an existing skill
router.post("/", (req, res) => {
  const { skillId, text, type, mitigation } = req.body as {
    skillId: string;
    text: string;
    type: string;
    mitigation?: string;
  };

  if (!skillId || !text || !type) {
    return res.status(400).json({ error: "skillId, text, and type required" });
  }

  const id = randomUUID();
  execute(
    "INSERT INTO barriers (id, skill_id, barrier_text, barrier_type, mitigation, resolved) VALUES (?, ?, ?, ?, ?, 0)",
    [id, skillId, text.trim(), type, mitigation?.trim() ?? null],
  );

  const row = queryOne<BarrierRow>("SELECT * FROM barriers WHERE id = ?", [id]);
  res.status(201).json(row);
});

export default router;
