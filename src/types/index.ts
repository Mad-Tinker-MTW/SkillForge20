export type Priority = 'high' | 'medium' | 'low'
export type CardStatus = 'todo' | 'inprog' | 'done'
export type Phase = 'deconstruct' | 'selfcorrect' | 'barriers' | 'practice'
export type TestMode = 'flashcard' | 'quiz' | 'fulltest' | 'review' | 'rubric'

// Assessment type detection
export type AssessmentType =
  | 'knowledge_test'
  | 'performance_skill'
  | 'build_project'
  | 'concept_understanding'
  | 'measurable_output'
  | 'hybrid'

export interface Card {
  id: string
  title: string
  note: string
  priority: Priority
  status: CardStatus
  url?: string
}

export interface Commit {
  goal: string
  endDate: string
  definition: string
  statement: string
}

// Enhanced session log entry — append only, never overwrite
export interface SessionEntry {
  id: string
  date: string
  hours: number
  note: string
  // v1.3 additions
  focus?: string
  errors?: string[]
  fixes?: string[]
  evidence?: string[]
  nextStep?: string
  rubricUpdates?: Array<{ rubricItemId: string; score: number; maxScore: number; note?: string }>
}

export type WeekTasks = Record<string, boolean>

export interface CompetencyQuestion {
  id: number
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'situational'
  question: string
  options: string[] | null
  answer: string
  explanation: string
}

export interface CompetencyTestSection {
  title: string
  questions: CompetencyQuestion[]
}

export interface CompetencyTest {
  title: string
  instructions: string
  passThreshold: number
  sections: CompetencyTestSection[]
  generatedAt: string
  assessmentType?: AssessmentType
}

// Rubric item for performance/build assessment
export interface RubricItem {
  id: string
  title: string
  maxPoints: number
  score: number
  evidenceRequired?: string
  evidence?: string
  notes?: string
}

// Performance rubric replaces 100-question quiz for non-knowledge skills
export interface PerformanceRubric {
  title: string
  instructions: string
  passThreshold: number
  assessmentType: AssessmentType
  items: RubricItem[]
  generatedAt: string
  measurementToolSuggestion?: string
}

export interface TestAttempt {
  id: string
  mode: 'quiz' | 'fulltest'
  date: string
  score: number
  total: number
  pct: number
  passed: boolean
  passThreshold: number
  durationSeconds: number
  answers: Record<number, string>
}

export interface WeeklyFocus {
  week: number
  focus: string
  goal: string
  tasks: string[]
}

export interface SkillCompetencyCard {
  question: string
  passCriteria: string
}

// Weekly snapshot data for class submission
export interface WeeklySnapshot {
  week: number
  date: string
  status: 'not_started' | 'in_progress' | 'complete'
  thisWeekFocus: string
  thisWeekDone: string[]
  thisWeekHours: number
  thisWeekPlannedHours: number
  blocker?: string
  nextWeekFocus: string
  nextWeekPlan: string[]
  rsaHoursTotal: number
  rsaHoursGoal: number
  dodScore: number
  dodTarget: number
}

export interface Skill {
  id: string
  name: string
  created: string
  commit: Commit
  weekTasks: WeekTasks
  deconstruct: Card[]
  selfcorrect: Card[]
  barriers: Card[]
  practice: Card[]
  log: SessionEntry[]
  competencyCards?: SkillCompetencyCard[]
  weeklyFocus?: WeeklyFocus[]
  generatedTest?: CompetencyTest
  performanceRubric?: PerformanceRubric
  testAttempts?: TestAttempt[]
  assessmentType?: AssessmentType
  // Weekly snapshot history
  snapshots?: WeeklySnapshot[]
  // Current week tracking
  currentWeek?: number
  currentFocus?: string
  nextFocus?: string
  mainBlocker?: string
}

export type SkillDB = Record<string, Skill>

export interface GenerateConstraints {
  hoursPerWeek: number
  experienceLevel: string
  availableTools: string
  endGoal: string
  definitionOfDone: string
}

export interface GeneratePayload {
  skillName: string
  constraints: GenerateConstraints
}

export interface GeneratedSkillData {
  skillName: string
  commit: Commit
  deconstruct: Omit<Card, 'id' | 'status'>[]
  selfcorrect: Omit<Card, 'id' | 'status'>[]
  barriers: Omit<Card, 'id' | 'status'>[]
  practice: Omit<Card, 'id' | 'status'>[]
  competencyTest: SkillCompetencyCard[]
  weeklyFocus: WeeklyFocus[]
  assessmentType: AssessmentType
}

export interface WindowAPI {
  settings: {
    getApiKey: () => Promise<string>
    setApiKey: (key: string) => Promise<boolean>
    isOnboarded: () => Promise<boolean>
    setOnboarded: () => Promise<boolean>
    clearApiKey: () => Promise<boolean>
    getZoom: () => Promise<number>
    setZoom: (zoom: number) => Promise<boolean>
  }
  skills: {
    load: () => Promise<SkillDB>
    save: (data: SkillDB) => Promise<boolean>
    getPath: () => Promise<string>
  }
  claude: {
    testKey: (key: string) => Promise<{ ok: boolean; message: string }>
    generateSkill: (payload: GeneratePayload) => Promise<{ ok: boolean; data?: GeneratedSkillData; message?: string }>
    generateTest: (payload: unknown) => Promise<{ ok: boolean; data?: CompetencyTest; message?: string }>
    generateRubric: (payload: unknown) => Promise<{ ok: boolean; data?: PerformanceRubric; message?: string }>
    detectAssessmentType: (payload: { skillName: string; definitionOfDone: string }) => Promise<{ ok: boolean; assessmentType?: string; reasoning?: string; message?: string }>
    analyzeProgress: (payload: unknown) => Promise<{ ok: boolean; analysis?: string; message?: string }>
  }
  shell: {
    openExternal: (url: string) => Promise<void>
  }
  window: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
    isMaximized: () => Promise<boolean>
    onBoundsChange: (cb: (bounds: { width: number; height: number }) => void) => void
  }
}

declare global {
  interface Window {
    api: WindowAPI
  }
}
