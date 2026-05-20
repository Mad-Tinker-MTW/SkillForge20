import { useState } from 'react'
import type { Skill, WeeklyFocus } from '../../types'

interface Props {
  skill: Skill
  onToggleTask: (key: string, val: boolean) => void
}

const DEFAULT_WEEKS: WeeklyFocus[] = [
  { week: 1, focus: 'Setup and planning', goal: 'Pre-commit complete. All barriers identified. Sub-skills ranked. Environment ready.', tasks: ['Complete pre-commit tab with end date and definition of done','Import or build deconstruct cards for this skill','Review and rank all deconstruct cards by priority','Identify and begin clearing all barriers','Confirm practice environment is functional'] },
  { week: 2, focus: 'Sessions 1-2 — first baseline', goal: 'First sub-skill baseline established. Output or results practiced. Failures documented.', tasks: ['Clear all remaining barriers before first session','Complete session 1: first sub-skill at baseline','Complete session 2: variation or deeper config','Log both sessions with detailed notes','Mark self-correct cards used this week'] },
  { week: 3, focus: 'Sessions 3-4 — breadth', goal: 'All core sub-skills touched at least once. Cross-area comparison started.', tasks: ['Complete session 3: second core sub-skill','Complete session 4: third core sub-skill or edge cases','Update deconstruct card status as sub-skills land','Note friction points for build or synthesis later','Review session log for patterns'] },
  { week: 4, focus: 'Sessions 5-6 — supporting skills', goal: 'Supporting sub-skills covered. Medium priority cards mostly done.', tasks: ['Complete session 5: first supporting sub-skill','Complete session 6: second supporting sub-skill','Move completed cards to done','Document friction and pain points','Check 7-week plan progress against hours logged'] },
  { week: 5, focus: 'Session 7 — comparison and synthesis', goal: 'Full comparison or synthesis complete. Clear picture of what works and what does not.', tasks: ['Complete session 7: synthesis or comparison session','Build comparison matrix or synthesis document','Identify top 3 friction points or failure modes','Begin outlining final artifact or build document','Update all card statuses'] },
  { week: 6, focus: 'Session 8 — final artifact', goal: 'Final artifact produced. Skills synthesized into something tangible.', tasks: ['Complete session 8: final artifact session','Produce the tangible output defined in your practice block','Document what the existing approach gets wrong and why','Log session 8 with artifact notes attached','Run through competency check questions'] },
  { week: 7, focus: 'Buffer and final assessment', goal: 'Session log clean. Final artifact complete. 20-hour minimum confirmed. Definition of done tested.', tasks: ['Review full session log for gaps','Finalize the final artifact','Confirm 20-hour minimum on progress bar','Generate and take the competency test','Export JSON backup of all skill data'] },
]

export default function SchedulePanel({ skill, onToggleTask }: Props) {
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set([0]))

  // Use AI-generated weekly focus if available, otherwise default
  const weeks: WeeklyFocus[] = (skill.weeklyFocus && skill.weeklyFocus.length === 7)
    ? skill.weeklyFocus
    : DEFAULT_WEEKS

  function toggle(i: number) {
    setOpenWeeks(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const totalTasks = weeks.reduce((s, w) => s + w.tasks.length, 0)
  const doneTasks = Object.values(skill.weekTasks || {}).filter(Boolean).length
  const isAIGenerated = !!(skill.weeklyFocus && skill.weeklyFocus.length === 7)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)' }}>7-WEEK PLAN</span>
          {isAIGenerated && (
            <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '2px', background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}>
              AI generated for this skill
            </span>
          )}
        </div>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)' }}>
          {doneTasks} / {totalTasks} tasks checked
        </span>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {weeks.map((week, wi) => {
          const isOpen = openWeeks.has(wi)
          const weekDone = week.tasks.filter((_, ti) => skill.weekTasks?.[`w${wi}_t${ti}`]).length
          const allDone = weekDone === week.tasks.length

          return (
            <div key={wi} style={{ border: `1px solid ${allDone ? 'rgba(29,158,117,0.3)' : 'var(--color-border)'}`, borderRadius: '3px', overflow: 'hidden' }}>
              <button className="w-full text-left"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: allDone ? 'rgba(29,158,117,0.06)' : 'var(--color-surface)', borderBottom: isOpen ? '1px solid var(--color-border)' : 'none' }}
                onClick={() => toggle(wi)}>
                <div>
                  <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500, color: allDone ? 'var(--color-success)' : 'var(--color-text)' }}>
                    Week {week.week} — {week.focus}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: 'var(--fs-xs)', color: allDone ? 'var(--color-success)' : 'var(--color-text-dim)' }}>
                    {weekDone}/{week.tasks.length}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {isOpen && (
                <div style={{ padding: '12px 14px', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{week.goal}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {week.tasks.map((task, ti) => {
                      const key = `w${wi}_t${ti}`
                      const checked = !!skill.weekTasks?.[key]
                      return (
                        <label key={ti} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={checked}
                            onChange={e => onToggleTask(key, e.target.checked)}
                            style={{ marginTop: '2px', accentColor: 'var(--color-accent)', flexShrink: 0 }} />
                          <span style={{ fontSize: 'var(--fs-xs)', color: checked ? 'var(--color-text-dim)' : 'var(--color-text-muted)', textDecoration: checked ? 'line-through' : 'none', lineHeight: 1.5 }}>
                            {task}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
