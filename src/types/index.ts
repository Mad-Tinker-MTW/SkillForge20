export type SessionState = "idle" | "active" | "logging" | "self_correct" | "complete";

export type SkillType =
  | "language"
  | "instrument_song"
  | "skill_concept"
  | "create_something"
  | "fix_something"
  | "do_something";

export type WeekPhase =
  | "foundation"
  | "depth"
  | "stress"
  | "assess";

export interface TargetPhrase {
  native: string;
  foreign: string;
  romanized: string;
  audioUrl: string | null;
  context: string;
  stressPattern?: string;
}

export interface LanguageContext {
  targetLanguage: string;
  nativeLanguage: string;
  phrasePattern: string;
  targetPhrases: TargetPhrase[];
  practiceMode: "hear_repeat" | "pattern_drill" | "conversation_sim";
  ttsVoice: string;
}

// v2.0 per-task tracking
export interface PracticeTask {
  id: string;
  taskName: string;
  plannedMinutes: number;
  detailedInstruction: string;
}

export interface PracticeTaskResult {
  taskId: string;
  taskName: string;
  plannedMinutes: number;
  started: boolean;
  completed: boolean;
  actualMinutes: number | null;
  notes: string;
  blocker?: string;
}

export interface ExtraStep {
  id: string;
  stepName: string;
  reason: string;
  actualMinutes: number | null;
  notes: string;
  completed: boolean;
}

export interface TimeSummary {
  plannedMinutes: number;
  actualOnTasks: number;
  extraMinutes: number;
  totalActual: number;
  delta: number;
}

export interface PracticeOutput {
  completedAt: string;
  // v2.0 fields
  taskResults?: PracticeTaskResult[];
  extraSteps?: ExtraStep[];
  timeSummary?: TimeSummary;
  whatWorked: string;
  whatDidntWork: string;
  selfRating: "hit" | "partial" | "miss";
  readyToAdvance: boolean;
  proofArtifact?: string;
  // v1.0 legacy (kept for existing DB rows)
  attemptSummary?: string;
  audioAttemptUrl?: string;
}

export interface SelfCorrectResource {
  type: "example" | "rule" | "audio" | "video_timestamp" | "rewrite";
  content: string;
  url?: string;
}

export interface SelfCorrectOutput {
  completedAt: string;
  targetedIssue: string;
  correction: string;
  resources: SelfCorrectResource[];
  audioExampleUrls?: string[];
  retestRequired: boolean;
}

// Shared with server/lib/prompts.ts
export interface SubskillDraft {
  name: string;
  description: string;
  priority: 1 | 2 | 3;
  week_phase: "foundation" | "depth" | "stress" | "assess";
  needs_resource?: string;
}

export interface DeconstructResult {
  validation: {
    valid: boolean;
    floor_feedback?: string;
    ceiling_feedback?: string;
  };
  subskills: SubskillDraft[];
}

export interface PracticeContent {
  generatedAt: string;
  subskill: string;
  successCriterion: string;
  tasks: PracticeTask[];
  fullInstructions: string;
  phrases?: TargetPhrase[];
  ttsVoice?: string;
}

export interface SessionToken {
  skillId: string;
  skillName: string;
  skillType: SkillType;
  sessionNumber: number;
  weekNumber: number;
  weekPhase: WeekPhase;
  doneFloor: string;
  doneCeiling: string;
  floorCleared: boolean;
  ceilingCleared: boolean;
  subskill: string;
  subskillTarget: string;
  subskillPriority: number;
  hoursLogged: number;
  sessionBudgetMinutes: number;
  practiceOutput: PracticeOutput | null;
  selfCorrectOutput: SelfCorrectOutput | null;
  language: LanguageContext | null;
}

// DB row shapes
export interface SkillRow {
  id: string;
  name: string;
  type: SkillType;
  done_floor: string;
  done_ceiling: string;
  floor_cleared: number;
  ceiling_cleared: number;
  hours_logged: number;
  created_at: string;
  updated_at: string;
}

export interface SubskillRow {
  id: string;
  skill_id: string;
  name: string;
  description: string;
  priority: number;
  week_phase: WeekPhase;
  cleared: number;
  cleared_at: string | null;
}

export interface PlanSessionRow {
  id: string;
  skill_id: string;
  subskill_id: string;
  session_number: number;
  week_number: number;
  week_phase: WeekPhase;
  scheduled_date: string | null;
  budget_minutes: number;
  status: "planned" | "active" | "complete" | "skipped";
}

export interface AssessmentItem {
  prompt: string;
  subskill: string;
  modelAnswer: string;
  points: number;
}

export interface AssessmentContent {
  title: string;
  instructions: string;
  floorThreshold: number;
  ceilingThreshold: number;
  items: AssessmentItem[];
  scoringGuide: string;
  tooEarlyWarning?: string;
}

export interface AssessmentRow {
  id: string;
  skill_id: string;
  session_log_id: string | null;
  assessed_at: string;
  floor_result: string | null;
  ceiling_result: string | null;
  floor_passed: number | null;
  ceiling_passed: number | null;
  notes: string | null;
}

export interface PlanSessionDetail {
  id: string;
  skill_id: string;
  subskill_id: string;
  session_number: number;
  week_number: number;
  week_phase: WeekPhase;
  scheduled_date: string | null;
  budget_minutes: number;
  status: "planned" | "active" | "complete" | "skipped";
  subskill_name: string;
  subskill_priority: number;
}

export interface SessionLogRow {
  id: string;
  skill_id: string;
  plan_session_id: string | null;
  session_number: number;
  subskill: string;
  subskill_target: string;
  started_at: string;
  ended_at: string | null;
  minutes_logged: number | null;
  practice_content: string | null;
  session_state: string;
  practice_output: string | null;
  self_correct_output: string | null;
  ready_to_advance: number;
  plan_advanced: number;
  notes: string | null;
}
