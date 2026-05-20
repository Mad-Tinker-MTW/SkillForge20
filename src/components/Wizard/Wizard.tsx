import { useState } from 'react'

interface WizardProps {
  onComplete: (skillName?: string) => void
}

type WizardStep = 'welcome' | 'getkey' | 'testkey' | 'firstskill' | 'done'

export default function Wizard({ onComplete }: WizardProps) {
  const [step, setStep] = useState<WizardStep>('welcome')
  const [apiKey, setApiKey] = useState('')
  const [keyVisible, setKeyVisible] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [firstSkillName, setFirstSkillName] = useState('')

  async function handleTestKey() {
    if (!apiKey.trim()) return
    setTesting(true)
    setTestResult(null)
    const result = await window.api.claude.testKey(apiKey.trim())
    setTestResult(result)
    setTesting(false)
    if (result.ok) {
      await window.api.settings.setApiKey(apiKey.trim())
    }
  }

  async function handleFinish() {
    await window.api.settings.setOnboarded()
    onComplete(firstSkillName.trim() || undefined)
  }

  const stepOrder: WizardStep[] = ['welcome', 'getkey', 'testkey', 'firstskill', 'done']
  const stepIndex = stepOrder.indexOf(step)

  return (
    <div className="flex flex-col items-center justify-center h-full px-8"
      style={{ background: 'var(--color-bg)' }}>

      {/* Progress dots */}
      <div className="flex gap-2 mb-10">
        {stepOrder.map((s, i) => (
          <div key={s} className="rounded-full transition-all duration-300"
            style={{
              width: '6px', height: '6px',
              background: i <= stepIndex ? 'var(--color-accent)' : 'var(--color-border-mid)',
            }} />
        ))}
      </div>

      <div className="w-full max-w-lg">

        {step === 'welcome' && (
          <div className="space-y-6">
            <div>
              <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.1em', color: 'var(--color-accent)', marginBottom: '8px' }}>
                SKILLFORGE20 — MTW
              </p>
              <h1 style={{ fontSize: 'var(--fs-xl)', fontWeight: 500, marginBottom: '12px' }}>
                Rapid skill acquisition, done right.
              </h1>
              <p style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.7, color: 'var(--color-text-muted)' }}>
                This app applies Josh Kaufman's five-step framework to any skill you want to learn.
                You define the skill. Claude deconstructs it into a structured 20-hour learning plan.
                You track sessions, log progress, and finish with a competency test proving you learned it.
              </p>
            </div>
            <InfoBox>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '6px', fontSize: 'var(--fs-xs)' }}>What you need:</p>
              <p style={{ color: 'var(--color-text)' }}>→ An Anthropic account (free to create)</p>
              <p style={{ color: 'var(--color-text)' }}>→ An API key with credits</p>
              <p style={{ color: 'var(--color-text)' }}>→ A skill you want to learn</p>
            </InfoBox>
            <WizardBtn onClick={() => setStep('getkey')}>Get started →</WizardBtn>
          </div>
        )}

        {step === 'getkey' && (
          <div className="space-y-6">
            <div>
              <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.1em', color: 'var(--color-blue)', marginBottom: '8px' }}>
                STEP 1 OF 3 — API KEY
              </p>
              <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 500, marginBottom: '10px' }}>Get your Anthropic API key</h2>
              <p style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.7, color: 'var(--color-text-muted)' }}>
                Your key is stored locally, encrypted. It never leaves your machine except to talk directly to Anthropic's API.
              </p>
            </div>
            <InfoBox>
              <p style={{ fontWeight: 500, color: 'var(--color-text)', marginBottom: '8px', fontSize: 'var(--fs-sm)' }}>How to get your key:</p>
              {['Click the button below to open the Anthropic console','Create an account or sign in','Go to API Keys in the left sidebar','Click Create Key, give it a name, copy it','Add a small credit balance under Settings → Billing'].map((s, i) => (
                <p key={i} style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-xs)' }}>{i+1}. {s}</p>
              ))}
            </InfoBox>
            <button className="w-full py-2 rounded"
              style={{ background: 'var(--color-blue-bg)', border: '1px solid var(--color-blue)', color: 'var(--color-blue)', fontSize: 'var(--fs-xs)', letterSpacing: '0.04em' }}
              onClick={() => window.api.shell.openExternal('https://console.anthropic.com/settings/keys')}>
              Open Anthropic Console ↗
            </button>
            <WizardBtn onClick={() => setStep('testkey')}>I have my key →</WizardBtn>
            <BackBtn onClick={() => setStep('welcome')} />
          </div>
        )}

        {step === 'testkey' && (
          <div className="space-y-6">
            <div>
              <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.1em', color: 'var(--color-blue)', marginBottom: '8px' }}>
                STEP 2 OF 3 — TEST CONNECTION
              </p>
              <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 500, marginBottom: '10px' }}>Paste your API key</h2>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                Keys start with <span style={{ color: 'var(--color-text)' }}>sk-ant-</span> and are about 100 characters long.
              </p>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={keyVisible ? 'text' : 'password'}
                className="w-full rounded"
                style={{ padding: '8px 40px 8px 12px', fontSize: 'var(--fs-xs)' }}
                placeholder="sk-ant-api03-..."
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setTestResult(null) }}
              />
              <button onClick={() => setKeyVisible(!keyVisible)}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--color-text-dim)', fontSize: '10px' }}>
                {keyVisible ? 'hide' : 'show'}
              </button>
            </div>
            {testResult && (
              <div style={{
                padding: '10px 12px', borderRadius: '3px', fontSize: 'var(--fs-xs)',
                background: testResult.ok ? 'var(--color-success-bg)' : 'var(--color-accent-bg)',
                border: `1px solid ${testResult.ok ? 'var(--color-success)' : 'var(--color-accent)'}`,
                color: testResult.ok ? 'var(--color-success)' : 'var(--color-accent)',
              }}>
                {testResult.ok ? '✓ ' : '✗ '}{testResult.message}
              </div>
            )}
            <button className="w-full py-2 rounded"
              style={{ background: 'var(--color-blue-bg)', border: '1px solid var(--color-blue)', color: 'var(--color-blue)', fontSize: 'var(--fs-xs)', opacity: (testing || !apiKey.trim()) ? 0.4 : 1 }}
              onClick={handleTestKey}
              disabled={testing || !apiKey.trim()}>
              {testing ? 'Testing connection...' : 'Test connection'}
            </button>
            {testResult?.ok && <WizardBtn onClick={() => setStep('firstskill')}>Connection confirmed →</WizardBtn>}
            <BackBtn onClick={() => setStep('getkey')} />
          </div>
        )}

        {step === 'firstskill' && (
          <div className="space-y-6">
            <div>
              <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.1em', color: 'var(--color-amber)', marginBottom: '8px' }}>
                STEP 3 OF 3 — FIRST SKILL
              </p>
              <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 500, marginBottom: '10px' }}>What do you want to learn?</h2>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                Name the skill. Be specific enough that someone could picture what you are doing. Claude will generate the full plan once you are inside the app.
              </p>
            </div>
            <div className="space-y-1">
              <label style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.1em', color: 'var(--color-text-dim)' }}>SKILL NAME</label>
              <input
                type="text"
                className="w-full rounded"
                style={{ padding: '8px 12px', fontSize: 'var(--fs-sm)' }}
                placeholder="e.g. Learn 100 Russian phrases, Play guitar, Build REST APIs..."
                value={firstSkillName}
                onChange={(e) => setFirstSkillName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && firstSkillName.trim()) setStep('done') }}
                autoFocus
              />
            </div>
            <InfoBox>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-xs)' }}>
                Once inside the app, go to the AI Generate tab. Claude will ask about your constraints and build your full 5-phase learning plan with cards, a 7-week schedule, and a 100-question competency test.
              </p>
            </InfoBox>
            <WizardBtn onClick={() => setStep('done')} disabled={!firstSkillName.trim()}>
              {firstSkillName.trim() ? `Start with "${firstSkillName}" →` : 'Enter a skill name to continue'}
            </WizardBtn>
            <BackBtn onClick={() => setStep('testkey')} />
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-6">
            <div>
              <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.1em', color: 'var(--color-success)', marginBottom: '8px' }}>READY</p>
              <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 500, marginBottom: '10px' }}>You are set up.</h2>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                API key saved. {firstSkillName && `"${firstSkillName}" has been created and is ready.`}
                {' '}First thing to do: fill out the pre-commit tab, then hit AI Generate to build your plan.
              </p>
            </div>
            <InfoBox>
              <p style={{ fontWeight: 500, color: 'var(--color-text)', marginBottom: '8px', fontSize: 'var(--fs-sm)' }}>What happens next:</p>
              {['Your skill is created and selected','Fill out pre-commit (tab 00) — goal, date, commitment','Use AI Generate to build your learning plan','Work through the phases and log every session','Use the test generator when you are ready to assess'].map((s, i) => (
                <p key={i} style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-xs)' }}>{i+1}. {s}</p>
              ))}
            </InfoBox>
            <WizardBtn onClick={handleFinish}>Open the tracker →</WizardBtn>
          </div>
        )}

      </div>
    </div>
  )
}

function WizardBtn({ onClick, children, disabled = false }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button className="w-full rounded" disabled={disabled}
      style={{ padding: '10px', fontSize: 'var(--fs-xs)', letterSpacing: '0.04em', background: disabled ? 'transparent' : 'var(--color-accent-bg)', border: `1px solid ${disabled ? 'var(--color-border)' : 'var(--color-accent)'}`, color: disabled ? 'var(--color-text-dim)' : 'var(--color-accent)', opacity: disabled ? 0.5 : 1 }}
      onClick={onClick}>
      {children}
    </button>
  )
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button className="w-full rounded" onClick={onClick}
      style={{ padding: '6px', fontSize: 'var(--fs-xs)', letterSpacing: '0.1em', background: 'transparent', border: 'none', color: 'var(--color-text-dim)' }}>
      ← back
    </button>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px', borderRadius: '3px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', lineHeight: 1.7 }}>
      {children}
    </div>
  )
}
