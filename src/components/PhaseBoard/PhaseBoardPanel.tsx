import { useMemo } from 'react'
import type { Skill, Phase, Card, Priority, CardStatus } from '../../types'
import { shuffle } from '../../lib/shuffle'

interface Props {
  skill: Skill
  phase: Phase
  onAddCard: () => void
  onUpdateCard: (id: string, updates: Partial<Card>) => void
  onDeleteCard: (id: string) => void
}

const PHASE_COLORS: Record<Phase, string> = {
  deconstruct: 'var(--color-blue)',
  selfcorrect: 'var(--color-amber)',
  barriers: 'var(--color-coral)',
  practice: 'var(--color-success)',
}

const PRIORITY_ACCENT: Record<Priority, string> = {
  high: 'var(--color-coral)',
  medium: 'var(--color-amber)',
  low: 'var(--color-success)',
}

export default function PhaseBoardPanel({ skill, phase, onAddCard, onUpdateCard, onDeleteCard }: Props) {
  const cards = skill[phase]
  const color = PHASE_COLORS[phase]
  const done = cards.filter(c => c.status === 'done').length

  // Shuffle within each priority group — new order each render/load
  // useMemo with empty deps so it shuffles once per mount, not on every keystroke
  const high = useMemo(() => shuffle(cards.filter(c => c.priority === 'high')), [cards.length, phase]) // eslint-disable-line
  const medium = useMemo(() => shuffle(cards.filter(c => c.priority === 'medium')), [cards.length, phase]) // eslint-disable-line
  const low = useMemo(() => shuffle(cards.filter(c => c.priority === 'low')), [cards.length, phase]) // eslint-disable-line

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color }}>{cards.length} CARDS</span>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)' }}>{done} done</span>
        </div>
        <button onClick={onAddCard}
          style={{ padding: '5px 12px', borderRadius: '3px', fontSize: 'var(--fs-xs)', background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
          + add card
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: '14px 18px' }}>
        {cards.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', border: '1px dashed var(--color-border)', borderRadius: '3px' }}>
            No cards yet. Add one above or use AI Generate.
          </div>
        )}

        {high.length > 0 && <CardGroup label="HIGH PRIORITY" cards={high} color="var(--color-coral)" onUpdate={onUpdateCard} onDelete={onDeleteCard} showUrls={phase === 'selfcorrect'} />}
        {medium.length > 0 && <CardGroup label="MEDIUM PRIORITY" cards={medium} color="var(--color-amber)" onUpdate={onUpdateCard} onDelete={onDeleteCard} showUrls={phase === 'selfcorrect'} />}
        {low.length > 0 && <CardGroup label="LOW PRIORITY" cards={low} color="var(--color-success)" onUpdate={onUpdateCard} onDelete={onDeleteCard} showUrls={phase === 'selfcorrect'} />}

        {phase === 'practice' && skill.competencyCards && skill.competencyCards.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-purple)', marginBottom: '8px' }}>
              COMPETENCY CHECK — {skill.competencyCards.length} SAMPLE QUESTIONS
            </p>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginBottom: '10px' }}>
              Use these for self-assessment before the full test. Go to Test Center for scored practice.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {skill.competencyCards.map((q, i) => (
                <div key={i} style={{ padding: '10px 14px', borderRadius: '3px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--color-purple)' }}>
                  <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text)', marginBottom: '4px' }}>{q.question}</p>
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)' }}>Pass: {q.passCriteria}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CardGroup({ label, cards, color, onUpdate, onDelete, showUrls }: {
  label: string; cards: Card[]; color: string
  onUpdate: (id: string, updates: Partial<Card>) => void
  onDelete: (id: string) => void
  showUrls?: boolean
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color, marginBottom: '8px', paddingLeft: '2px' }}>{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {cards.map(card => (
          <CardItem key={card.id} card={card} accentColor={PRIORITY_ACCENT[card.priority]}
            onUpdate={onUpdate} onDelete={onDelete} showUrl={showUrls} />
        ))}
      </div>
    </div>
  )
}

function CardItem({ card, accentColor, onUpdate, onDelete, showUrl }: {
  card: Card; accentColor: string
  onUpdate: (id: string, updates: Partial<Card>) => void
  onDelete: (id: string) => void
  showUrl?: boolean
}) {
  return (
    <div className="card-enter" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${accentColor}`, borderRadius: '3px', padding: '10px 14px', opacity: card.status === 'done' ? 0.5 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
        <input type="text" className="flex-1"
          style={{ background: 'transparent', border: 'none', borderBottom: '1px dashed var(--color-border)', outline: 'none', fontSize: 'var(--fs-sm)', fontWeight: 500, color: 'var(--color-text)', padding: '1px 0', fontFamily: 'Courier New, monospace' }}
          placeholder="card title..."
          value={card.title}
          onChange={e => onUpdate(card.id, { title: e.target.value })} />
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          {card.status !== 'todo' && (
            <span className={`badge badge-${card.status === 'done' ? 'done' : 'inprog'}`} style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '2px' }}>
              {card.status === 'done' ? 'done' : 'in prog'}
            </span>
          )}
          <span className={`badge badge-${card.priority}`} style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '2px' }}>
            {card.priority === 'medium' ? 'med' : card.priority}
          </span>
        </div>
      </div>

      <textarea style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px dashed var(--color-border)', outline: 'none', fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', fontFamily: 'Courier New, monospace', lineHeight: 1.5, padding: '1px 0', resize: 'none' }}
        placeholder="notes..." rows={2}
        value={card.note}
        onChange={e => onUpdate(card.id, { note: e.target.value })} />

      {showUrl && (
        <div style={{ marginTop: '6px' }}>
          <input type="text"
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px dashed var(--color-border)', outline: 'none', fontSize: 'var(--fs-xs)', color: 'var(--color-blue)', fontFamily: 'Courier New, monospace', padding: '1px 0' }}
            placeholder="source URL (optional)..."
            value={card.url || ''}
            onChange={e => onUpdate(card.id, { url: e.target.value })} />
          {card.url && (
            <button style={{ marginTop: '3px', background: 'none', border: 'none', color: 'var(--color-blue)', fontSize: 'var(--fs-xs)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              onClick={() => window.api.shell.openExternal(card.url!)}>
              ↗ open {card.url}
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
        <select className="rounded" style={{ fontSize: '10px', padding: '2px 5px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          value={card.priority} onChange={e => onUpdate(card.id, { priority: e.target.value as Priority })}>
          <option value="high">high</option>
          <option value="medium">medium</option>
          <option value="low">low</option>
        </select>
        <select className="rounded" style={{ fontSize: '10px', padding: '2px 5px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          value={card.status} onChange={e => onUpdate(card.id, { status: e.target.value as CardStatus })}>
          <option value="todo">to do</option>
          <option value="inprog">in progress</option>
          <option value="done">done</option>
        </select>
        <button style={{ marginLeft: 'auto', fontSize: '10px', padding: '2px 8px', borderRadius: '2px', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-dim)' }}
          onClick={() => onDelete(card.id)}>
          remove
        </button>
      </div>
    </div>
  )
}
