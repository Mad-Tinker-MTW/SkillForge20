import { useState, useEffect, useCallback, useRef } from 'react'
import type { Skill, SkillDB, Phase, Card, SessionEntry, TestAttempt, PerformanceRubric, WeeklySnapshot } from '../types'
import { getDB, setSkill, deleteSkill, emptySkill, emptyCard, uid, forceSave, loadDB } from '../lib/storage'
import { parseCSV, parseMD, applyParsedCards } from '../lib/parser'
import PreCommitPanel from './PreCommit/PreCommitPanel'
import PhaseBoardPanel from './PhaseBoard/PhaseBoardPanel'
import SessionLogPanel from './SessionLog/SessionLogPanel'
import SchedulePanel from './ScheduleView/SchedulePanel'
import AIGeneratorPanel from './AIGenerator/AIGeneratorPanel'
import SettingsPanel from './Settings/SettingsPanel'
import TestCenter from './TestCenter/TestCenter'
import WeeklySnapshotPanel from './WeeklySnapshot/WeeklySnapshotPanel'

type Tab = 'precommit' | 'deconstruct' | 'selfcorrect' | 'barriers' | 'practice' | 'log' | 'schedule' | 'generate' | 'test' | 'snapshot' | 'settings'

interface MainAppProps {
  initialSkillId: string | null
  onResetToWizard: () => void
}

const TABS: { id: Tab; label: string; color: string }[] = [
  { id: 'precommit', label: '00. pre-commit', color: 'var(--color-purple)' },
  { id: 'deconstruct', label: '01. deconstruct', color: 'var(--color-blue)' },
  { id: 'selfcorrect', label: '02. self-correct', color: 'var(--color-amber)' },
  { id: 'barriers', label: '03. barriers', color: 'var(--color-coral)' },
  { id: 'practice', label: '04. practice', color: 'var(--color-success)' },
  { id: 'log', label: 'session log', color: 'var(--color-text-muted)' },
  { id: 'schedule', label: '7-week plan', color: 'var(--color-text-muted)' },
  { id: 'generate', label: 'AI generate', color: 'var(--color-accent)' },
  { id: 'test', label: 'competency', color: 'var(--color-purple)' },
  { id: 'snapshot', label: 'weekly snapshot', color: 'var(--color-blue)' },
]

const HINTS: Record<string, string> = {
  precommit: 'Step zero. Write your commitment before you start. Come back to it when session 3 feels like a disaster.',
  deconstruct: 'Sub-skills are randomized within priority groups each session so you do not memorize position.',
  selfcorrect: 'Gather just enough reference material to recognize when you are doing it wrong. Add source URLs for quick access.',
  barriers: 'Identify everything that will stop you from practicing. Remove each barrier before week 2, not during.',
  practice: 'Each session block has a specific question it is trying to answer. Generic sessions produce generic results.',
  log: 'Log every session the same day. Date, hours, what you worked on, what clicked, what broke.',
  schedule: '20 hours across 7 weeks. Week 1 is setup. Weeks 2-6 are sessions. Week 7 is buffer and final assessment.',
  generate: 'Tell Claude what you want to learn and set your constraints. Claude detects your assessment type and generates the right evaluation.',
  test: 'Knowledge test: flashcard, quiz, or full test. Performance skill: scored rubric. Update rubric scores as you practice.',
  snapshot: 'At-a-glance weekly status for class submission. Export as Markdown. Keep it short, detail stays in the main project.',
}

function truncateSkillName(name: string, maxLen = 22): string {
  if (name.length <= maxLen) return name
  return name.slice(0, maxLen - 1) + '…'
}

const MIN_SIDEBAR = 140
const MAX_SIDEBAR = 280
const DEFAULT_SIDEBAR = 180

export default function MainApp({ initialSkillId, onResetToWizard }: MainAppProps) {
  const [db, setDb] = useState<SkillDB>({})
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('precommit')
  const [showNewSkill, setShowNewSkill] = useState(false)
  const [newSkillName, setNewSkillName] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importPreview, setImportPreview] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<ReturnType<typeof parseCSV> | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR)
  const dragging = useRef(false)
  const dragStart = useRef(0)
  const widthAtDrag = useRef(DEFAULT_SIDEBAR)

  const refresh = useCallback(() => setDb({ ...getDB() }), [])

  useEffect(() => {
    loadDB().then(() => {
      const keys = Object.keys(getDB())
      if (initialSkillId && getDB()[initialSkillId]) setActiveSkillId(initialSkillId)
      else if (keys.length > 0) setActiveSkillId(keys[0])
      refresh()
    })
  }, [refresh, initialSkillId])

  // Sidebar drag resize
  function onDragStart(e: React.MouseEvent) {
    dragging.current = true
    dragStart.current = e.clientX
    widthAtDrag.current = sidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return
      const delta = e.clientX - dragStart.current
      const next = Math.max(MIN_SIDEBAR, Math.min(MAX_SIDEBAR, widthAtDrag.current + delta))
      setSidebarWidth(next)
    }
    function onUp() {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  const skill: Skill | undefined = activeSkillId ? db[activeSkillId] : undefined

  function totalHours(s: Skill) { return s.log.reduce((sum, e) => sum + e.hours, 0) }

  function createSkill() {
    if (!newSkillName.trim()) return
    const s = emptySkill(newSkillName.trim())
    setSkill(s.id, s)
    setActiveSkillId(s.id)
    setShowNewSkill(false)
    setNewSkillName('')
    setActiveTab('precommit')
    refresh()
    showToast('skill created')
  }

  function removeSkill() {
    if (!activeSkillId || !skill) return
    if (!confirm(`Delete "${skill.name}"? This cannot be undone.`)) return
    deleteSkill(activeSkillId)
    const remaining = Object.keys(getDB())
    setActiveSkillId(remaining[0] || null)
    refresh()
    showToast('skill deleted')
  }

  function updateSkill(updated: Skill) {
    if (!activeSkillId) return
    setSkill(activeSkillId, updated)
    refresh()
  }

  function handleSaveAttempt(attempt: TestAttempt) {
    if (!skill) return
    const updated = { ...skill, testAttempts: [...(skill.testAttempts || []), attempt] }
    updateSkill(updated)
    showToast(`${attempt.mode === 'quiz' ? 'Quiz' : 'Test'} complete — ${attempt.pct}%${attempt.passed ? ' ✓ passed' : ''}`)
  }

  function handleSaveRubric(rubric: PerformanceRubric) {
    if (!skill) return
    updateSkill({ ...skill, performanceRubric: rubric })
    showToast('rubric scores saved')
  }

  function handleSaveSnapshot(snapshot: WeeklySnapshot) {
    if (!skill) return
    const existing = skill.snapshots || []
    const idx = existing.findIndex(s => s.week === snapshot.week)
    const updated = idx >= 0
      ? existing.map((s, i) => i === idx ? snapshot : s)
      : [...existing, snapshot]
    updateSkill({ ...skill, snapshots: updated, currentWeek: snapshot.week })
    showToast(`Week ${snapshot.week} snapshot saved`)
  }

  function handleAddCard(phase: Phase) {
    if (!skill) return
    updateSkill({ ...skill, [phase]: [...skill[phase], emptyCard()] })
  }

  function handleUpdateCard(phase: Phase, id: string, updates: Partial<Card>) {
    if (!skill) return
    updateSkill({ ...skill, [phase]: skill[phase].map(c => c.id === id ? { ...c, ...updates } : c) })
  }

  function handleDeleteCard(phase: Phase, id: string) {
    if (!skill) return
    updateSkill({ ...skill, [phase]: skill[phase].filter(c => c.id !== id) })
    showToast('card removed')
  }

  function handleAddLog(entry: Omit<SessionEntry, 'id'>) {
    if (!skill) return
    updateSkill({ ...skill, log: [...skill.log, { ...entry, id: uid() }] })
    showToast('session logged')
  }

  function handleToggleWeekTask(key: string, val: boolean) {
    if (!skill) return
    updateSkill({ ...skill, weekTasks: { ...skill.weekTasks, [key]: val } })
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const content = ev.target?.result as string
      setImportPreview(content.slice(0, 400) + (content.length > 400 ? '\n...' : ''))
      setPendingImport(file.name.endsWith('.csv') ? parseCSV(content) : parseMD(content))
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleConfirmImport() {
    if (!pendingImport || !activeSkillId) return
    const current = getDB()
    applyParsedCards(pendingImport, activeSkillId, current)
    forceSave()
    refresh()
    setImportPreview(null)
    setPendingImport(null)
    setShowImport(false)
    showToast(`${pendingImport.length} cards imported`)
  }

  async function handleExportJSON() {
    const data = JSON.stringify(getDB(), null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'first20hrs_backup.json'; a.click()
    URL.revokeObjectURL(url)
    showToast('exported')
  }

  const pct = skill ? Math.min(100, Math.round((totalHours(skill) / 20) * 100)) : 0


  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--color-bg)' }}>

      {/* Sidebar */}
      <div style={{ width: `${sidebarWidth}px`, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0, position: 'relative' }}>

        {/* Skill selector */}
        <div style={{ padding: '10px', borderBottom: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)', marginBottom: '6px' }}>ACTIVE SKILL</p>
          <select className="w-full rounded"
            style={{ padding: '5px 7px', fontSize: 'var(--fs-xs)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', marginBottom: '6px' }}
            value={activeSkillId || ''}
            onChange={e => { setActiveSkillId(e.target.value || null); setActiveTab('precommit') }}>
            {Object.keys(db).length === 0 && <option value="">no skills yet</option>}
            {Object.values(db).map(s => (
              <option key={s.id} value={s.id} title={s.name}>{truncateSkillName(s.name, Math.floor(sidebarWidth / 8))}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button className="flex-1 rounded"
              style={{ padding: '4px', fontSize: 'var(--fs-xs)', background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}
              onClick={() => setShowNewSkill(true)}>
              + new
            </button>
            <button className="rounded"
              style={{ padding: '4px 8px', fontSize: 'var(--fs-xs)', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', opacity: !activeSkillId ? 0.4 : 1 }}
              onClick={removeSkill} disabled={!activeSkillId}>
              del
            </button>
          </div>
          {showNewSkill && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <input type="text" className="w-full rounded"
                style={{ padding: '5px 7px', fontSize: 'var(--fs-xs)' }}
                placeholder="skill name..."
                value={newSkillName}
                onChange={e => setNewSkillName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createSkill(); if (e.key === 'Escape') setShowNewSkill(false) }}
                autoFocus />
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="flex-1 rounded"
                  style={{ padding: '4px', fontSize: 'var(--fs-xs)', background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}
                  onClick={createSkill}>create</button>
                <button className="rounded"
                  style={{ padding: '4px 6px', fontSize: 'var(--fs-xs)', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}
                  onClick={() => { setShowNewSkill(false); setNewSkillName('') }}>×</button>
              </div>
            </div>
          )}
        </div>

        {/* Progress */}
        {skill && (
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginBottom: '4px' }}>
              <span>{totalHours(skill).toFixed(1)} / 20 hrs</span>
              <span>{pct}%</span>
            </div>
            <div style={{ height: '4px', borderRadius: '2px', overflow: 'hidden', background: 'var(--color-border-mid)' }}>
              <div style={{ height: '100%', borderRadius: '2px', transition: 'width 0.5s', width: `${pct}%`, background: pct >= 100 ? 'var(--color-success)' : 'var(--color-accent)' }} />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
          {TABS.map(t => {
            const isTestTab = t.id === 'test'
            const hasAssessment = !!(skill?.generatedTest || skill?.performanceRubric)
            const disabled = isTestTab && !hasAssessment
            return (
              <button key={t.id}
                style={{
                  width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: '3px', fontSize: 'var(--fs-xs)', letterSpacing: '0.02em',
                  background: activeTab === t.id ? 'var(--color-surface-2)' : 'transparent',
                  border: activeTab === t.id ? '1px solid var(--color-border-mid)' : '1px solid transparent',
                  color: disabled ? 'var(--color-text-dim)' : activeTab === t.id ? t.color : 'var(--color-text-dim)',
                  opacity: disabled ? 0.4 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.1s',
                }}
                onClick={() => !disabled && setActiveTab(t.id)}
                title={disabled ? 'Generate an assessment first in AI Generate' : undefined}>
                {t.label}
                {isTestTab && hasAssessment && (
                  <span style={{ marginLeft: '4px', fontSize: '8px', color: 'var(--color-success)' }}>●</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: '6px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {[
            { label: 'import file', action: () => setShowImport(true) },
            { label: 'export JSON', action: handleExportJSON },
            { label: 'settings', action: () => setActiveTab('settings') },
          ].map(({ label, action }) => (
            <button key={label} onClick={action}
              style={{ width: '100%', textAlign: 'left', padding: '6px 10px', borderRadius: '3px', fontSize: 'var(--fs-xs)', background: 'transparent', border: '1px solid transparent', color: 'var(--color-text-dim)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={onDragStart}
          style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px',
            cursor: 'col-resize', zIndex: 10,
            background: 'transparent',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-accent)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {HINTS[activeTab] && (
          <div style={{ padding: '8px 18px', fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0, lineHeight: 1.6, borderLeft: '2px solid var(--color-border-mid)' }}>
            {HINTS[activeTab]}
          </div>
        )}

        {!skill && activeTab !== 'settings' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-dim)', marginBottom: '12px' }}>No skill selected.</p>
              <button className="rounded"
                style={{ padding: '8px 16px', fontSize: 'var(--fs-xs)', background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}
                onClick={() => setShowNewSkill(true)}>
                + create skill
              </button>
            </div>
          </div>
        )}

        {skill && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeTab === 'precommit' && <PreCommitPanel skill={skill} onUpdate={updateSkill} />}
            {(activeTab === 'deconstruct' || activeTab === 'selfcorrect' || activeTab === 'barriers' || activeTab === 'practice') && (
              <PhaseBoardPanel skill={skill} phase={activeTab as Phase}
                onAddCard={() => handleAddCard(activeTab as Phase)}
                onUpdateCard={(id, u) => handleUpdateCard(activeTab as Phase, id, u)}
                onDeleteCard={id => handleDeleteCard(activeTab as Phase, id)} />
            )}
            {activeTab === 'log' && <SessionLogPanel skill={skill} onAddLog={handleAddLog} />}
            {activeTab === 'schedule' && <SchedulePanel skill={skill} onToggleTask={handleToggleWeekTask} />}
            {activeTab === 'generate' && <AIGeneratorPanel skill={skill} onGenerated={updateSkill} onToast={showToast} />}
            {activeTab === 'test' && <TestCenter skill={skill} onSaveAttempt={handleSaveAttempt} onSaveRubric={handleSaveRubric} />}
            {activeTab === 'snapshot' && <WeeklySnapshotPanel skill={skill} onSaveSnapshot={handleSaveSnapshot} />}
          </div>
        )}

        {activeTab === 'settings' && <SettingsPanel onResetToWizard={onResetToWizard} onToast={showToast} />}
      </div>

      {/* Import modal */}
      {showImport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setShowImport(false)}>
          <div style={{ width: '90%', maxWidth: '480px', padding: '20px', borderRadius: '4px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}
            onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 'var(--fs-sm)', fontWeight: 500 }}>Import CSV or Markdown</p>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', border: '1px dashed var(--color-border-mid)', borderRadius: '3px', cursor: 'pointer' }}>
              <input type="file" accept=".csv,.md,.txt" className="hidden" onChange={handleImportFile} />
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)' }}>
                {importPreview ? 'file loaded' : 'click to browse'}
              </span>
            </label>
            {importPreview && (
              <pre style={{ fontSize: '10px', padding: '10px', borderRadius: '3px', background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', maxHeight: '120px', overflowY: 'auto' }}>
                {importPreview}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              {pendingImport && (
                <button className="flex-1 rounded"
                  style={{ padding: '8px', fontSize: 'var(--fs-xs)', background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}
                  onClick={handleConfirmImport}>
                  Import {pendingImport.length} cards
                </button>
              )}
              <button className="rounded"
                style={{ padding: '8px 14px', fontSize: 'var(--fs-xs)', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}
                onClick={() => { setShowImport(false); setImportPreview(null); setPendingImport(null) }}>
                cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '14px', right: '14px', padding: '7px 14px', borderRadius: '3px', fontSize: 'var(--fs-xs)', background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)', zIndex: 99 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
