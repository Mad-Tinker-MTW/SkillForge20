import express from "express";
import { join } from "path";
import { existsSync } from "fs";
import { getDb } from "./lib/db";
import { buildSessionToken, validateToken } from "./lib/token";
import skillsRouter from "./routes/skills";
import aiRouter from "./routes/ai";
import sessionsRouter from "./routes/sessions";
import exportRouter from "./routes/export";
import assessmentsRouter from "./routes/assessments";
import barriersRouter from "./routes/barriers";

const PORT = Number(process.env.PORT ?? 3000);
const app = express();

app.use(express.json());

// API routes
app.use("/api/skills", skillsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/export", exportRouter);
app.use("/api/assessments", assessmentsRouter);
app.use("/api/barriers", barriersRouter);

// Settings — surface API key status to frontend
app.get("/api/settings", (_req, res) => {
  res.json({ apiKeyConfigured: !!(process.env.ANTHROPIC_API_KEY) });
});

// Health check
app.get("/api/health", (_req, res) => {
  const db = getDb();
  const row = db.query("SELECT 1 AS ok").get() as { ok: number };
  res.json({ status: "ok", db: row.ok === 1 });
});

// Token test (Phase 1 acceptance — keep for debugging)
app.get("/api/token-test/:skillId", (req, res) => {
  try {
    const token = buildSessionToken({ skillId: req.params.skillId });
    validateToken(token);
    res.json({ ok: true, token });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: msg });
  }
});

// Serve built frontend in production
const distPath = join(import.meta.dir, "../dist");
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/.*/, (_req, res) => {
    res.sendFile(join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`SkillForge20 server running on port ${PORT}`);
});

export default app;
