import { useState, useEffect, useRef } from 'react'
import type { Skill, CompetencyQuestion, TestAttempt, TestMode, PerformanceRubric, RubricItem, AssessmentType } from '../../types'
import { shuffle, getRandomQuestions, flattenQuestions } from '../../lib/shuffle'
import { uid } from '../../lib/storage'

interface Props {
  skill: Skill
  onSaveAttempt: (attempt: TestAttempt) => void
  onSaveRubric: (rubric: PerformanceRubric) => void
}

export default function TestCenter({ skill, onSaveAttempt, onSaveRubric }: Props) {
  const [mode, setMode] = useState<TestMode | null>(null)

  const test = skill.generatedTest
  const rubric = skill.performanceRubric
  const assessmentType = skill.assessmentType || 'knowledge_test'
  const attempts = skill.testAttempts || []
  const quizAttempts = attempts.filter(a => a.mode === 'quiz')
  const fullAttempts = attempts.filter(a => a.mode === 'fulltest')
  const bestFull = fullAttempts.length > 0 ? Math.max(...fullAttempts.map(a => a.pct)) : null
  const passThreshold = test?.passThreshold || rubric?.passThreshold || 80

  // Rubric score calculation
  const rubricScore = rubric ? rubric.items.reduce((sum, item) => sum + item.score, 0) : 0
  const rubricMax = rubric ? rubric.items.reduce((sum, item) => sum + item.maxPoints, 0) : 100
  const rubricPct = rubricMax > 0 ? Math.round((rubricScore / rubricMax) * 100) : 0
  const rubricPassed = rubricPct >= passThreshold

  const isKnowledge = assessmentType === 'knowledge_test'
  const hasAssessment = isKnowledge ? !!test : !!rubric

  if (!hasAssessment && !test) {
    return (
      <div className="h-full flex items-center justify-center">
        <div style={{ textAlign: 'center', maxWidth: '380px' }}>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-dim)', marginBottom: '10px' }}>
            No competency assessment generated yet.
          </p>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', lineHeight: 1.6 }}>
            Go to AI Generate and select Generate Assessment to create your competency evaluation.
          </p>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginTop: '8px', lineHeight: 1.6 }}>
            Assessment type detected: <span style={{ color: 'var(--color-accent)' }}>{formatAssessmentType(assessmentType)}</span>
          </p>
        </div>
      </div>
    )
  }

  if (mode === 'flashcard' && test) {
    return <FlashcardMode test={test} onExit={() => setMode(null)} />
  }
  if (mode === 'quiz' && test) {
    return <ActiveTestMode test={test} mode="quiz" questionCount={10} passThreshold={passThreshold}
      onExit={() => setMode(null)} onComplete={attempt => { onSaveAttempt(attempt); setMode(null) }} />
  }
  if (mode === 'fulltest' && test) {
    return <ActiveTestMode test={test} mode="fulltest" questionCount={100} passThreshold={passThreshold}
      onExit={() => setMode(null)} onComplete={attempt => { onSaveAttempt(attempt); setMode(null) }} />
  }
  if (mode === 'review' && test) {
    return <ReviewMode test={test} onExit={() => setMode(null)} />
  }
  if (mode === 'rubric' && rubric) {
    return <RubricMode rubric={rubric} onExit={() => setMode(null)} onSave={onSaveRubric} />
  }

  // Mode selector
  return (
    <div className="h-full overflow-y-auto" style={{ padding: '20px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)', marginBottom: '4px' }}>COMPETENCY ASSESSMENT</p>
        <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 500, marginBottom: '4px' }}>
          {test?.title || rubric?.title || skill.name}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)' }}>
            {isKnowledge && test ? `${flattenQuestions(test).length} questions · pass at ${passThreshold}%` : `Rubric · pass at ${passThreshold}%`}
            {bestFull !== null && (
              <span style={{ marginLeft: '12px', color: bestFull >= passThreshold ? 'var(--color-success)' : 'var(--color-accent)' }}>
                best: {bestFull}%{bestFull >= passThreshold ? ' ✓' : ''}
              </span>
            )}
          </p>
          <span style={{ fontSize: '9px', padding: '1px 7px', borderRadius: '2px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', letterSpacing: '0.05em' }}>
            {formatAssessmentType(assessmentType)}
          </span>
        </div>

        {/* Rubric score banner if rubric exists */}
        {rubric && (
          <div style={{
            padding: '14px 16px', borderRadius: '4px', marginBottom: '16px',
            background: rubricPassed ? 'rgba(29,158,117,0.08)' : 'var(--color-surface)',
            border: `1px solid ${rubricPassed ? 'var(--color-success)' : 'var(--color-border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginBottom: '2px' }}>Current rubric score</p>
              <p style={{ fontSize: 'var(--fs-md)', fontWeight: 500, color: rubricPassed ? 'var(--color-success)' : 'var(--color-text)' }}>
                {rubricScore} / {rubricMax} &nbsp;
                <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 400 }}>({rubricPct}%)</span>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginBottom: '2px' }}>Target</p>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-dim)' }}>{passThreshold}%</p>
            </div>
          </div>
        )}

        {/* Mode cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {/* Rubric mode for non-knowledge skills */}
          {rubric && (
            <ModeCard
              title="Performance Rubric"
              badge={formatAssessmentType(assessmentType).toUpperCase()}
              badgeColor="var(--color-success)"
              description={`Score each competency item. ${rubric.items.length} criteria, ${rubricMax} total points. Update scores as you practice and gain evidence.`}
              detail={`${rubricScore}/${rubricMax} points · ${rubricPct}% · ${rubricPassed ? '✓ passed' : `need ${passThreshold}%`}`}
              onClick={() => setMode('rubric')}
              color="var(--color-success)"
            />
          )}

          {/* Knowledge test modes */}
          {test && (
            <>
              <ModeCard
                title="Flashcard"
                badge="STUDY"
                badgeColor="var(--color-blue)"
                description={`${flattenQuestions(test).length} cards, shuffled every session. Tap to reveal answer. Use during learning phase.`}
                detail="Full deck · randomized · flip to reveal"
                onClick={() => setMode('flashcard')}
                color="var(--color-blue)"
              />
              <ModeCard
                title="Practice Quiz"
                badge="10 QUESTIONS"
                badgeColor="var(--color-amber)"
                description="10 random questions, answers hidden until end. A different set every attempt. Use for daily check-ins."
                detail={`${quizAttempts.length} attempts${quizAttempts.length > 0 ? ` · best ${Math.max(...quizAttempts.map(a => a.pct))}%` : ''}`}
                onClick={() => setMode('quiz')}
                color="var(--color-amber)"
              />
              <ModeCard
                title="Full Test"
                badge="100 QUESTIONS"
                badgeColor="var(--color-accent)"
                description={`All 100 questions in random order. Scored against your ${passThreshold}% threshold. Formal competency proof.`}
                detail={`${fullAttempts.length} attempts${bestFull !== null ? ` · best ${bestFull}%` : ''} · pass at ${passThreshold}%`}
                onClick={() => setMode('fulltest')}
                color="var(--color-accent)"
              />
              <ModeCard
                title="Answer Key"
                badge="REVIEW"
                badgeColor="var(--color-text-dim)"
                description="All questions with answers and explanations visible. Use after a test attempt to review misses."
                detail="Read-only · all sections"
                onClick={() => setMode('review')}
                color="var(--color-text-dim)"
              />
            </>
          )}
        </div>

        {/* Measurement tool suggestion */}
        {rubric?.measurementToolSuggestion && (
          <div style={{ padding: '12px 14px', borderRadius: '3px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', marginBottom: '16px' }}>
            <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.06em', color: 'var(--color-blue)', marginBottom: '4px' }}>MEASUREMENT TOOL</p>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{rubric.measurementToolSuggestion}</p>
          </div>
        )}

        {/* Attempt history */}
        {attempts.length > 0 && (
          <div>
            <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)', marginBottom: '10px' }}>
              ATTEMPT HISTORY
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {[...attempts].reverse().map(a => (
                <AttemptRow key={a.id} attempt={a} passThreshold={passThreshold} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Rubric Mode ───────────────────────────────────────────────────────────────

function RubricMode({ rubric, onExit, onSave }: {
  rubric: PerformanceRubric
  onExit: () => void
  onSave: (rubric: PerformanceRubric) => void
}) {
  const [items, setItems] = useState<RubricItem[]>(rubric.items.map(i => ({ ...i })))
  const [dirty, setDirty] = useState(false)

  const totalScore = items.reduce((sum, i) => sum + i.score, 0)
  const totalMax = items.reduce((sum, i) => sum + i.maxPoints, 0)
  const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0
  const passed = pct >= rubric.passThreshold

  function updateScore(id: string, score: number) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, score: Math.max(0, Math.min(item.maxPoints, score)) } : item))
    setDirty(true)
  }

  function updateEvidence(id: string, evidence: string) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, evidence } : item))
    setDirty(true)
  }

  function save() {
    onSave({ ...rubric, items })
    setDirty(false)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={onExit} style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', padding: '3px 8px', borderRadius: '3px', fontSize: 'var(--fs-xs)' }}>← back</button>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-success)', letterSpacing: '0.06em' }}>PERFORMANCE RUBRIC</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500, color: passed ? 'var(--color-success)' : 'var(--color-text)' }}>
            {totalScore}/{totalMax} &nbsp;<span style={{ fontWeight: 400, fontSize: 'var(--fs-xs)' }}>({pct}%)</span>
          </span>
          {dirty && (
            <button onClick={save} style={{ background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)', padding: '3px 10px', borderRadius: '3px', fontSize: 'var(--fs-xs)' }}>
              save
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: 'var(--color-border-mid)', flexShrink: 0 }}>
        <div style={{ height: '100%', background: passed ? 'var(--color-success)' : 'var(--color-accent)', transition: 'width 0.3s', width: `${pct}%` }} />
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '16px 18px' }}>
        <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginBottom: '14px', lineHeight: 1.6 }}>
          {rubric.instructions}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {items.map(item => (
            <RubricItemRow key={item.id} item={item} onScoreChange={updateScore} onEvidenceChange={updateEvidence} />
          ))}
        </div>

        {/* Pass/fail summary */}
        <div style={{ marginTop: '20px', padding: '14px 16px', borderRadius: '4px', background: passed ? 'rgba(29,158,117,0.08)' : 'var(--color-surface)', border: `1px solid ${passed ? 'var(--color-success)' : 'var(--color-border)'}` }}>
          <p style={{ fontSize: 'var(--fs-sm)', fontWeight: 500, color: passed ? 'var(--color-success)' : 'var(--color-text)' }}>
            {passed ? `✓ Passed — ${pct}% (threshold ${rubric.passThreshold}%)` : `${pct}% — need ${rubric.passThreshold}% to pass`}
          </p>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginTop: '4px' }}>
            {totalScore} of {totalMax} points earned
          </p>
        </div>
      </div>
    </div>
  )
}

function RubricItemRow({ item, onScoreChange, onEvidenceChange }: {
  item: RubricItem
  onScoreChange: (id: string, score: number) => void
  onEvidenceChange: (id: string, evidence: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const pct = Math.round((item.score / item.maxPoints) * 100)

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
      <div
        style={{ padding: '10px 14px', background: 'var(--color-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text)', marginBottom: '2px' }}>{item.title}</p>
          {item.evidenceRequired && (
            <p style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>evidence: {item.evidenceRequired}</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: '12px' }}>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', minWidth: '60px', textAlign: 'right' }}>
            {item.score}/{item.maxPoints} ({pct}%)
          </span>
          <span style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '12px 14px', background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', minWidth: '50px' }}>score</span>
            <input
              type="range"
              min={0}
              max={item.maxPoints}
              value={item.score}
              onChange={e => onScoreChange(item.id, parseInt(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--color-accent)' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button onClick={() => onScoreChange(item.id, item.score - 1)}
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', width: '22px', height: '22px', borderRadius: '2px', fontSize: '12px', lineHeight: 1 }}>-</button>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text)', minWidth: '28px', textAlign: 'center' }}>{item.score}</span>
              <button onClick={() => onScoreChange(item.id, item.score + 1)}
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', width: '22px', height: '22px', borderRadius: '2px', fontSize: '12px', lineHeight: 1 }}>+</button>
            </div>
          </div>
          <textarea
            placeholder="Evidence notes (optional)..."
            value={item.evidence || ''}
            onChange={e => onEvidenceChange(item.id, e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: '3px', fontSize: 'var(--fs-xs)', lineHeight: 1.5, minHeight: '56px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
          />
        </div>
      )}
    </div>
  )
}

// ── Flashcard Mode ────────────────────────────────────────────────────────────

function FlashcardMode({ test, onExit }: { test: import('../../types').CompetencyTest; onExit: () => void }) {
  const allQ = flattenQuestions(test)
  const [deck, setDeck] = useState(() => shuffle(allQ))
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [seen, setSeen] = useState(0)

  const card = deck[index]
  const total = deck.length

  function next() {
    if (index < total - 1) {
      setIndex(i => i + 1)
      setFlipped(false)
      setSeen(s => Math.max(s, index + 2))
    }
  }

  function prev() {
    if (index > 0) {
      setIndex(i => i - 1)
      setFlipped(false)
    }
  }

  function reshuffle() {
    setDeck(shuffle(allQ))
    setIndex(0)
    setFlipped(false)
    setSeen(0)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onExit} style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', padding: '3px 8px', borderRadius: '3px', fontSize: 'var(--fs-xs)' }}>← back</button>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-blue)', letterSpacing: '0.06em' }}>FLASHCARDS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)' }}>{index + 1} / {total}</span>
          <button onClick={reshuffle} style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', padding: '3px 8px', borderRadius: '3px', fontSize: 'var(--fs-xs)' }}>shuffle</button>
        </div>
      </div>

      <div style={{ height: '3px', background: 'var(--color-border-mid)', flexShrink: 0 }}>
        <div style={{ height: '100%', background: 'var(--color-blue)', transition: 'width 0.3s', width: `${((index + 1) / total) * 100}%` }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center" style={{ padding: '20px' }}>
        <div
          onClick={() => setFlipped(f => !f)}
          style={{
            width: '100%', maxWidth: '520px', minHeight: '240px',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '6px', padding: '28px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            transition: 'border-color 0.2s',
            borderColor: flipped ? 'var(--color-success)' : 'var(--color-border)',
          }}
        >
          {!flipped ? (
            <div>
              <p style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'var(--color-text-dim)', marginBottom: '16px', textTransform: 'uppercase' }}>
                {card.type.replace('_', ' ')} · tap to reveal
              </p>
              <p style={{ fontSize: 'var(--fs-md)', color: 'var(--color-text)', lineHeight: 1.6 }}>{card.question}</p>
              {card.options && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {card.options.map((opt, i) => (
                    <p key={i} style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', paddingLeft: '8px' }}>
                      {String.fromCharCode(65 + i)}. {opt}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'var(--color-success)', marginBottom: '12px', textTransform: 'uppercase' }}>answer</p>
              <p style={{ fontSize: 'var(--fs-md)', color: 'var(--color-success)', lineHeight: 1.6, marginBottom: '12px', fontWeight: 500 }}>
                {card.answer}
              </p>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', lineHeight: 1.6, borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                {card.explanation}
              </p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', alignItems: 'center' }}>
          <button onClick={prev} disabled={index === 0}
            style={{ padding: '7px 18px', borderRadius: '3px', fontSize: 'var(--fs-xs)', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', opacity: index === 0 ? 0.3 : 1 }}>
            ← prev
          </button>
          {!flipped && (
            <button onClick={() => setFlipped(true)}
              style={{ padding: '7px 18px', borderRadius: '3px', fontSize: 'var(--fs-xs)', background: 'var(--color-blue-bg)', border: '1px solid var(--color-blue)', color: 'var(--color-blue)' }}>
              flip
            </button>
          )}
          {flipped && (
            <button onClick={next} disabled={index === total - 1}
              style={{ padding: '7px 18px', borderRadius: '3px', fontSize: 'var(--fs-xs)', background: 'var(--color-success-bg)', border: '1px solid var(--color-success)', color: 'var(--color-success)', opacity: index === total - 1 ? 0.4 : 1 }}>
              next →
            </button>
          )}
        </div>
        <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginTop: '12px' }}>
          {seen} of {total} seen this session
        </p>
      </div>
    </div>
  )
}

// ── Active Test Mode (Quiz + Full Test) with pause/exit saving progress ───────

function ActiveTestMode({ test, mode, questionCount, passThreshold, onExit, onComplete }: {
  test: import('../../types').CompetencyTest
  mode: 'quiz' | 'fulltest'
  questionCount: number
  passThreshold: number
  onExit: () => void
  onComplete: (attempt: TestAttempt) => void
}) {
  const [questions] = useState<CompetencyQuestion[]>(() => getRandomQuestions(test, questionCount))
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [shortInput, setShortInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<TestAttempt | null>(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const startTime = useRef(Date.now())

  const current = questions[index]
  const total = questions.length
  const answered = Object.keys(answers).length
  const isLast = index === total - 1

  function selectAnswer(qId: number, val: string) {
    setAnswers(prev => ({ ...prev, [qId]: val }))
    setShortInput('')
  }

  function submitTest() {
    let correct = 0
    questions.forEach(q => {
      const userAns = (answers[q.id] || '').trim().toLowerCase()
      const correctAns = q.answer.trim().toLowerCase()
      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        if (userAns === correctAns) correct++
      } else {
        if (userAns.length > 2 && correctAns.includes(userAns.slice(0, Math.min(8, userAns.length)))) correct++
        else if (userAns === correctAns) correct++
      }
    })

    const pct = Math.round((correct / total) * 100)
    const duration = Math.round((Date.now() - startTime.current) / 1000)
    const attempt: TestAttempt = {
      id: uid(),
      mode,
      date: new Date().toISOString().split('T')[0],
      score: correct,
      total,
      pct,
      passed: pct >= passThreshold,
      passThreshold,
      durationSeconds: duration,
      answers,
    }
    setResult(attempt)
    setSubmitted(true)
    onComplete(attempt)
  }

  // Save progress and exit
  function saveAndExit() {
    // Save partial as an attempt with answered count noted
    const duration = Math.round((Date.now() - startTime.current) / 1000)
    // Just exit, progress is in state — user can resume by starting a new session
    // For full test, we save a partial record
    if (mode === 'fulltest' && answered > 0) {
      const attempt: TestAttempt = {
        id: uid(),
        mode,
        date: new Date().toISOString().split('T')[0],
        score: 0,
        total,
        pct: 0,
        passed: false,
        passThreshold,
        durationSeconds: duration,
        answers,
      }
      onComplete(attempt)
    }
    onExit()
  }

  // Results screen
  if (submitted && result) {
    return (
      <div className="h-full overflow-y-auto" style={{ padding: '24px' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <div style={{
            padding: '24px', borderRadius: '4px', marginBottom: '20px', textAlign: 'center',
            background: result.passed ? 'rgba(29,158,117,0.1)' : 'rgba(216,90,48,0.1)',
            border: `1px solid ${result.passed ? 'var(--color-success)' : 'var(--color-accent)'}`,
          }}>
            <p style={{ fontSize: '48px', fontWeight: 500, color: result.passed ? 'var(--color-success)' : 'var(--color-accent)', lineHeight: 1 }}>
              {result.pct}%
            </p>
            <p style={{ fontSize: 'var(--fs-sm)', color: result.passed ? 'var(--color-success)' : 'var(--color-accent)', marginTop: '8px' }}>
              {result.passed ? '✓ PASSED' : '✗ NOT YET'} · {result.score}/{result.total} correct
            </p>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginTop: '6px' }}>
              {mode === 'quiz' ? 'Practice Quiz' : 'Full Test'} · {Math.floor(result.durationSeconds / 60)}m {result.durationSeconds % 60}s · threshold {passThreshold}%
            </p>
          </div>

          <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)', marginBottom: '10px' }}>
            QUESTION REVIEW
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {questions.map((q, i) => {
              const userAns = answers[q.id] || ''
              const correctAns = q.answer
              const isCorrect = userAns.trim().toLowerCase() === correctAns.trim().toLowerCase()
              return (
                <div key={q.id} style={{
                  padding: '12px 14px', borderRadius: '3px',
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderLeft: `3px solid ${isCorrect ? 'var(--color-success)' : 'var(--color-accent)'}`,
                }}>
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{i + 1}. {q.question}</p>
                  <p style={{ fontSize: 'var(--fs-xs)', color: isCorrect ? 'var(--color-success)' : 'var(--color-accent)' }}>
                    Your answer: {userAns || '(no answer)'}
                  </p>
                  {!isCorrect && (
                    <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-success)', marginTop: '2px' }}>
                      Correct: {correctAns}
                    </p>
                  )}
                  {!isCorrect && (
                    <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginTop: '3px', lineHeight: 1.5 }}>
                      {q.explanation}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <button onClick={onExit}
            style={{ width: '100%', padding: '9px', borderRadius: '3px', fontSize: 'var(--fs-xs)', background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
            back to competency assessment
          </button>
        </div>
      </div>
    )
  }

  // Exit confirm dialog
  if (showExitConfirm) {
    return (
      <div className="h-full flex items-center justify-center">
        <div style={{ maxWidth: '340px', padding: '28px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text)', marginBottom: '8px' }}>Exit test?</p>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', lineHeight: 1.6, marginBottom: '20px' }}>
            You have answered {answered} of {total} questions.
            {mode === 'fulltest' ? ' Your progress will be saved as a partial attempt.' : ' Progress will not be scored.'}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowExitConfirm(false)}
              style={{ flex: 1, padding: '8px', borderRadius: '3px', fontSize: 'var(--fs-xs)', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}>
              keep going
            </button>
            <button onClick={saveAndExit}
              style={{ flex: 1, padding: '8px', borderRadius: '3px', fontSize: 'var(--fs-xs)', background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
              save and exit
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Active test
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => setShowExitConfirm(true)} style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', padding: '3px 8px', borderRadius: '3px', fontSize: 'var(--fs-xs)' }}>
            pause / exit
          </button>
          <span style={{ fontSize: 'var(--fs-xs)', color: mode === 'quiz' ? 'var(--color-amber)' : 'var(--color-accent)', letterSpacing: '0.06em' }}>
            {mode === 'quiz' ? 'PRACTICE QUIZ' : 'FULL TEST'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)' }}>{index + 1} / {total}</span>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)' }}>{answered} answered</span>
        </div>
      </div>

      <div style={{ height: '3px', background: 'var(--color-border-mid)', flexShrink: 0 }}>
        <div style={{ height: '100%', transition: 'width 0.3s', width: `${((index + 1) / total) * 100}%`, background: mode === 'quiz' ? 'var(--color-amber)' : 'var(--color-accent)' }} />
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: '24px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginBottom: '12px', letterSpacing: '0.06em' }}>
            {current.type.replace('_', ' ').toUpperCase()}
          </p>
          <p style={{ fontSize: 'var(--fs-md)', color: 'var(--color-text)', lineHeight: 1.6, marginBottom: '20px' }}>
            {current.question}
          </p>

          {current.options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {current.options.map((opt, i) => {
                const selected = answers[current.id] === opt
                return (
                  <button key={i} onClick={() => selectAnswer(current.id, opt)}
                    style={{
                      textAlign: 'left', padding: '10px 14px', borderRadius: '3px', fontSize: 'var(--fs-sm)',
                      background: selected ? 'var(--color-accent-bg)' : 'var(--color-surface)',
                      border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      color: selected ? 'var(--color-accent)' : 'var(--color-text-muted)',
                      transition: 'all 0.1s',
                    }}>
                    <span style={{ marginRight: '10px', color: 'var(--color-text-dim)' }}>{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                )
              })}
            </div>
          )}

          {!current.options && (
            <div style={{ marginBottom: '20px' }}>
              <textarea
                style={{ width: '100%', padding: '10px 12px', borderRadius: '3px', fontSize: 'var(--fs-sm)', lineHeight: 1.6, minHeight: '80px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontFamily: 'Courier New, monospace', resize: 'none', outline: 'none' }}
                placeholder="Type your answer..."
                value={shortInput}
                onChange={e => {
                  setShortInput(e.target.value)
                  selectAnswer(current.id, e.target.value)
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
            <button onClick={() => { setIndex(i => i - 1); setShortInput(answers[questions[index - 1]?.id] || '') }}
              disabled={index === 0}
              style={{ padding: '8px 16px', borderRadius: '3px', fontSize: 'var(--fs-xs)', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', opacity: index === 0 ? 0.3 : 1 }}>
              ← prev
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              {!isLast && (
                <button onClick={() => { setIndex(i => i + 1); setShortInput(answers[questions[index + 1]?.id] || '') }}
                  style={{ padding: '8px 16px', borderRadius: '3px', fontSize: 'var(--fs-xs)', background: 'var(--color-surface)', border: '1px solid var(--color-border-mid)', color: 'var(--color-text)' }}>
                  next →
                </button>
              )}
              {isLast && (
                <button onClick={submitTest}
                  style={{ padding: '8px 20px', borderRadius: '3px', fontSize: 'var(--fs-xs)', background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
                  submit
                </button>
              )}
            </div>
          </div>

          {mode === 'quiz' && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '20px', flexWrap: 'wrap' }}>
              {questions.map((q, i) => (
                <button key={i} onClick={() => setIndex(i)}
                  style={{
                    width: '24px', height: '24px', borderRadius: '3px', fontSize: '9px',
                    background: i === index ? 'var(--color-amber-bg)' : answers[q.id] ? 'var(--color-surface-2)' : 'transparent',
                    border: `1px solid ${i === index ? 'var(--color-amber)' : answers[q.id] ? 'var(--color-border-mid)' : 'var(--color-border)'}`,
                    color: i === index ? 'var(--color-amber)' : answers[q.id] ? 'var(--color-text-muted)' : 'var(--color-text-dim)',
                  }}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}

          {mode === 'fulltest' && (
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'var(--color-border-mid)', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--color-accent)', width: `${(answered / total) * 100}%`, transition: 'width 0.3s' }} />
              </div>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', whiteSpace: 'nowrap' }}>
                {answered}/{total} answered
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Review Mode ───────────────────────────────────────────────────────────────

function ReviewMode({ test, onExit }: { test: import('../../types').CompetencyTest; onExit: () => void }) {
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0]))

  function toggle(i: number) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={onExit} style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', padding: '3px 8px', borderRadius: '3px', fontSize: 'var(--fs-xs)' }}>← back</button>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', letterSpacing: '0.06em' }}>ANSWER KEY</span>
        </div>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)' }}>{flattenQuestions(test).length} questions</span>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: '14px 18px' }}>
        {test.sections.map((section, si) => (
          <div key={si} style={{ marginBottom: '8px', border: '1px solid var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
            <button className="w-full text-left"
              style={{ padding: '10px 14px', background: 'var(--color-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: openSections.has(si) ? '1px solid var(--color-border)' : 'none' }}
              onClick={() => toggle(si)}>
              <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500 }}>{section.title}</span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)' }}>{section.questions.length} questions</span>
                <span style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>{openSections.has(si) ? '▲' : '▼'}</span>
              </div>
            </button>
            {openSections.has(si) && (
              <div style={{ padding: '10px 14px', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {section.questions.map(q => (
                  <div key={q.id} style={{ padding: '10px 12px', borderRadius: '3px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', marginBottom: '6px' }}>{q.id}. {q.question}</p>
                    {q.options && (
                      <div style={{ marginBottom: '6px' }}>
                        {q.options.map((opt, oi) => (
                          <p key={oi} style={{ fontSize: 'var(--fs-xs)', color: opt === q.answer ? 'var(--color-success)' : 'var(--color-text-dim)', paddingLeft: '8px' }}>
                            {String.fromCharCode(65 + oi)}. {opt} {opt === q.answer ? '✓' : ''}
                          </p>
                        ))}
                      </div>
                    )}
                    {!q.options && (
                      <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-success)', marginBottom: '4px' }}>✓ {q.answer}</p>
                    )}
                    <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', lineHeight: 1.5, borderTop: '1px solid var(--color-border)', paddingTop: '6px', marginTop: '4px' }}>{q.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAssessmentType(type: AssessmentType): string {
  const map: Record<AssessmentType, string> = {
    knowledge_test: 'Knowledge Test',
    performance_skill: 'Performance Skill',
    build_project: 'Build Project',
    concept_understanding: 'Concept Understanding',
    measurable_output: 'Measurable Output',
    hybrid: 'Hybrid',
  }
  return map[type] || type
}

function ModeCard({ title, badge, badgeColor, description, detail, onClick, color }: {
  title: string; badge: string; badgeColor: string; description: string; detail: string; onClick: () => void; color: string
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button className="w-full text-left rounded"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        padding: '14px 16px', background: hovered ? 'var(--color-surface)' : 'var(--color-bg)',
        border: `1px solid ${hovered ? color : 'var(--color-border)'}`,
        borderLeft: `3px solid ${color}`,
        transition: 'all 0.12s',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500, color: 'var(--color-text)' }}>{title}</span>
        <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '2px', background: `color-mix(in srgb, ${badgeColor} 15%, transparent)`, color: badgeColor, border: `1px solid ${badgeColor}`, letterSpacing: '0.04em' }}>
          {badge}
        </span>
      </div>
      <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '6px' }}>{description}</p>
      <p style={{ fontSize: '10px', color: 'var(--color-text-dim)', letterSpacing: '0.04em' }}>{detail}</p>
    </button>
  )
}

function AttemptRow({ attempt, passThreshold }: { attempt: TestAttempt; passThreshold: number }) {
  const passed = attempt.pct >= passThreshold
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '3px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '2px', background: attempt.mode === 'quiz' ? 'var(--color-amber-bg)' : 'var(--color-accent-bg)', color: attempt.mode === 'quiz' ? 'var(--color-amber)' : 'var(--color-accent)', border: `1px solid ${attempt.mode === 'quiz' ? 'var(--color-amber)' : 'var(--color-accent)'}` }}>
          {attempt.mode === 'quiz' ? 'QUIZ' : 'FULL'}
        </span>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)' }}>{attempt.date}</span>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)' }}>{attempt.score}/{attempt.total}</span>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)' }}>{Math.floor(attempt.durationSeconds / 60)}m {attempt.durationSeconds % 60}s</span>
      </div>
      <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500, color: passed ? 'var(--color-success)' : 'var(--color-accent)' }}>
        {attempt.pct}%{passed ? ' ✓' : ''}
      </span>
    </div>
  )
}
