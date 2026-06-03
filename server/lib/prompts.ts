import type Anthropic from "@anthropic-ai/sdk";
import { callWithTool } from "./ai";
import type { SubskillDraft, DeconstructResult, PracticeContent, PracticeTask, SelfCorrectOutput, SelfCorrectResource, SessionToken, AssessmentContent } from "../../src/types";

export type { SubskillDraft, DeconstructResult };

export interface DeconstructInput {
  skillName: string;
  skillType: string;
  doneFloor: string;
  doneCeiling: string;
  barriers: Array<{ text: string; type: string }>;
  availableTools: string;
  sessionBudgetMinutes: number;
}

const DECONSTRUCT_SYSTEM = `You are an expert skill acquisition coach using Josh Kaufman's First 20 Hours method.

Your job is to deconstruct a skill into THREE DISTINCT PHASE BUCKETS of learnable subskills.

CRITICAL RULE — PHASES MUST BE DISTINCT:
- Foundation subskills: core mechanics, setup, first principles. Learned in weeks 1-2.
- Depth subskills: NEW subskills not in foundation. Intermediate technique, nuance, context. Weeks 3-4.
- Stress subskills: NEW subskills not in foundation or depth. Advanced application under constraint. Weeks 5-6.
- NEVER repeat a subskill name across phases. Each phase must be entirely distinct.

PHASE RULES:
- foundation: 4-8 subskills. Core survival knowledge. Priority 1 items.
- depth: 4-8 NEW subskills. Not repeats of foundation. Intermediate techniques.
- stress: 4-8 NEW subskills. Not repeats of depth or foundation. Applied under constraint.
- Week 7 assess sessions are generated automatically — do NOT include them.

PRIORITY within each phase:
- 1 = Must clear (appears in done criteria, blocks everything else)
- 2 = Important (accelerates done criteria)
- 3 = Depth (enriches mastery, not required for floor)

DONE VALIDATION:
- Reject vague goals like "get better at it", "improve", "learn X"
- Accept specific, observable outcomes with a measurable threshold
- Examples of valid floors: "score 70% on a 100-question test", "write 4 haikus meeting a defined rubric", "hold a 5-minute conversation ordering food"
- Examples of invalid floors: "get better at Russian", "understand music theory", "improve my code"

DESCRIPTION: Each subskill description = what success looks like at the END of sessions that target it. One sentence, specific, behavioral.

RESOURCE FLAG: If a subskill requires a physical tool, instrument, software, or resource the user may not have, set needs_resource to describe what's needed.`;

const phaseSubskillItems = {
  type: "array" as const,
  minItems: 4,
  maxItems: 8,
  items: {
    type: "object" as const,
    properties: {
      name: { type: "string" as const },
      description: {
        type: "string" as const,
        description: "What success looks like at end of sessions targeting this subskill",
      },
      priority: { type: "number" as const, enum: [1, 2, 3] },
      needs_resource: {
        type: "string" as const,
        description: "Resource user must obtain before practicing this subskill",
      },
    },
    required: ["name", "description", "priority"],
  },
};

const deconstructTool: Anthropic.Tool = {
  name: "submit_skill_plan",
  description: "Submit the validated and deconstructed skill plan with phase-bucketed subskills",
  input_schema: {
    type: "object" as const,
    properties: {
      validation: {
        type: "object" as const,
        properties: {
          valid: {
            type: "boolean" as const,
            description: "Whether done floor and ceiling are specific and measurable",
          },
          floor_feedback: {
            type: "string" as const,
            description: "If invalid: specific reason why the floor fails and how to fix it",
          },
          ceiling_feedback: {
            type: "string" as const,
            description: "If invalid: specific reason why the ceiling fails and how to fix it",
          },
        },
        required: ["valid"],
      },
      foundation: {
        ...phaseSubskillItems,
        description: "Core mechanics subskills for weeks 1-2. Priority 1 items. 4-8 items.",
      },
      depth: {
        ...phaseSubskillItems,
        description: "Intermediate technique subskills for weeks 3-4. NEW — not repeats of foundation. 4-8 items.",
      },
      stress: {
        ...phaseSubskillItems,
        description: "Advanced application subskills for weeks 5-6. NEW — not repeats of depth or foundation. 4-8 items.",
      },
    },
    required: ["validation", "foundation", "depth", "stress"],
  },
};

// ─── Practice Generation ────────────────────────────────────────────────────

const PRACTICE_SYSTEM = `You are a skill acquisition coach using Josh Kaufman's First 20 Hours method.

Generate a specific, concrete practice activity for today's session.

RULES:
- tasks: 4-8 tasks. Total plannedMinutes across all tasks must not exceed the session budget.
- taskName: 2-5 words, action-first (e.g. "Drill chord transitions", "Write paragraph draft")
- detailedInstruction: 2-4 sentences. Exactly what to do, how to measure success for this task.
- fullInstructions: complete sequential guide as a single text block. Every task should appear here with its steps in order.
- successCriterion: observable and binary — did they do it or not
- For language skills: always include a phrase list with native, foreign, romanized, context, and stress pattern
- Phrases for language skills: 8-15 phrases minimum, each with romanization and stress marking
- No generic advice. Every instruction is a concrete action with a clear output`;

const practiceTool: Anthropic.Tool = {
  name: "submit_practice_activity",
  description: "Submit the practice activity for this session",
  input_schema: {
    type: "object" as const,
    properties: {
      subskill: { type: "string", description: "Exact subskill name from the session token" },
      successCriterion: {
        type: "string",
        description: "Observable, binary: what does it mean to have completed this session successfully?",
      },
      tasks: {
        type: "array",
        description: "4-8 tasks. Total plannedMinutes must not exceed session budget.",
        minItems: 4,
        maxItems: 8,
        items: {
          type: "object",
          properties: {
            taskName: { type: "string", description: "2-5 words, action-first" },
            plannedMinutes: { type: "number", description: "Minutes budgeted for this task" },
            detailedInstruction: {
              type: "string",
              description: "2-4 sentences: exactly what to do and how to know you did it",
            },
          },
          required: ["taskName", "plannedMinutes", "detailedInstruction"],
        },
      },
      fullInstructions: {
        type: "string",
        description: "Complete sequential guide covering all tasks in order. Markdown allowed.",
      },
      ttsVoice: {
        type: "string",
        description: "BCP-47 tag. Language skills only. e.g. 'ru-RU', 'ja-JP', 'es-ES'. Omit for non-language skills.",
      },
      phrases: {
        type: "array",
        description: "Language skills only. Omit for all other skill types.",
        items: {
          type: "object",
          properties: {
            native: { type: "string" },
            foreign: { type: "string" },
            romanized: { type: "string" },
            context: { type: "string", description: "When/why you use this phrase" },
            stressPattern: { type: "string", description: "Syllable stress markup e.g. so-BA-ka" },
            audioUrl: { type: "string", nullable: true },
          },
          required: ["native", "foreign", "romanized", "context"],
        },
      },
    },
    required: ["subskill", "successCriterion", "tasks", "fullInstructions"],
  },
};

const LANGUAGE_VOICE_MAP: Record<string, string> = {
  russian: "ru-RU", spanish: "es-ES", french: "fr-FR", german: "de-DE",
  japanese: "ja-JP", chinese: "zh-CN", mandarin: "zh-CN", italian: "it-IT",
  portuguese: "pt-BR", arabic: "ar-SA", korean: "ko-KR", dutch: "nl-NL",
  hindi: "hi-IN", polish: "pl-PL", swedish: "sv-SE", turkish: "tr-TR",
  greek: "el-GR", hebrew: "he-IL", vietnamese: "vi-VN", thai: "th-TH",
};

function inferTtsVoice(skillName: string): string {
  const lower = skillName.toLowerCase();
  for (const [lang, tag] of Object.entries(LANGUAGE_VOICE_MAP)) {
    if (lower.includes(lang)) return tag;
  }
  return "en-US";
}

export async function runPracticeGeneration(token: SessionToken): Promise<PracticeContent> {
  const isLanguage = token.skillType === "language";
  const ttsVoiceFallback = isLanguage ? inferTtsVoice(token.skillName) : undefined;

  const userMessage = `
SESSION TOKEN:
  Skill: ${token.skillName} (${token.skillType})
  Session: ${token.sessionNumber} of 28 | Week ${token.weekNumber} | Phase: ${token.weekPhase}
  Subskill: ${token.subskill}
  Target: ${token.subskillTarget}
  Priority: ${token.subskillPriority === 1 ? "Must Clear" : token.subskillPriority === 2 ? "Important" : "Depth"}
  Budget: ${token.sessionBudgetMinutes} minutes total — do not exceed this across all tasks
  Hours logged so far: ${token.hoursLogged}

DONE FLOOR: ${token.doneFloor}
DONE CEILING: ${token.doneCeiling}

Generate a practice activity specifically for "${token.subskill}" in a ${token.weekPhase} phase session.
${isLanguage ? `REQUIRED for language skills: set ttsVoice to the BCP-47 tag (e.g. "${ttsVoiceFallback}") and include a full phrase list with romanization and stress patterns.` : ""}
`.trim();

  type RawResult = Omit<PracticeContent, "generatedAt" | "tasks"> & {
    tasks: Array<Omit<PracticeTask, "id">>;
  };

  const raw = await callWithTool<RawResult>(PRACTICE_SYSTEM, userMessage, practiceTool);

  // Add server-side fields: generatedAt and task ids
  const result: PracticeContent = {
    ...raw,
    generatedAt: new Date().toISOString(),
    tasks: raw.tasks.map((t, i) => ({ ...t, id: `t${i + 1}` })),
  };

  if (isLanguage && !result.ttsVoice) {
    result.ttsVoice = ttsVoiceFallback;
  }

  return result;
}

// ─── Self-Correct Generation ─────────────────────────────────────────────────

const SELF_CORRECT_SYSTEM = `You are a skill acquisition coach using the First 20 Hours method.

Generate a targeted self-correction for a specific failure that just occurred in practice.

RULES:
- The opening line MUST quote or directly paraphrase what didn't work from the practice output
- The correction addresses ONE specific thing — the most important failure
- The correction is a concrete fix, not a reading list or general advice
- Resources are secondary: max 3, each must directly address the specific failure
- For language: if the issue is pronunciation or rhythm, include audio-level examples with stress marking
- retestRequired = true if the failure was a core subskill blocker (priority 1) and needs immediate re-test
- retestRequired = false if it's a refinement or partial miss`;

const selfCorrectTool: Anthropic.Tool = {
  name: "submit_self_correction",
  description: "Submit the targeted self-correction",
  input_schema: {
    type: "object" as const,
    properties: {
      targetedIssue: {
        type: "string",
        description: "One sentence restating what specifically didn't work, referencing the practice output",
      },
      correction: {
        type: "string",
        description: "The specific fix. Concrete action, not advice. 2-4 sentences max.",
      },
      resources: {
        type: "array",
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["example", "rule", "audio", "video_timestamp", "rewrite"],
            },
            content: { type: "string" },
            url: { type: "string" },
          },
          required: ["type", "content"],
        },
      },
      retestRequired: {
        type: "boolean",
        description: "True if the failure blocks core progress and needs immediate re-test",
      },
    },
    required: ["targetedIssue", "correction", "resources", "retestRequired"],
  },
};

export async function runSelfCorrectGeneration(token: SessionToken): Promise<Omit<SelfCorrectOutput, "completedAt">> {
  if (!token.practiceOutput) {
    throw new Error("practiceOutput is required for self-correct generation");
  }
  if (!token.practiceOutput.whatDidntWork) {
    throw new Error("practiceOutput.whatDidntWork is required");
  }

  const userMessage = `
SESSION TOKEN:
  Skill: ${token.skillName} (${token.skillType})
  Session: ${token.sessionNumber} of 28 | Week ${token.weekNumber} | Phase: ${token.weekPhase}
  Subskill: ${token.subskill}
  Target: ${token.subskillTarget}
  Priority: ${token.subskillPriority === 1 ? "Must Clear" : token.subskillPriority === 2 ? "Important" : "Depth"}

PRACTICE OUTPUT:
  What worked: ${token.practiceOutput.whatWorked}
  What didn't work: ${token.practiceOutput.whatDidntWork}
  Self-rating: ${token.practiceOutput.selfRating}
  Attempt summary: ${token.practiceOutput.attemptSummary}

DONE FLOOR: ${token.doneFloor}

Generate a targeted correction specifically for: "${token.practiceOutput.whatDidntWork}"
${token.skillType === "language" ? "Include stress-marked examples if the issue involves pronunciation or rhythm." : ""}
`.trim();

  const result = await callWithTool<Omit<SelfCorrectOutput, "completedAt">>(
    SELF_CORRECT_SYSTEM,
    userMessage,
    selfCorrectTool,
  );

  return result;
}

// ─── Assessment Generation ───────────────────────────────────────────────────

const ASSESSMENT_SYSTEM = `You are a skill acquisition coach generating a performance assessment.

The assessment MUST be derived from the done floor and ceiling criteria — not generated fresh.
Parse the floor text to extract the passing threshold (e.g. "score 70%" → floorThreshold: 70).

RULES:
- Only generate items for subskills that appear in the practiced list
- Items test whether the user can actually do what the done criteria requires
- modelAnswer: what a passing attempt looks like — specific and behavioral, not abstract
- points: always 2 (scoring: 0=miss, 1=partial, 2=hit)
- Minimum 4 items, maximum 12
- floorThreshold and ceilingThreshold are integers 0-100 derived from the done criteria text
- scoringGuide: tell the user exactly how to evaluate their own response against modelAnswer
- If hoursLogged < 10: set tooEarlyWarning to a one-sentence caution
- For language: items are phrases to say aloud, modelAnswer is the correct pronunciation + stress
- For create_something: items are creation tasks, modelAnswer is the rubric criteria
- For concept/theory: items are questions to explain cold, modelAnswer is the key points required`;

const assessmentTool: Anthropic.Tool = {
  name: "submit_assessment",
  description: "Submit the generated assessment",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string" },
      instructions: { type: "string", description: "How to complete the assessment" },
      floorThreshold: { type: "number", description: "Percentage (0-100) needed to pass the floor" },
      ceilingThreshold: { type: "number", description: "Percentage (0-100) needed to pass the ceiling" },
      items: {
        type: "array",
        minItems: 4,
        maxItems: 12,
        items: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "What the user must do or answer" },
            subskill: { type: "string", description: "Which practiced subskill this tests" },
            modelAnswer: { type: "string", description: "What a passing response looks like" },
            points: { type: "number", enum: [2], description: "Always 2 (0=miss, 1=partial, 2=hit)" },
          },
          required: ["prompt", "subskill", "modelAnswer", "points"],
        },
      },
      scoringGuide: { type: "string", description: "How to score responses against modelAnswer" },
      tooEarlyWarning: { type: "string", description: "Warning if hours < 10 (omit if hours >= 10)" },
    },
    required: ["title", "instructions", "floorThreshold", "ceilingThreshold", "items", "scoringGuide"],
  },
};

export interface AssessmentInput {
  skillName: string;
  skillType: string;
  doneFloor: string;
  doneCeiling: string;
  hoursLogged: number;
  practicedSubskills: string[];
}

export async function runAssessmentGeneration(input: AssessmentInput): Promise<AssessmentContent> {
  const userMessage = `
SKILL: ${input.skillName} (${input.skillType})
HOURS LOGGED: ${input.hoursLogged.toFixed(1)}

DONE FLOOR (minimum success):
${input.doneFloor}

DONE CEILING (aspirational success):
${input.doneCeiling}

SUBSKILLS PRACTICED SO FAR:
${input.practicedSubskills.length > 0 ? input.practicedSubskills.map((s) => `- ${s}`).join("\n") : "None yet — flag this in tooEarlyWarning"}

Generate an assessment derived strictly from the done floor and ceiling. Only test subskills from the practiced list.
`.trim();

  return callWithTool<AssessmentContent>(ASSESSMENT_SYSTEM, userMessage, assessmentTool);
}

// ─── Deconstruction ──────────────────────────────────────────────────────────

interface PhaseSubskillRaw {
  name: string;
  description: string;
  priority: 1 | 2 | 3;
  needs_resource?: string;
}

interface DeconstructRawResult {
  validation: {
    valid: boolean;
    floor_feedback?: string;
    ceiling_feedback?: string;
  };
  foundation: PhaseSubskillRaw[];
  depth: PhaseSubskillRaw[];
  stress: PhaseSubskillRaw[];
}

export async function runDeconstruction(
  input: DeconstructInput,
): Promise<DeconstructResult> {
  const userMessage = `
SKILL: ${input.skillName}
TYPE: ${input.skillType}
SESSION BUDGET: ${input.sessionBudgetMinutes} minutes per session

DONE FLOOR (minimum success):
${input.doneFloor}

DONE CEILING (aspirational success):
${input.doneCeiling}

BARRIERS IDENTIFIED:
${input.barriers.map((b) => `- [${b.type}] ${b.text}`).join("\n") || "None specified"}

AVAILABLE TOOLS/RESOURCES:
${input.availableTools || "Not specified"}

First validate the done floor and ceiling. Then deconstruct into THREE DISTINCT PHASE BUCKETS:
- foundation: weeks 1-2 core mechanics (4-8 subskills)
- depth: weeks 3-4 NEW intermediate techniques (4-8 subskills, none from foundation)
- stress: weeks 5-6 NEW advanced application (4-8 subskills, none from depth or foundation)
Work backwards from the done ceiling.
`.trim();

  const raw = await callWithTool<DeconstructRawResult>(
    DECONSTRUCT_SYSTEM,
    userMessage,
    deconstructTool,
  );

  // Flatten phase buckets into the flat SubskillDraft[] format the rest of the app expects
  const subskills: SubskillDraft[] = [
    ...(raw.foundation ?? []).map((s) => ({ ...s, week_phase: "foundation" as const })),
    ...(raw.depth ?? []).map((s) => ({ ...s, week_phase: "depth" as const })),
    ...(raw.stress ?? []).map((s) => ({ ...s, week_phase: "stress" as const })),
  ];

  return { validation: raw.validation, subskills };
}
