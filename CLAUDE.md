# SkillForge20 — CLAUDE.md
# Build Contract v2.2
# Author: Franky (Francisco De La Paz) / Mad Tinker's Workshop
# Based on Josh Kaufman's Rapid Skill Acquisition (First 20 Hours)
# Updated: 2026-05-29 — Week 7 assess fix, left rail polish

---

## READ THIS FIRST — NEW CONVERSATION ORIENTATION

This is not the first build of SkillForge20. The app is running at
localhost:3000 with live skill data. Three build iterations have
already completed. Read this entire document before touching any code.

The codebase is at Q:\MTW\SkillForge20.
The database is at Q:\MTW\SkillForge20\data\skillforge.db.
Do NOT delete the database. Do NOT reset the schema.
Do NOT refactor working code while fixing bugs.
All fixes are surgical. Change only what the bug registry identifies.

---

## READ THIS SECOND — CONFIRMED WORKING, DO NOT TOUCH

```
CONFIRMED WORKING — DO NOT TOUCH
  Server startup and health check
  Database connection (bun:sqlite, data/skillforge.db)
  First run wizard (intake flow, all fields, validation)
  Skill creation and storage
  Deconstruction AI call with phase-bucketed subskill generation
  Plan generation with distinct subskills per phase
  Session token builder (server/lib/token.ts)
  Practice content frozen at Start Session, reads from DB on return
  Session state machine (idle/active/logging/self_correct/complete)
  Self-correct lock, generation, and unlock behavior
  Per-step practice output form with task rows and time summary
  Manual actual time entry per task, planned minutes as goalpost
  Practice card summary/full view toggle, no internal scrollbar
  Session log expandable entries with edit and delete
  SkillContext — single source of truth for active skill record
  Hours display synchronized across TopBar, LogTab, AssessTab
  refreshSkill() called on complete, edit, delete
  Two-column resizable Today tab layout
  Session meta in left rail (Session N/28, week, phase, hours, floor/ceiling)
  Pace indicator in left rail (on pace / ahead / behind)
  Last session micro-line in left rail
  Export JSON button on Log tab
  Import JSON from left rail
  Assessment generation and runner
  Assess tab dual-requirement warning
  Generate Assessment button always enabled
  Audio TTS wrapper (useAudio.ts)
  AudioPhrase and RecordButton components
  Dark theme and skill type color system
  Settings page (API key storage)
  Left rail skill switching
  Regenerate Plan button on Plan tab
```

---

## READ THIS THIRD — THE BUG REGISTRY

Two confirmed bugs as of 2026-05-29.
Fix them in the order listed in Section 9.

---

### BUG-11: Week 7 assess sessions contain foundation subskills
SEVERITY: High. Week 7 is unusable as an assessment week.

SYMPTOM:
  Sessions 25-28 (Week 7, phase = assess) show foundation
  subskill names from Week 1 instead of assessment sessions:
    S25 Workspace Setup & Navigation
    S26 Image Open, Export & Resolution Basics
    S27 Brightness, Contrast & Levels Adjustment
    S28 Crop & Resize

ROOT CAUSE:
  distributeSessions() fills sessions 25-28 by looping back
  through the subskill list when it runs out of assess-phase
  subskills. The assess phase bucket from the deconstruction
  output is either empty or being ignored entirely. The function
  falls back to foundation subskills to fill the four slots.

REQUIRED FIX:
  In the plan generation logic, detect when week_phase = assess
  and do NOT pull from the subskill list.

  Instead, hardcode 4 assessment session definitions:

    S25: Floor Assessment
         subskill: "Floor Assessment"
         subskill_target: first 100 characters of skill.done_floor
         week_phase: "assess"
         week_number: 7
         session_number: 25

    S26: Ceiling Assessment
         subskill: "Ceiling Assessment"
         subskill_target: first 100 characters of skill.done_ceiling
         week_phase: "assess"
         week_number: 7
         session_number: 26

    S27: Weak Subskill Review
         subskill: "Weak Subskill Review"
         subskill_target: "Review subskills rated miss or partial.
                           Re-practice the weakest area from the log."
         week_phase: "assess"
         week_number: 7
         session_number: 27

    S28: Final Artifact
         subskill: "Final Artifact"
         subskill_target: "Produce the artifact defined in the done
                           floor criteria. This is your assessment
                           submission."
         week_phase: "assess"
         week_number: 7
         session_number: 28

  These 4 sessions use a placeholder subskill_id that points to
  a special "Assessment" subskill row created automatically during
  plan generation. This row has:
    name: "Assessment"
    week_phase: "assess"
    priority: 1
    description: "Final assessment sessions for this skill."

  The Regenerate Plan button must trigger this updated logic.
  After Regenerate Plan runs, week 7 must show the 4 assessment
  sessions, not foundation subskill names.

FORBIDDEN:
  Do not pull foundation, depth, or stress subskills into week 7.
  Do not leave week 7 sessions empty.
  Do not require the AI to generate assess phase subskills.
  Assessment sessions are always these 4, always hardcoded.

VERIFICATION:
  Create a new skill or use Regenerate Plan on existing skill.
  Week 7 shows: Floor Assessment, Ceiling Assessment,
                Weak Subskill Review, Final Artifact.
  No foundation subskill names appear in week 7.
  Weeks 1-6 are unaffected by the change.

---

### BUG-12: Left rail skill name truncates and done criteria not visible
SEVERITY: Low. Polish issue.

SYMPTOM:
  Skill name in left rail truncates with ellipsis on one line.
  Definition of Done (floor and ceiling) is not visible anywhere
  in the left rail. User has to navigate away to see their goals.

REQUIRED FIX:
  Three changes to src/components/layout/LeftRail.tsx only.
  No other files.

  CHANGE 1: Skill name wraps instead of truncating.
    Remove overflow:hidden, whitespace:nowrap, text-overflow:ellipsis
    from the skill name element.
    Set white-space:normal. Allow natural wrap up to 2 lines.
    Do not reduce font size unless it genuinely does not fit.

  CHANGE 2: Definition of Done section always visible in left rail.
    Below the existing session meta block (Session N/28, Week,
    Hours, Floor/Ceiling status, Pace, Last session line) add:

      DEFINITION OF DONE  (label, small caps or muted text)

      Floor:
      [done_floor full text, word wrapped, text-xs]

      Ceiling:
      [done_ceiling full text, word wrapped, text-xs]

    Data comes from SkillContext.skill.done_floor and
    SkillContext.skill.done_ceiling. No new API calls.
    No new DB queries. No click handler. Always visible.
    Font size: text-xs (one step smaller than session meta).
    All text wraps. No truncation.

  CHANGE 3: Left rail width is draggable.
    Add a drag handle on the right edge of the left rail.
    Dragging resizes the left rail.
    Min width: 200px. Max width: 400px.
    Persist the chosen width in localStorage under the key
    "sf20-left-rail-width" so it survives page refresh.
    Default width: current width if no localStorage value found.

FORBIDDEN:
  Do not add a click handler or modal for this feature.
  Do not truncate any text anywhere in the left rail.
  Do not touch any component other than LeftRail.tsx.

VERIFICATION:
  Skill name with 40+ characters wraps to 2 lines, no ellipsis.
  Floor and Ceiling text fully visible in left rail, wrapped.
  Drag handle on right edge of left rail resizes it.
  Resize persists after page refresh.
  No other component was modified.

---

## 1. WHAT THIS APP IS

SkillForge20 is a personal rapid skill acquisition tracker built on
Josh Kaufman's First 20 Hours method. It deconstructs any skill into
subskills, generates a living 7-week plan, runs structured practice
sessions, generates targeted self-correction based on actual practice
output, and tracks progress toward a user-defined definition of done.

The 7-week structure is a hard requirement (professor submission).
The 20-hour threshold is a hard requirement (Kaufman method).
Both must be satisfied before assessment is considered complete.
Neither blocks the user from working. They are targets, not gates.

---

## 2. STACK — NON-NEGOTIABLE

```
FRONTEND
  Bun + Vite + React + TypeScript
  Tailwind CSS
  Web Speech API (no package needed)
  No additional UI component libraries
  No Tauri. No Electron. No Svelte.

BACKEND
  Bun + Express
  bun:sqlite (native, no external driver)
  Anthropic SDK (@anthropic-ai/sdk)
  Single entry point: server.ts

STORAGE
  SQLite database: data/skillforge.db
  Audio cache: data/audio/
  Export/Import: JSON file download and upload

PACKAGE MANAGER AND RUNTIME
  Bun only.
  No npm. No yarn. No pnpm. No Node. No Python. No uv.

COMMANDS
  Dev:   bun run dev
  Build: bun run build
  Start: bun run start
```

---

## 3. DATABASE SCHEMA

No schema changes in v2.2.
All columns from v2.0 are in place:
  session_logs.practice_content TEXT
  session_logs.session_state TEXT DEFAULT 'idle'
Do not alter schema. Do not drop tables.

---

## 4. SKILL CONTEXT

Unchanged from v2.1.
SkillContext in src/context/SkillContext.tsx provides:
  skill: Skill record
  refreshSkill: () => Promise<void>
All hours displays read from SkillContext.
All hours-changing operations call refreshSkill().

---

## 5. HARD RULES

```
RULE 1:  Practice output feeds self-correct. whatDidntWork required.
RULE 2:  Self-correct generated after practice, not at intake.
RULE 3:  Session log is source of truth. session_state drives UI.
RULE 4:  All AI calls receive the full session token.
RULE 5:  No module done until it passes end-to-end.
RULE 6:  Audio cache checked before TTS generation.
RULE 7:  Export/import always available.
RULE 8:  Practice content generated once per session at Start Session.
RULE 9:  Session state lives in the database. Tab switch never resets.
RULE 10: Hours recalculate on every complete/edit/delete.
         refreshSkill() called after every hours-changing operation.
RULE 11: SkillContext is single source of truth for skill record.
RULE 12: No automatic timer anywhere. Time is user-entered.
         Planned minutes are read-only goalposts.
RULE 13: Generate Assessment is never hard-blocked.
RULE 14: Week 7 sessions are always the 4 hardcoded assess         [NEW]
         sessions. Never foundation, depth, or stress subskills.
RULE 15: No text truncation in the left rail. Everything wraps.    [NEW]
```

---

## 6. FIX ORDER FOR THIS SESSION

Work in this exact order. Verify each fix before the next.
Do not skip. Do not refactor working code while fixing bugs.

```
FIX 1: BUG-11 — Week 7 assess sessions
  Update distributeSessions() to hardcode 4 assessment sessions
  for week_phase = assess (sessions 25-28)
  Create Assessment placeholder subskill row during plan generation
  Update Regenerate Plan to use the same logic
  Verify: new skill shows correct week 7 sessions
  Verify: Regenerate Plan on existing GIMP skill fixes week 7
  Verify: weeks 1-6 are unaffected

FIX 2: BUG-12 — Left rail polish
  Update src/components/layout/LeftRail.tsx only
  Remove truncation from skill name element
  Add Definition of Done section (floor + ceiling, always visible)
  Add drag handle on right edge with localStorage persistence
  Verify: skill name wraps, no ellipsis
  Verify: floor and ceiling text fully visible and wrapped
  Verify: drag handle resizes rail, persists on refresh
  Verify: no other file was modified
```

---

## 7. ENVIRONMENT

```
Development machine: TINKERSWORKSHOP
  Ryzen 9 9900X, RTX 4070 Ti SUPER, 128GB DDR5
  Windows 11 Pro
  Project path: Q:\MTW\SkillForge20

Runtime: Bun (latest)
API: Anthropic (key in .env, never committed)

.env required:
  ANTHROPIC_API_KEY=your_key_here
  DB_PATH=./data/skillforge.db
  AUDIO_PATH=./data/audio
  PORT=3000
```

---

## 8. BUILD HISTORY

### v1.0 (2026-05-27)
Initial build, all 8 phases. Broken: BUG-01 through BUG-06.

### v2.0 (2026-05-28)
Fixed BUG-01 through BUG-06. Added session state machine,
practice content freeze, per-step form, phase-bucketed
deconstruction, Regenerate Plan button.
Broken: BUG-07 through BUG-10.

### v2.1 (2026-05-29)
Fixed BUG-07 through BUG-10. Added SkillContext, removed timer,
added manual time entry, resizable two-column layout, session
meta in left rail, pace indicator.
Broken: BUG-11 (week 7 assess sessions), BUG-12 (left rail polish).

### v2.2 (2026-05-29)
This document. Fixes BUG-11 and BUG-12.
Hardcodes 4 assessment sessions for week 7.
Adds Definition of Done to left rail, always visible.
Removes skill name truncation in left rail.
Adds draggable left rail width with localStorage persistence.

---

*End of CLAUDE.md — SkillForge20 Build Contract v2.2*
*Mad Tinker's Workshop / 4Kings Enterprises*
*Do not modify this document during a build session.*
*All changes require a new version number and a reason.*
