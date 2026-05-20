import { useState } from 'react'
import type { Skill, WeeklySnapshot } from '../../types'
import { uid } from '../../lib/storage'

interface Props {
  skill: Skill
  onSaveSnapshot: (snapshot: WeeklySnapshot) => void
}

export default function WeeklySnapshotPanel({ skill, onSaveSnapshot }: Props) {
  const snapshots = skill.snapshots || []
  const totalHours = skill.log.reduce((sum, e) => sum + (e.hours || 0), 0)
  const rubricScore = skill.performanceRubric
    ? skill.performanceRubric.items.reduce((sum, i) => sum + i.score, 0)
    : 0
  const rubricMax = skill.performanceRubric
    ? skill.performanceRubric.items.reduce((sum, i) => sum + i.maxPoints, 0)
    : 100
  const rubricPct = rubricMax > 0 ? Math.round((rubricScore / rubricMax) * 100) : 0
  const dodScore = skill.performanceRubric ? rubricPct : (skill.testAttempts?.length ? Math.max(...skill.testAttempts.map(a => a.pct)) : 0)
  const dodTarget = skill.generatedTest?.passThreshold || skill.performanceRubric?.passThreshold || 80

  const currentWeek = skill.currentWeek || (snapshots.length + 1)

  const [form, setForm] = useState<Partial<WeeklySnapshot>>({
    week: currentWeek,
    date: new Date().toISOString().split('T')[0],
    status: 'in_progress',
    thisWeekFocus: skill.currentFocus || '',
    thisWeekDone: [''],
    thisWeekHours: 0,
    thisWeekPlannedHours: skill.commit ? parseFloat(String((skill.log.reduce((s, e) => s + e.hours, 0) / Math.max(currentWeek, 1)).toFixed(1))) : 0,
    blocker: skill.mainBlocker || '',
    nextWeekFocus: skill.nextFocus || '',
    nextWeekPlan: [''],
    rsaHoursTotal: totalHours,
    rsaHoursGoal: 20,
    dodScore,
    dodTarget,
  })

  const [saved, setSaved] = useState<WeeklySnapshot | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  function updateDone(i: number, val: string) {
    const next = [...(form.thisWeekDone || [''])]
    next[i] = val
    setForm(f => ({ ...f, thisWeekDone: next }))
  }

  function addDone() {
    setForm(f => ({ ...f, thisWeekDone: [...(f.thisWeekDone || ['']), ''] }))
  }

  function removeDone(i: number) {
    setForm(f => ({ ...f, thisWeekDone: (f.thisWeekDone || ['']).filter((_, idx) => idx !== i) }))
  }

  function updatePlan(i: number, val: string) {
    const next = [...(form.nextWeekPlan || [''])]
    next[i] = val
    setForm(f => ({ ...f, nextWeekPlan: next }))
  }

  function addPlan() {
    setForm(f => ({ ...f, nextWeekPlan: [...(f.nextWeekPlan || ['']), ''] }))
  }

  function removePlan(i: number) {
    setForm(f => ({ ...f, nextWeekPlan: (f.nextWeekPlan || ['']).filter((_, idx) => idx !== i) }))
  }

  function saveSnapshot() {
    const snap: WeeklySnapshot = {
      week: form.week || currentWeek,
      date: form.date || new Date().toISOString().split('T')[0],
      status: form.status || 'in_progress',
      thisWeekFocus: form.thisWeekFocus || '',
      thisWeekDone: (form.thisWeekDone || []).filter(Boolean),
      thisWeekHours: form.thisWeekHours || 0,
      thisWeekPlannedHours: form.thisWeekPlannedHours || 0,
      blocker: form.blocker || '',
      nextWeekFocus: form.nextWeekFocus || '',
      nextWeekPlan: (form.nextWeekPlan || []).filter(Boolean),
      rsaHoursTotal: totalHours,
      rsaHoursGoal: 20,
      dodScore,
      dodTarget,
    }
    onSaveSnapshot(snap)
    setSaved(snap)
  }

  function exportMarkdown(snap: WeeklySnapshot) {
    const done = snap.thisWeekDone.map(d => `- [x] ${d}`).join('\n') || '- (none logged)'
    const plan = snap.nextWeekPlan.map(p => `- [ ] ${p}`).join('\n') || '- (not set)'
    const statusLabel = snap.status === 'complete' ? 'Complete' : snap.status === 'in_progress' ? 'In Progress' : 'Not Started'
    const md = `# RSA Weekly Snapshot

**Project:** ${skill.name}
**Week:** Week ${snap.week}
**Date:** ${snap.date}
**Status:** ${statusLabel}

| This Week | Next Week |
|---|---|
| **Focus:** ${snap.thisWeekFocus || '(not set)'} | **Focus:** ${snap.nextWeekFocus || '(not set)'} |
| **Hours:** ${snap.thisWeekHours} / ${snap.thisWeekPlannedHours} planned | **Planned Hours:** ${snap.thisWeekPlannedHours} |
${snap.blocker ? `| **Blocker:** ${snap.blocker} | | ` : ''}

## Completed This Week

${done}

## Next Week Plan

${plan}

## At-a-Glance Progress

| Item | Status |
|---|---|
| RSA Hours | ${snap.rsaHoursTotal.toFixed(1)} / ${snap.rsaHoursGoal} |
| Assessment Score | ${snap.dodScore}% / ${snap.dodTarget}% target |
| Overall Status | ${statusLabel} |

*Full details, session logs, and evidence are in the main RSA project file.*
`
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${skill.name.replace(/\s+/g, '_')}_Week${snap.week}_Snapshot.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full overflow-y-auto" style={{ padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)', marginBottom: '4px' }}>WEEKLY SNAPSHOT</p>
        <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 500, marginBottom: '4px' }}>{skill.name}</h2>
        <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginBottom: '20px' }}>
          At-a-glance status for class submission. Keep it short, detail stays in the main project.
        </p>

        {/* Auto-filled progress strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
          <StatBox label="RSA Hours" value={`${totalHours.toFixed(1)} / 20`} />
          <StatBox label="Assessment Score" value={`${dodScore}% / ${dodTarget}%`} accent={dodScore >= dodTarget} />
          <StatBox label="Week" value={`Week ${currentWeek}`} />
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <Field label="Week #">
              <input type="number" min={1} max={7} value={form.week || ''} onChange={e => setForm(f => ({ ...f, week: parseInt(e.target.value) }))} style={inputStyle} />
            </Field>
            <Field label="Date">
              <input type="date" value={form.date || ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Status">
              <select value={form.status || 'in_progress'} onChange={e => setForm(f => ({ ...f, status: e.target.value as WeeklySnapshot['status'] }))} style={inputStyle}>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="complete">Complete</option>
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="This week focus">
              <input value={form.thisWeekFocus || ''} onChange={e => setForm(f => ({ ...f, thisWeekFocus: e.target.value }))} style={inputStyle} placeholder="e.g. Cyrillic alphabet" />
            </Field>
            <Field label="Next week focus">
              <input value={form.nextWeekFocus || ''} onChange={e => setForm(f => ({ ...f, nextWeekFocus: e.target.value }))} style={inputStyle} placeholder="e.g. Basic greetings" />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="Hours this week">
              <input type="number" min={0} step={0.5} value={form.thisWeekHours || ''} onChange={e => setForm(f => ({ ...f, thisWeekHours: parseFloat(e.target.value) }))} style={inputStyle} />
            </Field>
            <Field label="Planned hours">
              <input type="number" min={0} step={0.5} value={form.thisWeekPlannedHours || ''} onChange={e => setForm(f => ({ ...f, thisWeekPlannedHours: parseFloat(e.target.value) }))} style={inputStyle} />
            </Field>
          </div>

          <Field label="Blocker (optional)">
            <input value={form.blocker || ''} onChange={e => setForm(f => ({ ...f, blocker: e.target.value }))} style={inputStyle} placeholder="e.g. Need microphone for pronunciation practice" />
          </Field>

          <Field label="Completed this week">
            {(form.thisWeekDone || ['']).map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '5px' }}>
                <input value={item} onChange={e => updateDone(i, e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder={`Done item ${i + 1}`} />
                <button onClick={() => removeDone(i)} style={removeBtn}>×</button>
              </div>
            ))}
            <button onClick={addDone} style={addBtn}>+ add item</button>
          </Field>

          <Field label="Next week plan">
            {(form.nextWeekPlan || ['']).map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '5px' }}>
                <input value={item} onChange={e => updatePlan(i, e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder={`Plan item ${i + 1}`} />
                <button onClick={() => removePlan(i)} style={removeBtn}>×</button>
              </div>
            ))}
            <button onClick={addPlan} style={addBtn}>+ add item</button>
          </Field>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <button onClick={saveSnapshot} style={{ flex: 1, padding: '9px', borderRadius: '3px', fontSize: 'var(--fs-xs)', background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
            save snapshot
          </button>
          {saved && (
            <button onClick={() => exportMarkdown(saved)} style={{ padding: '9px 16px', borderRadius: '3px', fontSize: 'var(--fs-xs)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}>
              export .md
            </button>
          )}
        </div>

        {saved && (
          <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '3px', background: 'var(--color-surface)', border: '1px solid var(--color-success)' }}>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-success)' }}>✓ Snapshot saved — Week {saved.week}</p>
          </div>
        )}

        {/* History */}
        {snapshots.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <button onClick={() => setShowHistory(h => !h)} style={{ background: 'transparent', border: 'none', fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', letterSpacing: '0.06em', cursor: 'pointer', padding: 0, marginBottom: '10px' }}>
              PAST SNAPSHOTS ({snapshots.length}) {showHistory ? '▲' : '▼'}
            </button>
            {showHistory && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[...snapshots].reverse().map((snap, i) => (
                  <div key={i} style={{ padding: '10px 14px', borderRadius: '3px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text)' }}>Week {snap.week} · {snap.date}</p>
                      <p style={{ fontSize: '10px', color: 'var(--color-text-dim)', marginTop: '2px' }}>{snap.thisWeekFocus || '(no focus set)'}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>{snap.thisWeekHours}h · {snap.dodScore}%</span>
                      <button onClick={() => exportMarkdown(snap)} style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', padding: '2px 8px', borderRadius: '2px', fontSize: '10px' }}>
                        .md
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: '3px', background: 'var(--color-surface)', border: `1px solid ${accent ? 'var(--color-success)' : 'var(--color-border)'}` }}>
      <p style={{ fontSize: '10px', color: 'var(--color-text-dim)', marginBottom: '3px', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ fontSize: 'var(--fs-sm)', fontWeight: 500, color: accent ? 'var(--color-success)' : 'var(--color-text)' }}>{value}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: '10px', color: 'var(--color-text-dim)', letterSpacing: '0.05em', marginBottom: '5px' }}>{label.toUpperCase()}</p>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: '3px',
  fontSize: 'var(--fs-xs)',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  fontFamily: 'inherit',
  outline: 'none',
}

const removeBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-dim)',
  width: '28px',
  borderRadius: '3px',
  fontSize: '14px',
  cursor: 'pointer',
  flexShrink: 0,
}

const addBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-dim)',
  padding: '4px 10px',
  borderRadius: '3px',
  fontSize: '10px',
  cursor: 'pointer',
  marginTop: '2px',
}
