import { useState } from 'react'
import type { Skill } from '../../types'

interface Props {
  skill: Skill
  onUpdate: (s: Skill) => void
}

export default function PreCommitPanel({ skill, onUpdate }: Props) {
  const [editing, setEditing] = useState(!skill.commit.statement)
  const [form, setForm] = useState({ ...skill.commit })

  function save() {
    onUpdate({ ...skill, commit: { ...form } })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="h-full overflow-y-auto" style={{ padding: '20px' }}>
        <div style={{ maxWidth: '560px' }}>
          <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.1em', color: 'var(--color-purple)', marginBottom: '4px' }}>
            STEP 00 — PRE-COMMIT
          </p>
          <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 500, marginBottom: '6px' }}>{skill.name}</h2>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
            Write this out before you start. Come back to it when session 3 feels like a disaster.
            Early incompetence is the learning happening, not a signal to quit.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Field label="END GOAL — what does this skill enable you to build or do?">
              <textarea className="w-full rounded" rows={2}
                style={{ padding: '8px 10px', fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}
                placeholder="e.g. Understand these tools well enough to design a better GUI for them"
                value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} />
            </Field>

            <Field label="TARGET COMPLETION DATE">
              <input type="date" className="rounded"
                style={{ padding: '7px 10px', fontSize: 'var(--fs-sm)' }}
                value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </Field>

            <Field label="DEFINITION OF DONE — how will you know you have reached functional competence?">
              <textarea className="w-full rounded" rows={3}
                style={{ padding: '8px 10px', fontSize: 'var(--fs-sm)', lineHeight: 1.6, border: '1px solid var(--color-accent)', background: 'rgba(216,90,48,0.05)' }}
                placeholder="e.g. Pass a 100-question test in Russian with 80% score, using an AI-generated test"
                value={form.definition} onChange={e => setForm({ ...form, definition: e.target.value })} />
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginTop: '4px' }}>
                This drives the competency test calibration in AI Generate. Be specific.
              </p>
            </Field>

            <Field label="COMMITMENT STATEMENT — write it in your own words">
              <textarea className="w-full rounded" rows={3}
                style={{ padding: '8px 10px', fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}
                placeholder="I commit to completing 20 hours of deliberate practice on this skill regardless of how frustrating the early sessions feel..."
                value={form.statement} onChange={e => setForm({ ...form, statement: e.target.value })} />
            </Field>

            <button className="rounded"
              style={{ padding: '9px 20px', fontSize: 'var(--fs-xs)', background: 'var(--color-purple-bg)', border: '1px solid var(--color-purple)', color: 'var(--color-purple)', opacity: (!form.statement || !form.endDate) ? 0.4 : 1 }}
              onClick={save} disabled={!form.statement || !form.endDate}>
              Save commitment
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto" style={{ padding: '20px' }}>
      <div style={{ maxWidth: '560px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.1em', color: 'var(--color-purple)' }}>
            STEP 00 — PRE-COMMIT
          </p>
          <button className="rounded"
            style={{ padding: '4px 10px', fontSize: 'var(--fs-xs)', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}
            onClick={() => { setForm({ ...skill.commit }); setEditing(true) }}>
            edit
          </button>
        </div>

        {/* Definition of done — prominent */}
        {skill.commit.definition && (
          <div style={{ padding: '14px 16px', borderRadius: '3px', background: 'rgba(216,90,48,0.08)', border: '1px solid var(--color-accent)', marginBottom: '16px' }}>
            <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-accent)', marginBottom: '6px' }}>
              DEFINITION OF DONE
            </p>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text)', lineHeight: 1.6 }}>
              {skill.commit.definition}
            </p>
          </div>
        )}

        <div style={{ padding: '16px', borderRadius: '3px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <CommitField label="SKILL" value={skill.name} />
          <CommitField label="END GOAL" value={skill.commit.goal} />
          <CommitField label="TARGET DATE" value={skill.commit.endDate} />
          <CommitField label="COMMITMENT" value={skill.commit.statement} accent />
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.06em', color: 'var(--color-text-dim)', display: 'block', marginBottom: '5px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function CommitField({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  if (!value) return null
  return (
    <div>
      <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)', marginBottom: '3px' }}>{label}</p>
      <p style={{ fontSize: 'var(--fs-sm)', color: accent ? 'var(--color-text)' : 'var(--color-text-muted)', lineHeight: 1.6 }}>{value}</p>
    </div>
  )
}
