import { useState } from 'react'
import type { Skill, SessionEntry } from '../../types'

interface Props {
  skill: Skill
  onAddLog: (entry: Omit<SessionEntry, 'id'>) => void
}

export default function SessionLogPanel({ skill, onAddLog }: Props) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [hours, setHours] = useState('')
  const [focus, setFocus] = useState('')
  const [note, setNote] = useState('')
  const [errorsText, setErrorsText] = useState('')
  const [fixesText, setFixesText] = useState('')
  const [evidenceText, setEvidenceText] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)

  const total = skill.log.reduce((s, e) => s + e.hours, 0)
  const pct = Math.min(100, Math.round((total / 20) * 100))
  const remaining = Math.max(0, 20 - total)

  function submit() {
    const h = parseFloat(hours)
    if (!date || isNaN(h) || h <= 0) return
    const errors = errorsText.split('\n').map(s => s.trim()).filter(Boolean)
    const fixes = fixesText.split('\n').map(s => s.trim()).filter(Boolean)
    const evidence = evidenceText.split('\n').map(s => s.trim()).filter(Boolean)
    onAddLog({
      date,
      hours: h,
      note: note.trim(),
      focus: focus.trim() || undefined,
      errors: errors.length ? errors : undefined,
      fixes: fixes.length ? fixes : undefined,
      evidence: evidence.length ? evidence : undefined,
      nextStep: nextStep.trim() || undefined,
    })
    setHours('')
    setFocus('')
    setNote('')
    setErrorsText('')
    setFixesText('')
    setEvidenceText('')
    setNextStep('')
  }

  async function handleAnalyze() {
    if (skill.log.length < 2) return
    setAnalyzing(true)
    setAnalysis(null)
    const result = await window.api.claude.analyzeProgress({
      skillName: skill.name,
      sessionLogs: skill.log,
      totalHours: total,
    })
    setAnalyzing(false)
    if (result.ok && result.analysis) setAnalysis(result.analysis)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        {[
          { val: total.toFixed(1), label: 'HOURS LOGGED' },
          { val: skill.log.length, label: 'SESSIONS' },
          { val: remaining.toFixed(1), label: 'REMAINING' },
        ].map(({ val, label }, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--color-surface)', borderRight: i < 2 ? '1px solid var(--color-border)' : 'none' }}>
            <p style={{ fontSize: 'var(--fs-xl)', fontWeight: 500, color: 'var(--color-text)' }}>{val}</p>
            <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.1em', color: 'var(--color-text-dim)', marginTop: '2px' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ padding: '8px 18px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginBottom: '4px' }}>
          <span>20-hour target</span><span>{pct}%</span>
        </div>
        <div style={{ height: '5px', borderRadius: '3px', overflow: 'hidden', background: 'var(--color-border-mid)' }}>
          <div style={{ height: '100%', borderRadius: '3px', transition: 'width 0.4s', width: `${pct}%`, background: pct >= 100 ? 'var(--color-success)' : 'var(--color-accent)' }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Definition of done reminder */}
        {skill.commit?.definition && (
          <div style={{ padding: '10px 14px', borderRadius: '3px', background: 'rgba(216,90,48,0.06)', border: '1px solid var(--color-accent-border)' }}>
            <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-accent)', marginBottom: '3px' }}>YOUR DEFINITION OF DONE</p>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{skill.commit.definition}</p>
          </div>
        )}

        {/* Log form */}
        <div style={{ padding: '14px', borderRadius: '3px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)', marginBottom: '10px' }}>LOG SESSION</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)', display: 'block', marginBottom: '4px' }}>DATE</label>
              <input type="date" className="w-full rounded" style={{ padding: '6px 8px', fontSize: 'var(--fs-sm)' }}
                value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)', display: 'block', marginBottom: '4px' }}>HOURS</label>
              <input type="number" min="0.25" max="8" step="0.25" placeholder="1.0" className="w-full rounded"
                style={{ padding: '6px 8px', fontSize: 'var(--fs-sm)' }}
                value={hours} onChange={e => setHours(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)', display: 'block', marginBottom: '4px' }}>WHAT I PRACTICED</label>
            <input className="w-full rounded" style={{ padding: '6px 8px', fontSize: 'var(--fs-sm)' }}
              placeholder="e.g. Cyrillic alphabet, basic greetings..."
              value={focus} onChange={e => setFocus(e.target.value)} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)', display: 'block', marginBottom: '4px' }}>NOTES</label>
            <textarea className="w-full rounded" rows={2}
              style={{ padding: '6px 8px', fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}
              value={note} onChange={e => setNote(e.target.value)}
              placeholder="What clicked, what broke..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)', display: 'block', marginBottom: '4px' }}>ERRORS / PROBLEMS</label>
              <textarea className="w-full rounded" rows={2}
                style={{ padding: '6px 8px', fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}
                value={errorsText} onChange={e => setErrorsText(e.target.value)}
                placeholder="One per line" />
            </div>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)', display: 'block', marginBottom: '4px' }}>FIXES / ADJUSTMENTS</label>
              <textarea className="w-full rounded" rows={2}
                style={{ padding: '6px 8px', fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}
                value={fixesText} onChange={e => setFixesText(e.target.value)}
                placeholder="One per line" />
            </div>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)', display: 'block', marginBottom: '4px' }}>EVIDENCE (optional)</label>
            <input className="w-full rounded" style={{ padding: '6px 8px', fontSize: 'var(--fs-sm)' }}
              placeholder="e.g. Screenshot, recording file, serial output"
              value={evidenceText} onChange={e => setEvidenceText(e.target.value)} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)', display: 'block', marginBottom: '4px' }}>NEXT STEP</label>
            <input className="w-full rounded" style={{ padding: '6px 8px', fontSize: 'var(--fs-sm)' }}
              placeholder="What to focus on next session"
              value={nextStep} onChange={e => setNextStep(e.target.value)} />
          </div>
          <button className="w-full rounded"
            style={{ padding: '8px', fontSize: 'var(--fs-xs)', background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)', opacity: (!date || !hours) ? 0.4 : 1 }}
            onClick={submit} disabled={!date || !hours}>
            + log session
          </button>
        </div>

        {/* AI analysis */}
        {skill.log.length >= 2 && (
          <div style={{ padding: '14px', borderRadius: '3px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: analysis ? '10px' : '0' }}>
              <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)' }}>AI PROGRESS ANALYSIS</p>
              <button className="rounded"
                style={{ padding: '4px 10px', fontSize: 'var(--fs-xs)', background: 'var(--color-blue-bg)', border: '1px solid var(--color-blue)', color: 'var(--color-blue)', opacity: analyzing ? 0.4 : 1 }}
                onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? 'analyzing...' : 'analyze my log'}
              </button>
            </div>
            {analysis && (
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{analysis}</p>
            )}
          </div>
        )}

        {/* Log entries */}
        {skill.log.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px', fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', border: '1px dashed var(--color-border)', borderRadius: '3px' }}>
            No sessions logged yet.
          </div>
        )}
        {[...skill.log].reverse().map(entry => (
          <div key={entry.id} style={{ padding: '10px 14px', borderRadius: '3px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: entry.focus || entry.note ? '6px' : '0' }}>
              <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500, color: 'var(--color-text)' }}>
                {entry.focus || entry.note || 'Session'}
              </span>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', flexShrink: 0, marginLeft: '10px' }}>
                {entry.date} · {entry.hours.toFixed(2)} hrs
              </span>
            </div>
            {entry.note && entry.focus && (
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '4px' }}>{entry.note}</p>
            )}
            {entry.errors && entry.errors.length > 0 && (
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-accent)', marginBottom: '2px' }}>
                Errors: {entry.errors.join(', ')}
              </p>
            )}
            {entry.fixes && entry.fixes.length > 0 && (
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-success)', marginBottom: '2px' }}>
                Fixes: {entry.fixes.join(', ')}
              </p>
            )}
            {entry.evidence && entry.evidence.length > 0 && (
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-blue)', marginBottom: '2px' }}>
                Evidence: {entry.evidence.join(', ')}
              </p>
            )}
            {entry.nextStep && (
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginTop: '2px' }}>
                Next: {entry.nextStep}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
