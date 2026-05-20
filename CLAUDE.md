# SkillForge20 — RSA Tracker
**Mad Tinker's Workshop | 4Kings Enterprises**

Repo: https://github.com/Mad-Tinker-MTW/SkillForge20
Web: madtinkersworkshop.com/skillforge20
Installer output: release/SkillForge20-Setup-{version}.exe

## What this is
Electron + React + TypeScript desktop app implementing Josh Kaufman's First 20 Hours rapid skill acquisition framework. Built as a UAT RSA class deliverable and MTW portfolio project. The user tracks a skill from commitment through 20 hours of practice, with AI-generated plans and competency assessments.

## Run commands
```powershell
npm run start        # dev mode (Vite + Electron)
npm run build        # Vite renderer build only
npm run dist         # full production build + installer
npm run build:win    # explicit Windows NSIS build
```

## Stack
- Electron (main process: `electron/main.ts`, preload: `electron/preload.ts`)
- React 18 + TypeScript (renderer: `src/`)
- Vite as bundler
- Tailwind CSS (utility classes only)
- Anthropic SDK via IPC (API key stored in electron-store, encrypted)
- Skills persisted to `userData/skills.json` via electron-store

## Project structure
```
electron/
  main.ts        # IPC handlers, Claude API calls, file persistence
  preload.ts     # contextBridge exposing window.api

src/
  types/index.ts            # All types — edit here first when adding features
  lib/storage.ts            # DB helpers, uid(), load/save
  lib/shuffle.ts            # Fisher-Yates, getRandomQuestions, flattenQuestions
  lib/parser.ts             # CSV/MD import parser
  components/
    MainApp.tsx             # Root app, tab routing, all skill state handlers
    TitleBar.tsx            # Custom title bar, zoom controls
    Wizard/                 # Onboarding wizard (first run)
    PreCommit/              # Tab 00 — commitment card
    PhaseBoard/             # Tabs 01-04 — card board (deconstruct/selfcorrect/barriers/practice)
    SessionLog/             # Session log panel (append-only entries)
    ScheduleView/           # 7-week schedule
    AIGenerator/            # AI generate panel — plan generation + assessment detection
    TestCenter/             # Competency assessment (quiz, rubric, flashcard)
    WeeklySnapshot/         # Weekly status snapshot + Markdown export
    Settings/               # API key, zoom, reset
```

## Key concepts

### Assessment type system (v1.3)
The app detects the type of assessment needed from the skill's definition of done:
- `knowledge_test` — generates 100-question quiz (Russian phrases, facts, recall)
- `performance_skill` — generates scored rubric (piano, speaking, physical)
- `build_project` — generates build checklist rubric (hardware, apps)
- `concept_understanding` — explanation rubric
- `measurable_output` — rubric with measurement tool suggestion
- `hybrid` — combined

Detection happens automatically after plan generation via `claude:detectAssessmentType` IPC.
User can override manually in AI Generator panel.

### Session log
Append-only. Never overwrite. Each entry: date, hours, focus, note, errors[], fixes[], evidence[], nextStep, rubricUpdates[].

### Scope guard (prompt rule)
All AI generation prompts enforce: plan must fit inside 20 focused hours for a normal beginner. Extra features go to Future Upgrades, not the 20-hour core.

### Weekly snapshot
At-a-glance class submission. Not a full report. Exports Markdown. Stored in `skill.snapshots[]`.

## IPC channels (window.api)
```
settings: getApiKey, setApiKey, isOnboarded, setOnboarded, clearApiKey, getZoom, setZoom
skills: load, save, getPath
claude: testKey, generateSkill, generateTest, generateRubric, detectAssessmentType, analyzeProgress
shell: openExternal
window: minimize, maximize, close, isMaximized, onBoundsChange
```

## Known issues / non-issues
- `punycode` DeprecationWarning on startup — Electron internals, not app code. Ignore.
- Vite deprecation warnings about `esbuild` and `rollupOptions` — cosmetic, no action needed.

## Current version: v1.3
### v1.3 changes
- Renamed Test Center to Competency Assessment
- Added assessment type detection and rubric generation for non-knowledge skills
- Added pause/exit with saved progress on active tests
- Added WeeklySnapshot tab with Markdown export
- Enhanced SessionLog type with errors, fixes, evidence, nextStep fields
- Added `performanceRubric` and `assessmentType` fields to Skill type
- Scope guard added to all generation prompts

## Active skill (for testing)
Russian language learning — assessment type: `knowledge_test`

## Style rules
- No em dashes anywhere in UI text
- KISS — no over-engineering
- Complete file delivery preferred over incremental patches
- All UI text uses CSS variables for color, never hardcoded hex
