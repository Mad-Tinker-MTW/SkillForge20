import { useState } from 'react'
import type { Skill, GeneratedSkillData, CompetencyTest, PerformanceRubric, AssessmentType } from '../../types'
import { uid } from '../../lib/storage'

interface Props {
  skill: Skill
  onGenerated: (updated: Skill) => void
  onToast: (msg: string) => void
}

const ASSESSMENT_LABELS: Record<AssessmentType, string> = {
  knowledge_test: 'Knowledge Test',
  performance_skill: 'Performance Skill',
  build_project: 'Build Project',
  concept_understanding: 'Concept Understanding',
  measurable_output: 'Measurable Output',
  hybrid: 'Hybrid',
}

const ASSESSMENT_DESCRIPTIONS: Record<AssessmentType, string> = {
  knowledge_test: '100-question quiz. Best for language, facts, and recall-based skills.',
  performance_skill: 'Scored rubric. Best for music, speaking, drawing, or physical performance.',
  build_project: 'Build checklist rubric. Best for hardware, apps, and hands-on projects.',
  concept_understanding: 'Explanation rubric. Best for understanding how things work.',
  measurable_output: 'Measurement rubric with tool suggestion. Best for benchmarked output.',
  hybrid: 'Combined rubric covering both performance and knowledge.',
}

export default function AIGeneratorPanel({ skill, onGenerated, onToast }: Props) {
  const [skillInput, setSkillInput] = useState(skill.name || '')
  const [hoursPerWeek, setHoursPerWeek] = useState(3)
  const [experienceLevel, setExperienceLevel] = useState('beginner')
  const [availableTools, setAvailableTools] = useState('')
  const [endGoal, setEndGoal] = useState(skill.commit?.goal || '')
  const [definitionOfDone, setDefinitionOfDone] = useState(skill.commit?.definition || '')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<GeneratedSkillData | null>(null)

  // Assessment generation
  const [generatingAssessment, setGeneratingAssessment] = useState(false)
  const [assessmentError, setAssessmentError] = useState<string | null>(null)
  const [detectedType, setDetectedType] = useState<AssessmentType>(skill.assessmentType || 'knowledge_test')
  const [detecting, setDetecting] = useState(false)
  const [detectionReasoning, setDetectionReasoning] = useState<string | null>(null)
  const [manualOverride, setManualOverride] = useState(false)

  const hasTest = !!skill.generatedTest
  const hasRubric = !!skill.performanceRubric
  const hasAssessment = hasTest || hasRubric
  const isKnowledge = detectedType === 'knowledge_test'

  async function generate() {
    if (!skillInput.trim()) return
    setGenerating(true)
    setError(null)
    setPreview(null)

    const result = await window.api.claude.generateSkill({
      skillName: skillInput.trim(),
      constraints: { hoursPerWeek, experienceLevel, availableTools: availableTools.trim(), endGoal: endGoal.trim(), definitionOfDone: definitionOfDone.trim() },
    })

    setGenerating(false)

    if (!result.ok || !result.data) { setError(result.message || 'Generation failed.'); return }

    const clean = (arr: GeneratedSkillData['deconstruct']) => arr.filter(c => c.title?.trim().length > 0)
    result.data.deconstruct = clean(result.data.deconstruct)
    result.data.selfcorrect = clean(result.data.selfcorrect)
    result.data.barriers = clean(result.data.barriers)
    result.data.practice = clean(result.data.practice)

    setPreview(result.data)

    // Auto-detect assessment type from DOD
    if (definitionOfDone.trim()) {
      detectType(skillInput.trim(), definitionOfDone.trim())
    }
  }

  async function detectType(name: string, dod: string) {
    setDetecting(true)
    try {
      const r = await window.api.claude.detectAssessmentType({ skillName: name, definitionOfDone: dod })
      if (r.ok && r.assessmentType) {
        setDetectedType(r.assessmentType as AssessmentType)
        setDetectionReasoning(r.reasoning || null)
      }
    } catch { /* silent */ }
    setDetecting(false)
  }

  function applyGenerated(append = false) {
    if (!preview) return
    const makeCards = (arr: typeof preview.deconstruct) =>
      arr.filter(c => c.title?.trim()).map(c => ({ ...c, id: uid(), status: 'todo' as const }))

    const updated: Skill = {
      ...skill,
      commit: append ? skill.commit : { goal: preview.commit.goal, endDate: skill.commit.endDate || '', definition: preview.commit.definition, statement: preview.commit.statement },
      deconstruct: append ? [...skill.deconstruct, ...makeCards(preview.deconstruct)] : makeCards(preview.deconstruct),
      selfcorrect: append ? [...skill.selfcorrect, ...makeCards(preview.selfcorrect)] : makeCards(preview.selfcorrect),
      barriers: append ? [...skill.barriers, ...makeCards(preview.barriers)] : makeCards(preview.barriers),
      practice: append ? [...skill.practice, ...makeCards(preview.practice)] : makeCards(preview.practice),
      competencyCards: preview.competencyTest || [],
      weeklyFocus: preview.weeklyFocus || [],
      assessmentType: detectedType,
    }

    onGenerated(updated)
    setPreview(null)
    onToast(append ? 'cards appended' : 'plan generated and applied')
  }

  async function handleGenerateAssessment() {
    setGeneratingAssessment(true)
    setAssessmentError(null)

    const subSkills = skill.deconstruct.map(c => c.title).filter(Boolean)
    const dod = skill.commit?.definition || definitionOfDone || ''
    const threshold = extractThreshold(dod)

    if (isKnowledge) {
      // Generate 100-question knowledge test
      const result = await window.api.claude.generateTest({
        skillName: skill.name,
        definitionOfDone: dod,
        subSkills,
        passThreshold: threshold,
      })

      setGeneratingAssessment(false)

      if (!result.ok || !result.data) { setAssessmentError(result.message || 'Generation failed.'); return }

      const test: CompetencyTest = { ...result.data, generatedAt: new Date().toISOString(), assessmentType: detectedType }
      onGenerated({ ...skill, generatedTest: test, assessmentType: detectedType })
      onToast('Knowledge test generated, go to Competency Assessment')
    } else {
      // Generate performance rubric
      const result = await window.api.claude.generateRubric({
        skillName: skill.name,
        definitionOfDone: dod,
        subSkills,
        passThreshold: threshold,
        assessmentType: detectedType,
      })

      setGeneratingAssessment(false)

      if (!result.ok || !result.data) { setAssessmentError(result.message || 'Rubric generation failed.'); return }

      const rubric: PerformanceRubric = { ...result.data, generatedAt: new Date().toISOString() }
      onGenerated({ ...skill, performanceRubric: rubric, assessmentType: detectedType })
      onToast('Performance rubric generated, go to Competency Assessment')
    }
  }

  function extractThreshold(dod: string): number {
    const match = dod.match(/(\d+)%/)
    return match ? parseInt(match[1]) : 80
  }

  const totalCards = preview
    ? preview.deconstruct.length + preview.selfcorrect.length + preview.barriers.length + preview.practice.length
    : 0

  return (
    <div className="h-full overflow-y-auto" style={{ padding: '20px' }}>
      <div style={{ maxWidth: '560px' }}>
        <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.1em', color: 'var(--color-success)', marginBottom: '4px' }}>AI GENERATOR</p>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
          Describe the skill and your constraints. Claude generates a full five-phase plan with cards, a 7-week schedule, and competency assessment.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Field label="WHAT DO YOU WANT TO LEARN?">
            <input type="text" className="w-full rounded" style={{ padding: '8px 12px', fontSize: 'var(--fs-sm)' }}
              placeholder="e.g. Learn 100 Russian phrases for travel, Play Beethoven's 5th on keyboard..."
              value={skillInput} onChange={e => setSkillInput(e.target.value)} />
          </Field>

          <Field label="END GOAL">
            <input type="text" className="w-full rounded" style={{ padding: '8px 12px', fontSize: 'var(--fs-sm)' }}
              placeholder="What will this skill enable you to do?"
              value={endGoal} onChange={e => setEndGoal(e.target.value)} />
          </Field>

          <Field label="DEFINITION OF DONE — how will you know you reached it?">
            <input type="text" className="w-full rounded" style={{ padding: '8px 12px', fontSize: 'var(--fs-sm)' }}
              placeholder="e.g. Pass a test with 80%, Play the piece without stopping, Build working two-way communicator..."
              value={definitionOfDone} onChange={e => setDefinitionOfDone(e.target.value)} />
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginTop: '3px' }}>
              Include a percentage and Claude calibrates the assessment to that threshold. Be specific about what you must DO, not just know.
            </p>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="HOURS PER WEEK">
              <select className="w-full rounded" style={{ padding: '7px 8px', fontSize: 'var(--fs-sm)' }}
                value={hoursPerWeek} onChange={e => setHoursPerWeek(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 10].map(h => <option key={h} value={h}>{h} hrs/week</option>)}
              </select>
            </Field>
            <Field label="EXPERIENCE LEVEL">
              <select className="w-full rounded" style={{ padding: '7px 8px', fontSize: 'var(--fs-sm)' }}
                value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}>
                <option value="complete beginner">complete beginner</option>
                <option value="beginner">beginner</option>
                <option value="some exposure">some exposure</option>
                <option value="intermediate">intermediate</option>
                <option value="advanced">advanced</option>
              </select>
            </Field>
          </div>

          <Field label="AVAILABLE TOOLS AND RESOURCES (optional)">
            <input type="text" className="w-full rounded" style={{ padding: '8px 12px', fontSize: 'var(--fs-sm)' }}
              placeholder="e.g. Windows PC, keyboard, no teacher, Duolingo, Anki..."
              value={availableTools} onChange={e => setAvailableTools(e.target.value)} />
          </Field>
        </div>

        {error && (
          <div style={{ marginTop: '14px', padding: '10px 12px', borderRadius: '3px', fontSize: 'var(--fs-xs)', background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
            {error}
          </div>
        )}

        <button className="w-full rounded" style={{ marginTop: '16px', padding: '10px', fontSize: 'var(--fs-xs)', letterSpacing: '0.04em', background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)', opacity: (generating || !skillInput.trim()) ? 0.4 : 1 }}
          onClick={generate} disabled={generating || !skillInput.trim()}>
          {generating ? 'generating your plan...' : 'generate 20-hour plan'}
        </button>

        {generating && (
          <p style={{ fontSize: 'var(--fs-xs)', textAlign: 'center', color: 'var(--color-text-dim)', marginTop: '8px' }}>
            Claude is deconstructing your skill. About 15-20 seconds.
          </p>
        )}

        {/* Competency Assessment generator */}
        {skill.deconstruct.length > 0 && (
          <div style={{ marginTop: '20px', padding: '14px', borderRadius: '3px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)', marginBottom: '8px' }}>
              COMPETENCY ASSESSMENT
            </p>

            {/* Assessment type selector */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)' }}>
                  Assessment type:
                </p>
                {detecting && <span style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>detecting...</span>}
              </div>

              {!manualOverride ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ padding: '6px 10px', borderRadius: '3px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', flex: 1 }}>
                    <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-accent)', fontWeight: 500 }}>{ASSESSMENT_LABELS[detectedType]}</p>
                    <p style={{ fontSize: '10px', color: 'var(--color-text-dim)', marginTop: '2px' }}>{ASSESSMENT_DESCRIPTIONS[detectedType]}</p>
                    {detectionReasoning && (
                      <p style={{ fontSize: '10px', color: 'var(--color-text-dim)', marginTop: '2px', fontStyle: 'italic' }}>{detectionReasoning}</p>
                    )}
                  </div>
                  <button onClick={() => setManualOverride(true)} style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', padding: '4px 8px', borderRadius: '3px', fontSize: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    change
                  </button>
                </div>
              ) : (
                <div>
                  <select value={detectedType} onChange={e => { setDetectedType(e.target.value as AssessmentType); setManualOverride(false) }}
                    style={{ width: '100%', padding: '7px 8px', borderRadius: '3px', fontSize: 'var(--fs-xs)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                    {(Object.keys(ASSESSMENT_LABELS) as AssessmentType[]).map(t => (
                      <option key={t} value={t}>{ASSESSMENT_LABELS[t]} — {ASSESSMENT_DESCRIPTIONS[t]}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {skill.commit?.definition && (
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginBottom: '8px', lineHeight: 1.5 }}>
                DOD: <span style={{ color: 'var(--color-text-muted)' }}>{skill.commit.definition}</span>
              </p>
            )}

            {hasAssessment && (
              <div style={{ padding: '8px 10px', borderRadius: '3px', marginBottom: '10px', fontSize: 'var(--fs-xs)', background: 'var(--color-success-bg)', border: '1px solid var(--color-success)', color: 'var(--color-success)' }}>
                ✓ Assessment generated — go to Competency Assessment tab
              </div>
            )}
            {assessmentError && (
              <div style={{ padding: '8px 10px', borderRadius: '3px', marginBottom: '10px', fontSize: 'var(--fs-xs)', background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
                {assessmentError}
              </div>
            )}
            <button className="w-full rounded"
              style={{ padding: '8px', fontSize: 'var(--fs-xs)', background: 'var(--color-purple-bg)', border: '1px solid var(--color-purple)', color: 'var(--color-purple)', opacity: generatingAssessment ? 0.4 : 1 }}
              onClick={handleGenerateAssessment} disabled={generatingAssessment}>
              {generatingAssessment
                ? 'generating assessment...'
                : hasAssessment
                  ? `regenerate ${isKnowledge ? 'knowledge test' : 'rubric'}`
                  : `generate ${isKnowledge ? 'knowledge test' : 'performance rubric'}`}
            </button>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '10px 12px', borderRadius: '3px', fontSize: 'var(--fs-xs)', background: 'var(--color-success-bg)', border: '1px solid var(--color-success)', color: 'var(--color-success)' }}>
              Plan generated. {totalCards} cards across 4 phases.
              {preview.competencyTest?.length > 0 && ` ${preview.competencyTest.length} competency check questions.`}
              {!detecting && <span style={{ marginLeft: '6px', color: 'var(--color-text-dim)' }}>Assessment type: {ASSESSMENT_LABELS[detectedType]}</span>}
            </div>

            <PreviewSection label="DECONSTRUCT" cards={preview.deconstruct} color="var(--color-blue)" />
            <PreviewSection label="SELF-CORRECT" cards={preview.selfcorrect} color="var(--color-amber)" />
            <PreviewSection label="BARRIERS" cards={preview.barriers} color="var(--color-coral)" />
            <PreviewSection label="PRACTICE" cards={preview.practice} color="var(--color-success)" />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="flex-1 rounded"
                style={{ padding: '8px', fontSize: 'var(--fs-xs)', background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}
                onClick={() => applyGenerated(false)}>
                replace existing cards
              </button>
              <button className="flex-1 rounded"
                style={{ padding: '8px', fontSize: 'var(--fs-xs)', background: 'var(--color-blue-bg)', border: '1px solid var(--color-blue)', color: 'var(--color-blue)' }}
                onClick={() => applyGenerated(true)}>
                append to existing
              </button>
              <button className="rounded"
                style={{ padding: '8px 12px', fontSize: 'var(--fs-xs)', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}
                onClick={() => setPreview(null)}>
                discard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)' }}>{label}</label>
      {children}
    </div>
  )
}

function PreviewSection({ label, cards, color }: {
  label: string; cards: Array<{ title: string; note: string; priority: string }>; color: string
}) {
  return (
    <div>
      <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color, marginBottom: '6px' }}>
        {label} — {cards.length} cards
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {cards.map((c, i) => (
          <div key={i} style={{ padding: '7px 10px', borderRadius: '3px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text)', flex: 1 }}>{c.title}</span>
            <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '2px',
              background: c.priority === 'high' ? 'var(--color-coral-bg)' : c.priority === 'medium' ? 'var(--color-amber-bg)' : 'var(--color-teal-bg)',
              color: c.priority === 'high' ? 'var(--color-coral)' : c.priority === 'medium' ? 'var(--color-amber)' : 'var(--color-teal)',
            }}>{c.priority}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
