# SkillForge20 — Roadmap

## Phase 1: Foundation
- [x] Database schema (schema.sql)
- [x] DB connection and base queries (server/lib/db.ts)
- [x] Session token builder (server/lib/token.ts)
- [x] Type definitions (src/types/index.ts)
- [x] Basic Express server with health check

## Phase 2: Intake
- [x] First run wizard (all fields, all validation)
- [x] Skill creation endpoint
- [x] Deconstruction AI call (prompts.ts + ai.ts)
- [x] Plan generation from deconstruction output
- [x] Plan written to DB atomically

## Phase 3: Today Tab Core
- [x] Session token hook (reads from DB, builds token)
- [x] Session card (reads from token)
- [x] Practice generation AI call
- [x] Practice card with content rendering
- [x] Practice output form (whatWorked + whatDidntWork required)
- [x] Save practice output to session log

## Phase 4: Self-Correct
- [x] Self-correct lock overlay (locked until practiceOutput saved)
- [x] Self-correct generation AI call (receives practiceOutput)
- [x] Self-correct card rendering
- [x] Save self-correct output to session log

## Phase 5: Audio (Language skills)
- [x] Web Speech API TTS wrapper (useAudio.ts)
- [x] AudioPhrase component with play button
- [x] RecordButton component with transcription
- [x] Audio cache check and storage
- [x] Language practice card uses audio components

## Phase 6: Plan and Log Tabs
- [x] Weekly plan grid (WeekGrid + SessionSlot)
- [x] Plan advancement logic (reads last 3 session logs)
- [x] Log tab with session history and hours progress
- [x] Export / import endpoints and UI

## Phase 7: Assessment
- [x] Assessment generation (derived from done criteria)
- [x] Assessment runner UI
- [x] Results saved, floor/ceiling flags updated
- [x] Top bar reflects cleared states

## Phase 8: Polish
- [x] Loading states for all AI generation
- [x] Error handling for failed AI calls
- [x] Top bar always visible and accurate
- [x] Left rail skill switching
- [x] Settings (API key storage, preferences)
- [x] Dark theme and skill type color system
- [x] Responsive layout check

## v2.0: Bug fixes and spec expansion (2026-05-28)
- [x] FIX 1: Schema migration — practice_content and session_state columns
- [x] FIX 2: BUG-01 — Practice content freezes at Start Session, reads from DB on return
- [x] FIX 3: BUG-03 — Session state machine in DB (idle/active/logging/self_correct/complete)
- [x] FIX 4: BUG-05 — Hours recalculate via SUM on every complete/edit/delete
- [x] FIX 5: Per-step practice output form (PracticeOutputForm, PracticeTaskRow, ExtraStepRow, TimeSummaryTable)
- [x] FIX 6: BUG-04 — Session log entries expandable, editable, deletable
- [x] FIX 7: BUG-06 — Practice card summary/full view toggle, no internal scrollbar
- [x] FIX 8: BUG-02 — Phase-bucketed deconstruction prompt, fixed distributeSessions(), Regenerate Plan button

## v2.1: Hours sync, timer removal, layout restructure (2026-05-29)
- [x] FIX 1: SkillContext — single source of truth for active skill record
- [x] FIX 2: BUG-07 — TopBar reads hours from SkillContext instead of stale token
- [x] FIX 3: BUG-07 — LogTab reads hours from SkillContext, refreshSkill after delete/edit
- [x] FIX 4: BUG-07/10 — AssessTab reads hours from SkillContext, dual-requirement warning, button always enabled
- [x] FIX 5: BUG-07 — SelfCorrectCard calls refreshSkill() after DB write completes
- [x] FIX 6: BUG-08 — Timer removed; manual actual time entry per task; Goal: Xm chips; total actual writes to minutes_logged
- [x] FIX 7: BUG-09 — Two-column resizable layout; SessionCard/SessionLogCard removed from Today tab; PracticeCard full-height right column with sticky Done button; session meta moved to left rail
- [x] FIX 8: BUG-09 — Pace indicator in left rail (on pace / ahead / behind with subtitle); reads from SkillContext

## v2.2: Assess fix, left rail polish, session data, features (2026-05-30)
- [x] BUG-11: Week 7 assess sessions hardcoded (Floor/Ceiling/Weak Review/Final Composite); insertAssessSubskills() creates proper DB rows; distributeSessions() override removed
- [x] BUG-12: Left rail skill name wraps (no truncation); Definition of Done always visible; draggable rail width with localStorage persistence
- [x] BUG-13: week_number written to session_logs from plan_sessions at session start; DB migration ALTER TABLE session_logs ADD COLUMN week_number INTEGER DEFAULT 1
- [x] FEATURE: InitialReportModal — one-time prompt after plan generation; downloads SF20-initial.json for bat processing; localStorage flag per skill ID
- [x] FEATURE: Barrier management on Log tab — BarriersPanel with resolved toggle, inline mitigation edit (saves on blur), add new barrier form; server/routes/barriers.ts with GET/PATCH/POST
- [x] BUG-FIX: /start route wrapped in try/catch; returns JSON error instead of HTML on any SQLite throw; explicit column list in plan_sessions SELECT
