# HANDOFF — SkillForge20

## What This Is
Electron desktop app (SkillForge20) applying Josh Kaufman's First 20 Hours framework to skill acquisition. Claude API drives plan generation and assessment. Data lives locally, key stored encrypted via electron-store.

## Stack
- Electron 28 + TypeScript (main process)
- React 18 + Vite + Tailwind (renderer, port 5173 in dev)
- @anthropic-ai/sdk (Claude API, main process only — key never touches renderer)
- electron-store with encryption key `mtw-first20hrs-key-v1`

## IPC Bridge
All Claude API calls go through `electron/main.ts` IPC handlers. The renderer calls `window.api.claude.*`. Types for the full bridge are in `src/types/index.ts` under `WindowAPI`. The preload is `electron/preload.ts`.

## Key Files
| File | Purpose |
|---|---|
| `electron/main.ts` | All IPC handlers, Claude API calls, window management |
| `electron/preload.ts` | contextBridge exposing window.api |
| `src/types/index.ts` | All shared types including WindowAPI contract |
| `src/lib/storage.ts` | Skill DB, auto-save debounce, CRUD helpers |
| `src/components/AIGenerator/AIGeneratorPanel.tsx` | Plan generation UI, assessment type detection |
| `src/components/TestCenter/TestCenter.tsx` | Knowledge test and rubric assessment UI |

## Data Paths
- Skills: `%APPDATA%\SkillForge20\skills.json`
- Config/key: `%APPDATA%\SkillForge20\config.json`

## Dev
```
npm run start
```
Vite on 5173, Electron loads that URL. Changes to electron/ require restart.

## Current Branch State
Working. JSON parse error on plan generation was fixed by increasing max_tokens and adding better error reporting. Type coverage across IPC bridge is complete.
