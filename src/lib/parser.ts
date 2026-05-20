import type { Card, Phase } from '../types'
import { uid } from './storage'

export interface ParsedCard extends Omit<Card, 'id' | 'status'> {
  phase: Phase | 'precommit'
  goalText?: string
}

const PHASE_MAP: Record<string, Phase | 'precommit'> = {
  deconstruct: 'deconstruct',
  'self-correct': 'selfcorrect',
  'self correct': 'selfcorrect',
  selfcorrect: 'selfcorrect',
  barrier: 'barriers',
  barriers: 'barriers',
  practice: 'practice',
  'pre-commit': 'precommit',
  precommit: 'precommit',
}

const VALID_PHASES: Array<Phase | 'precommit'> = [
  'deconstruct', 'selfcorrect', 'barriers', 'practice', 'precommit'
]

export function parseCSV(text: string): ParsedCard[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/"/g, ''))
  const cards: ParsedCard[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => { obj[h] = vals[idx] || '' })

    const title = obj.title || obj.name || ''
    if (!title) continue

    let phase: Phase | 'precommit' = 'deconstruct'
    const rawPhase = (obj.phase || '').toLowerCase().trim()
    if (VALID_PHASES.includes(rawPhase as Phase)) phase = rawPhase as Phase | 'precommit'
    if (title.startsWith('SKILL:')) phase = 'precommit'

    const priority = (['high', 'medium', 'low'].includes(obj.priority))
      ? obj.priority as Card['priority']
      : 'medium'

    cards.push({
      phase,
      title,
      note: obj.note || obj.notes || obj.description || '',
      priority,
      goalText: title.startsWith('SKILL:') ? obj.note : undefined,
    })
  }

  return cards
}

export function parseMD(text: string): ParsedCard[] {
  const lines = text.split('\n')
  const cards: ParsedCard[] = []
  let currentPhase: Phase | 'precommit' = 'deconstruct'

  lines.forEach((line) => {
    const heading = line.match(/^#{1,3}\s+(.+)/)
    if (heading) {
      const lower = heading[1].toLowerCase()
      for (const [k, v] of Object.entries(PHASE_MAP)) {
        if (lower.includes(k)) { currentPhase = v; return }
      }
    }

    const bullet = line.match(/^[-*]\s+(.+)/)
    if (bullet) {
      const raw = bullet[1].trim()
      let priority: Card['priority'] = 'medium'
      if (/\(high\)|\[high\]/i.test(raw)) priority = 'high'
      else if (/\(low\)|\[low\]/i.test(raw)) priority = 'low'

      const title = raw
        .replace(/\((high|medium|low)\)/gi, '')
        .replace(/\[(high|medium|low)\]/gi, '')
        .trim()

      if (!title) return

      const phase = title.startsWith('SKILL:') ? 'precommit' : currentPhase

      cards.push({
        phase,
        title,
        note: '',
        priority,
        goalText: title.startsWith('SKILL:') ? title.replace('SKILL:', '').trim() : undefined,
      })
    }
  })

  return cards
}

export function applyParsedCards(
  parsedCards: ParsedCard[],
  skillId: string,
  db: Record<string, import('../types').Skill>
): void {
  const skill = db[skillId]
  if (!skill) return

  parsedCards.forEach((c) => {
    if (c.phase === 'precommit') {
      if (c.goalText) skill.commit.goal = c.goalText
      return
    }
    skill[c.phase].push({
      id: uid(),
      title: c.title,
      note: c.note,
      priority: c.priority,
      status: 'todo',
    })
  })
}
