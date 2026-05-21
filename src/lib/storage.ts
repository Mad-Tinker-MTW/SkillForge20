import type { SkillDB, Skill, Card, Phase } from '../types'

let db: SkillDB = {}
let saveTimer: ReturnType<typeof setTimeout> | null = null

export function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

export function emptySkill(name: string): Skill {
  return {
    id: uid(),
    name,
    created: new Date().toISOString(),
    commit: { goal: name, endDate: '', definition: '', statement: '' },
    weekTasks: {},
    deconstruct: [],
    selfcorrect: [],
    barriers: [],
    practice: [],
    log: [],
  }
}

export function emptyCard(overrides: Partial<Card> = {}): Card {
  return {
    id: uid(),
    title: '',
    note: '',
    priority: 'medium',
    status: 'todo',
    ...overrides,
  }
}

export async function loadDB(): Promise<SkillDB> {
  try {
    db = await window.api.skills.load()
  } catch {
    db = {}
  }
  return db
}

export function getDB(): SkillDB {
  return db
}

export function getSkill(id: string): Skill | undefined {
  return db[id]
}

export function setSkill(id: string, skill: Skill) {
  db[id] = skill
  scheduleSave()
}

export function deleteSkill(id: string) {
  delete db[id]
  scheduleSave()
}

export function updateCard(skillId: string, phase: Phase, cardId: string, updates: Partial<Card>) {
  const skill = db[skillId]
  if (!skill) return
  const idx = skill[phase].findIndex((c) => c.id === cardId)
  if (idx === -1) return
  skill[phase][idx] = { ...skill[phase][idx], ...updates }
  scheduleSave()
}

export function addCard(skillId: string, phase: Phase, card: Partial<Card> = {}) {
  const skill = db[skillId]
  if (!skill) return
  skill[phase].push(emptyCard(card))
  scheduleSave()
}

export function removeCard(skillId: string, phase: Phase, cardId: string) {
  const skill = db[skillId]
  if (!skill) return
  skill[phase] = skill[phase].filter((c) => c.id !== cardId)
  scheduleSave()
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    window.api.skills.save(db)
  }, 800)
}

export function forceSave() {
  if (saveTimer) clearTimeout(saveTimer)
  return window.api.skills.save(db)
}
