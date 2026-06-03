import { queryOne } from "./db";
import type {
  SessionToken,
  SkillRow,
  PlanSessionRow,
  SubskillRow,
  SessionLogRow,
  WeekPhase,
  PracticeOutput,
  SelfCorrectOutput,
} from "../../src/types";

interface TokenBuildParams {
  skillId: string;
  planSessionId?: string;
}

export function buildSessionToken(params: TokenBuildParams): SessionToken {
  const { skillId, planSessionId } = params;

  const skill = queryOne<SkillRow>(
    "SELECT * FROM skills WHERE id = ?",
    [skillId]
  );
  if (!skill) throw new Error(`Skill not found: ${skillId}`);

  // Get the active or planned session
  let planSession: PlanSessionRow | null = null;
  if (planSessionId) {
    planSession = queryOne<PlanSessionRow>(
      "SELECT * FROM plan_sessions WHERE id = ?",
      [planSessionId]
    );
  } else {
    // Get next planned session
    planSession = queryOne<PlanSessionRow>(
      `SELECT * FROM plan_sessions
       WHERE skill_id = ? AND status IN ('planned','active')
       ORDER BY session_number ASC LIMIT 1`,
      [skillId]
    );
  }

  if (!planSession) throw new Error(`No active plan session for skill: ${skillId}`);

  const subskill = queryOne<SubskillRow>(
    "SELECT * FROM subskills WHERE id = ?",
    [planSession.subskill_id]
  );
  if (!subskill) throw new Error(`Subskill not found: ${planSession.subskill_id}`);

  // Get last session log for this plan session (if any)
  const lastLog = queryOne<SessionLogRow>(
    `SELECT * FROM session_logs
     WHERE plan_session_id = ?
     ORDER BY started_at DESC LIMIT 1`,
    [planSession.id]
  );

  const practiceOutput: PracticeOutput | null = lastLog?.practice_output
    ? (JSON.parse(lastLog.practice_output) as PracticeOutput)
    : null;

  const selfCorrectOutput: SelfCorrectOutput | null = lastLog?.self_correct_output
    ? (JSON.parse(lastLog.self_correct_output) as SelfCorrectOutput)
    : null;

  return {
    skillId: skill.id,
    skillName: skill.name,
    skillType: skill.type,
    sessionNumber: planSession.session_number,
    weekNumber: planSession.week_number,
    weekPhase: planSession.week_phase as WeekPhase,
    doneFloor: skill.done_floor,
    doneCeiling: skill.done_ceiling,
    floorCleared: skill.floor_cleared === 1,
    ceilingCleared: skill.ceiling_cleared === 1,
    subskill: subskill.name,
    subskillTarget: subskill.description,
    subskillPriority: subskill.priority,
    hoursLogged: skill.hours_logged,
    sessionBudgetMinutes: planSession.budget_minutes,
    practiceOutput,
    selfCorrectOutput,
    language: null, // populated by language module when skill type is "language"
  };
}

export function validateToken(token: SessionToken): void {
  if (!token.skillId) throw new Error("Token missing skillId");
  if (!token.skillName) throw new Error("Token missing skillName");
  if (!token.skillType) throw new Error("Token missing skillType");
  if (!token.subskill) throw new Error("Token missing subskill");
  if (!token.doneFloor) throw new Error("Token missing doneFloor");
  if (!token.doneCeiling) throw new Error("Token missing doneCeiling");
}
