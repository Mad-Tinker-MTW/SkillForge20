# SkillForge20
## Mad Tinker's Workshop

Rapid skill acquisition tracker built on Josh Kaufman's First 20 Hours framework. AI-powered card generation via Claude API. Electron desktop app.

---

## Stack

- Electron 28 (main process, file I/O, Claude API)
- React 18 + Vite + TypeScript (renderer)
- Tailwind CSS
- electron-store (encrypted settings)
- @anthropic-ai/sdk

---

## Setup

### Prerequisites
- Node.js 18+
- npm

### Install

```bash
cd Q:\MTW\first-20-hours
npm install
```

### Dev

```bash
npm run start
```

Starts Vite on port 5173 and launches Electron pointing at it. Hot reload works on the React side. Changes to `electron/main.ts` require a restart.

### Build (Windows installer)

```bash
npm run dist
```

Output lands in `release/`. Creates `SkillForge20-Setup-{version}.exe` via NSIS.

---

## Project Structure

```
electron/
  main.ts          Main process. Window, IPC handlers, file ops, Claude API calls.
  preload.ts       Exposes window.api bridge to renderer via contextBridge.

src/
  types/index.ts   All shared TypeScript types.
  lib/
    storage.ts     Skill DB read/write with auto-save debounce.
    parser.ts      CSV and MD import parsers.
    shuffle.ts     Fisher-Yates shuffle and question helpers.
  components/
    Wizard/        Five-step onboarding. API key setup and test.
    MainApp.tsx    Root app shell with sidebar and panel routing.
    TitleBar.tsx   Frameless window controls.
    PreCommit/     Step 00. Commitment form and display.
    PhaseBoard/    Steps 01-04. Card management for all four phases.
    SessionLog/    Session logging with full v1.3 fields.
    ScheduleView/  7-week plan with collapsible weeks and checkboxes.
    AIGenerator/   Claude-powered skill deconstruction and card generation.
    TestCenter/    Competency assessment: flashcard, quiz, full test, rubric.
    WeeklySnapshot/ Weekly status snapshot with Markdown export.
    Settings/      API key management, zoom, data path display.

web/
  index.html       Standalone single-file web version. Same feature set.
```

---

## Data

Skills are stored at:
```
%APPDATA%\SkillForge20\skills.json
```

The API key is stored encrypted via electron-store at:
```
%APPDATA%\SkillForge20\config.json
```

---

## Links

- Repo: https://github.com/Mad-Tinker-MTW/SkillForge20
- Web: madtinkersworkshop.com/skillforge20

---

## MTW Project Registry

- **Project**: SkillForge20
- **Division**: TinkerCode
- **Status**: active development
- **Path**: Q:\MTW\first-20-hours
- **Linked RSA skills**: Password Auditing, Network Recon, Post-Exploitation
