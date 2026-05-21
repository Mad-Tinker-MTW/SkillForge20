import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, renameSync } from 'fs'
import Store from 'electron-store'
import Anthropic from '@anthropic-ai/sdk'

app.commandLine.appendSwitch('high-dpi-support', '1')
app.commandLine.appendSwitch('force-device-scale-factor', '1')

const store = new Store({
  encryptionKey: 'mtw-first20hrs-key-v1',
})

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null

interface UserRecord {
  apiKey: string
  onboarded: boolean
}

// ── Migration: single-user → multi-user ──────────────────────────────────────

function migrateToUsers() {
  if (store.has('users')) return

  const oldKey = store.get('anthropicApiKey', '') as string
  const oldOnboarded = store.get('onboarded', false) as boolean
  const users: Record<string, UserRecord> = {}

  if (oldKey) {
    users['default'] = { apiKey: oldKey, onboarded: oldOnboarded }
    store.set('activeUser', 'default')

    const oldPath = join(app.getPath('userData'), 'skills.json')
    const newPath = join(app.getPath('userData'), 'skills-default.json')
    if (existsSync(oldPath) && !existsSync(newPath)) {
      renameSync(oldPath, newPath)
    }
  } else {
    store.set('activeUser', '')
  }

  store.set('users', users)
  store.delete('anthropicApiKey')
  store.delete('onboarded')
}

// ── Window ───────────────────────────────────────────────────────────────────

function createWindow() {
  const winWidth = (store.get('windowWidth', 1280)) as number
  const winHeight = (store.get('windowHeight', 800)) as number

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    minWidth: 800,
    minHeight: 560,
    backgroundColor: '#111111',
    titleBarStyle: 'hidden',
    frame: false,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      zoomFactor: 1.0,
    },
    show: false,
    icon: join(__dirname, '../resources/icon.png'),
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    const bounds = mainWindow?.getBounds()
    mainWindow?.webContents.send('window-bounds', bounds)
  })

  mainWindow.on('resize', () => {
    if (!mainWindow) return
    const [w, h] = mainWindow.getSize()
    store.set('windowWidth', w)
    store.set('windowHeight', h)
    const bounds = mainWindow.getBounds()
    mainWindow.webContents.send('window-bounds', bounds)
  })
}

app.whenReady().then(() => {
  migrateToUsers()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── User management ──────────────────────────────────────────────────────────

function getUsers(): Record<string, UserRecord> {
  return store.get('users', {}) as Record<string, UserRecord>
}

function getActiveUser(): string {
  return store.get('activeUser', '') as string
}

ipcMain.handle('user:list', () => Object.keys(getUsers()))

ipcMain.handle('user:getActive', () => getActiveUser())

ipcMain.handle('user:setActive', (_event, username: string) => {
  const users = getUsers()
  if (!users[username]) return false
  store.set('activeUser', username)
  return true
})

ipcMain.handle('user:create', (_event, username: string, apiKey: string) => {
  const users = getUsers()
  if (users[username]) return false
  store.set('users', { ...users, [username]: { apiKey: apiKey.trim(), onboarded: false } })
  store.set('activeUser', username)
  return true
})

ipcMain.handle('user:delete', (_event, username: string) => {
  const users = getUsers()
  const { [username]: _removed, ...rest } = users
  store.set('users', rest)
  if (getActiveUser() === username) {
    store.set('activeUser', Object.keys(rest)[0] || '')
  }
  return true
})

// ── Settings — per-user ───────────────────────────────────────────────────────

ipcMain.handle('settings:getApiKey', () => {
  const users = getUsers()
  return users[getActiveUser()]?.apiKey || ''
})

ipcMain.handle('settings:setApiKey', (_event, key: string) => {
  const username = getActiveUser()
  if (!username) return false
  const users = getUsers()
  store.set('users', { ...users, [username]: { ...users[username], apiKey: key.trim() } })
  return true
})

ipcMain.handle('settings:isOnboarded', () => {
  const users = getUsers()
  return users[getActiveUser()]?.onboarded || false
})

ipcMain.handle('settings:setOnboarded', () => {
  const username = getActiveUser()
  if (!username) return false
  const users = getUsers()
  store.set('users', { ...users, [username]: { ...users[username], onboarded: true } })
  return true
})

ipcMain.handle('settings:clearApiKey', () => {
  const username = getActiveUser()
  if (!username) return false
  const users = getUsers()
  store.set('users', { ...users, [username]: { apiKey: '', onboarded: false } })
  return true
})

ipcMain.handle('settings:getZoom', () => {
  return store.get('zoomFactor', 1.0) as number
})

ipcMain.handle('settings:setZoom', (_event, zoom: number) => {
  store.set('zoomFactor', zoom)
  mainWindow?.webContents.setZoomFactor(zoom)
  return true
})

// ── File persistence — per-user ──────────────────────────────────────────────

function getSkillsPath() {
  const username = getActiveUser()
  const filename = username ? `skills-${username}.json` : 'skills.json'
  return join(app.getPath('userData'), filename)
}

ipcMain.handle('skills:load', () => {
  const path = getSkillsPath()
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return {}
  }
})

ipcMain.handle('skills:save', (_event, data: unknown) => {
  try {
    writeFileSync(getSkillsPath(), JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('skills:save error', err)
    return false
  }
})

ipcMain.handle('skills:getPath', () => getSkillsPath())

// ── Claude API — test connection ─────────────────────────────────────────────

ipcMain.handle('claude:testKey', async (_event, key: string) => {
  try {
    const client = new Anthropic({ apiKey: key })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 32,
      messages: [{ role: 'user', content: 'Reply with only: connection ok' }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return { ok: true, message: text.trim() }
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string }
    if (error.status === 401) return { ok: false, message: 'Invalid API key. Check that you copied it correctly.' }
    if (error.status === 429) return { ok: false, message: 'Rate limit or quota exceeded. Make sure your account has credits.' }
    if (error.status === 403) return { ok: false, message: 'API key does not have permission. Make sure it is a full access key.' }
    return { ok: false, message: error.message || 'Connection failed. Check your internet connection.' }
  }
})

// ── Claude API — generate skill deconstruction ───────────────────────────────

ipcMain.handle('claude:generateSkill', async (_event, payload: {
  skillName: string
  constraints: {
    hoursPerWeek: number
    experienceLevel: string
    availableTools: string
    endGoal: string
    definitionOfDone: string
  }
}) => {
  const key = getUsers()[getActiveUser()]?.apiKey || ''
  if (!key) return { ok: false, message: 'No API key configured.' }

  const { skillName, constraints } = payload

  const prompt = `You are an expert skill acquisition coach applying Josh Kaufman's First 20 Hours framework.

A user wants to learn: "${skillName}"

Their constraints:
- Available time: ${constraints.hoursPerWeek} hours per week
- Experience level: ${constraints.experienceLevel}
- Available tools/resources: ${constraints.availableTools || 'not specified'}
- End goal: ${constraints.endGoal || 'reach functional competence'}
- Definition of done: ${constraints.definitionOfDone || 'not specified'}

IMPORTANT: Generate a plan that fits inside 20 focused hours for a normal beginner. Move anything requiring advanced polish to Future Upgrades if needed.

Generate a complete First 20 Hours learning plan. Return ONLY valid JSON, no explanation, no markdown fences.

Schema:
{
  "skillName": "string",
  "commit": {
    "goal": "string — what this skill enables",
    "definition": "string — functional competence definition, incorporating their stated definition of done",
    "statement": "string — pre-written commitment statement"
  },
  "deconstruct": [
    { "title": "string", "note": "string", "priority": "high | medium | low" }
  ],
  "selfcorrect": [
    {
      "title": "string",
      "note": "string",
      "priority": "high | medium | low",
      "url": "string | null — direct URL to the resource if applicable, otherwise null"
    }
  ],
  "barriers": [
    { "title": "string", "note": "string", "priority": "high | medium | low" }
  ],
  "practice": [
    { "title": "string", "note": "string", "priority": "high | medium | low" }
  ],
  "competencyTest": [
    {
      "question": "string — a specific self-assessment question tailored to this skill",
      "passCriteria": "string — what a passing answer looks like at the ${constraints.definitionOfDone || 'functional competence'} level"
    }
  ],
  "weeklyFocus": [
    {
      "week": 1,
      "focus": "string — specific focus for this week given the skill",
      "goal": "string — concrete measurable goal for this week",
      "tasks": ["string"]
    }
  ]
}

Rules:
- deconstruct: 8-12 cards. 3-4 high priority that unlock competence fastest.
- selfcorrect: 5-8 cards. Include real URLs where they exist (forvo.com, official docs, etc).
- barriers: 4-7 cards. Specific to this skill and these constraints.
- practice: 8 sessions. Session 8 always produces a tangible artifact that proves competence. Scale to ${constraints.hoursPerWeek} hrs/week.
- competencyTest: exactly 10 questions. Calibrated to the definition of done. Mix of recall, application, and situational questions. If definition of done mentions a score threshold, write questions at that difficulty.
- weeklyFocus: exactly 7 weeks. Specific to this skill, not generic. Week 7 is always buffer and final assessment.
- All notes must be specific and actionable for THIS skill.
- Return only the JSON object.`

  try {
    const client = new Anthropic({ apiKey: key })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    try {
      const parsed = JSON.parse(cleaned)
      return { ok: true, data: parsed }
    } catch (parseErr: unknown) {
      const pe = parseErr as { message?: string }
      console.error('claude:generateSkill JSON parse failed:', pe.message)
      console.error('Raw response (first 2000 chars):', cleaned.slice(0, 2000))
      console.error('Raw response length:', cleaned.length)
      console.error('Stop reason:', response.stop_reason)
      return { ok: false, message: `JSON parse error: ${pe.message}. Stop reason: ${response.stop_reason}. Response length: ${cleaned.length} chars.` }
    }
  } catch (err: unknown) {
    const error = err as { message?: string }
    return { ok: false, message: error.message || 'Generation failed.' }
  }
})

// ── Claude API — generate 100 question test ──────────────────────────────────

ipcMain.handle('claude:generateTest', async (_event, payload: {
  skillName: string
  definitionOfDone: string
  subSkills: string[]
  passThreshold: number
}) => {
  const key = getUsers()[getActiveUser()]?.apiKey || ''
  if (!key) return { ok: false, message: 'No API key configured.' }

  const { skillName, definitionOfDone, subSkills, passThreshold } = payload

  const prompt = `You are an expert assessor creating a competency test for the skill: "${skillName}"

Definition of done: ${definitionOfDone}
Pass threshold: ${passThreshold}%
Sub-skills covered: ${subSkills.join(', ')}

Generate exactly 100 assessment questions. Return ONLY valid JSON.

Schema:
{
  "title": "string — test title",
  "instructions": "string — 2-3 sentence test instructions",
  "passThreshold": ${passThreshold},
  "sections": [
    {
      "title": "string — section name",
      "questions": [
        {
          "id": number,
          "type": "multiple_choice | true_false | short_answer | situational",
          "question": "string",
          "options": ["string"] | null,
          "answer": "string — correct answer or model answer",
          "explanation": "string — brief explanation of why this is correct"
        }
      ]
    }
  ]
}

Rules:
- Exactly 100 questions total across all sections
- Calibrate difficulty so ${passThreshold}% pass rate requires genuine competence
- multiple_choice questions have exactly 4 options
- true_false questions have options ["True", "False"]
- short_answer and situational questions have null options
- Distribute: 40% recall, 35% application, 25% situational
- Sections should map to the sub-skills provided
- Return only the JSON object.`

  try {
    const client = new Anthropic({ apiKey: key })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return { ok: true, data: parsed }
  } catch (err: unknown) {
    const error = err as { message?: string }
    return { ok: false, message: error.message || 'Test generation failed.' }
  }
})

// ── Claude API — generate performance rubric ─────────────────────────────────

ipcMain.handle('claude:generateRubric', async (_event, payload: {
  skillName: string
  definitionOfDone: string
  subSkills: string[]
  passThreshold: number
  assessmentType: string
}) => {
  const key = getUsers()[getActiveUser()]?.apiKey || ''
  if (!key) return { ok: false, message: 'No API key configured.' }

  const { skillName, definitionOfDone, subSkills, passThreshold, assessmentType } = payload

  const typeGuide: Record<string, string> = {
    performance_skill: 'The student must physically perform the skill (play, speak, draw, type, etc). Score on accuracy, consistency, quality, and demonstration.',
    build_project: 'The student must build and demonstrate something working. Score on setup, functionality, troubleshooting, explanation, and evidence.',
    concept_understanding: 'The student must explain and apply concepts. Score on explanation quality, accuracy, and ability to connect concepts.',
    measurable_output: 'The student must produce and measure an output against a benchmark. Score on output quality, measurement accuracy, and improvement over time.',
    hybrid: 'The student must both build/perform AND understand. Score on both practical and conceptual criteria.',
  }

  const guide = typeGuide[assessmentType] || typeGuide['hybrid']

  const prompt = `You are an expert assessor creating a performance competency rubric for: "${skillName}"

Assessment type: ${assessmentType}
${guide}

Definition of done: ${definitionOfDone}
Pass threshold: ${passThreshold}%
Sub-skills to cover: ${subSkills.join(', ')}

IMPORTANT: This skill requires demonstrated performance, not a knowledge quiz.
The rubric must reflect what a person can DO, BUILD, or PROVE, not just what they know.

Rules:
- Total points must equal exactly 100.
- 6-10 rubric items maximum. Each item must be specific and testable.
- Weights should reflect the definition of done.
- Do NOT include items the student cannot realistically achieve inside 20 focused hours.
- If the DOD requires a measurement tool, include a measurement tool suggestion.
- Items must be ordered from foundational to advanced.

Return ONLY valid JSON, no explanation, no markdown fences.

Schema:
{
  "title": "string",
  "instructions": "string — 2-3 sentences explaining how to use this rubric",
  "passThreshold": ${passThreshold},
  "assessmentType": "${assessmentType}",
  "measurementToolSuggestion": "string | null",
  "items": [
    {
      "id": "string — short_snake_case",
      "title": "string — specific competency task",
      "maxPoints": number,
      "score": 0,
      "evidenceRequired": "string — what proof or demonstration counts",
      "notes": ""
    }
  ]
}`

  try {
    const client = new Anthropic({ apiKey: key })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return { ok: true, data: parsed }
  } catch (err: unknown) {
    const error = err as { message?: string }
    return { ok: false, message: error.message || 'Rubric generation failed.' }
  }
})

// ── Claude API — detect assessment type ──────────────────────────────────────

ipcMain.handle('claude:detectAssessmentType', async (_event, payload: {
  skillName: string
  definitionOfDone: string
}) => {
  const key = getUsers()[getActiveUser()]?.apiKey || ''
  if (!key) return { ok: false, message: 'No API key configured.' }

  const { skillName, definitionOfDone } = payload

  const prompt = `Classify this skill's definition of done into exactly one assessment type.

Skill: "${skillName}"
Definition of done: "${definitionOfDone}"

Assessment types:
- knowledge_test: pass a quiz/test, recall facts, answer questions
- performance_skill: physically perform (play instrument, speak language, type, draw, exercise)
- build_project: build, make, create, prototype, deploy, wire, solder, code, demo a device or app
- concept_understanding: explain, understand, describe how something works
- measurable_output: compare to a benchmark, measure accuracy, score against a reference
- hybrid: requires two or more of the above

Respond with ONLY a JSON object, no explanation:
{"assessmentType": "one of the types above", "reasoning": "one sentence"}`

  try {
    const client = new Anthropic({ apiKey: key })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return { ok: true, assessmentType: parsed.assessmentType, reasoning: parsed.reasoning }
  } catch {
    return { ok: false, assessmentType: 'knowledge_test', message: 'Detection failed, defaulting to knowledge test.' }
  }
})

// ── Claude API — analyze progress ────────────────────────────────────────────

ipcMain.handle('claude:analyzeProgress', async (_event, payload: {
  skillName: string
  sessionLogs: Array<{ date: string; hours: number; note: string }>
  totalHours: number
}) => {
  const key = getUsers()[getActiveUser()]?.apiKey || ''
  if (!key) return { ok: false, message: 'No API key configured.' }

  const { skillName, sessionLogs, totalHours } = payload
  const logText = sessionLogs.map(l => `${l.date} (${l.hours}h): ${l.note}`).join('\n')

  const prompt = `You are a skill acquisition coach reviewing session logs for: "${skillName}"
Total hours: ${totalHours} of 20

Logs:
${logText}

Write a direct 3-5 sentence progress analysis. What is going well, what pattern of struggle appears, and one specific thing to focus on next session. Be direct, not cheerful. No fluff.`

  try {
    const client = new Anthropic({ apiKey: key })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return { ok: true, analysis: text.trim() }
  } catch (err: unknown) {
    const error = err as { message?: string }
    return { ok: false, message: error.message || 'Analysis failed.' }
  }
})

// ── Shell ────────────────────────────────────────────────────────────────────

ipcMain.handle('shell:openExternal', (_event, url: string) => {
  shell.openExternal(url)
})

// ── Window controls ──────────────────────────────────────────────────────────

ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('window:close', () => mainWindow?.close())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)
