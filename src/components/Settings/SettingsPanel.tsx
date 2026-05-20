import { useState, useEffect } from 'react'

interface Props {
  onResetToWizard: () => void
  onToast: (msg: string) => void
}

export default function SettingsPanel({ onResetToWizard, onToast }: Props) {
  const [currentKey, setCurrentKey] = useState('')
  const [newKey, setNewKey] = useState('')
  const [keyVisible, setKeyVisible] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [dataPath, setDataPath] = useState('')
  const [zoom, setZoom] = useState(1.0)

  useEffect(() => {
    window.api.settings.getApiKey().then(k => setCurrentKey(k || ''))
    window.api.skills.getPath().then(p => setDataPath(p))
    window.api.settings.getZoom().then(z => setZoom(z))
  }, [])

  async function handleTestAndSave() {
    if (!newKey.trim()) return
    setTesting(true)
    setTestResult(null)
    const result = await window.api.claude.testKey(newKey.trim())
    setTestResult(result)
    setTesting(false)
    if (result.ok) {
      await window.api.settings.setApiKey(newKey.trim())
      setCurrentKey(newKey.trim())
      setNewKey('')
      onToast('API key updated')
    }
  }

  async function handleZoomChange(val: number) {
    const z = Math.max(0.7, Math.min(2.0, parseFloat(val.toFixed(1))))
    setZoom(z)
    await window.api.settings.setZoom(z)
    document.documentElement.style.setProperty('--font-scale', String(z))
  }

  async function handleReset() {
    if (!confirm('This will clear your API key and return to the setup wizard. Your skill data is kept.')) return
    await window.api.settings.clearApiKey()
    onResetToWizard()
  }

  const maskedKey = currentKey ? currentKey.slice(0, 12) + '...' + currentKey.slice(-4) : 'none'

  return (
    <div className="h-full overflow-y-auto" style={{ padding: '20px' }}>
      <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        <div>
          <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)', marginBottom: '4px' }}>SETTINGS</p>
          <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 500 }}>Configuration</h2>
        </div>

        <Section label="DISPLAY ZOOM">
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
            Adjust text and UI scale. Use this if text is too small or too large for your display.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="rounded" onClick={() => handleZoomChange(zoom - 0.1)}
              style={{ padding: '5px 12px', fontSize: 'var(--fs-sm)', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>−</button>
            <span style={{ fontSize: 'var(--fs-sm)', minWidth: '48px', textAlign: 'center', color: 'var(--color-text)' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button className="rounded" onClick={() => handleZoomChange(zoom + 0.1)}
              style={{ padding: '5px 12px', fontSize: 'var(--fs-sm)', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>+</button>
            <button className="rounded" onClick={() => handleZoomChange(1.0)}
              style={{ padding: '5px 10px', fontSize: 'var(--fs-xs)', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}>reset</button>
          </div>
        </Section>

        <Section label="CURRENT API KEY">
          <p style={{ fontSize: 'var(--fs-sm)', fontFamily: 'Courier New, monospace', color: 'var(--color-text-muted)', padding: '6px 0' }}>
            {maskedKey}
          </p>
        </Section>

        <Section label="REPLACE API KEY">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <input type={keyVisible ? 'text' : 'password'} className="w-full rounded"
                style={{ padding: '7px 36px 7px 10px', fontSize: 'var(--fs-xs)' }}
                placeholder="sk-ant-api03-..."
                value={newKey}
                onChange={e => { setNewKey(e.target.value); setTestResult(null) }} />
              <button onClick={() => setKeyVisible(!keyVisible)}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--color-text-dim)', fontSize: '10px', cursor: 'pointer' }}>
                {keyVisible ? 'hide' : 'show'}
              </button>
            </div>
            {testResult && (
              <div style={{ padding: '8px 10px', borderRadius: '3px', fontSize: 'var(--fs-xs)', background: testResult.ok ? 'var(--color-success-bg)' : 'var(--color-accent-bg)', border: `1px solid ${testResult.ok ? 'var(--color-success)' : 'var(--color-accent)'}`, color: testResult.ok ? 'var(--color-success)' : 'var(--color-accent)' }}>
                {testResult.ok ? '✓ ' : '✗ '}{testResult.message}
              </div>
            )}
            <button className="w-full rounded"
              style={{ padding: '7px', fontSize: 'var(--fs-xs)', background: 'var(--color-blue-bg)', border: '1px solid var(--color-blue)', color: 'var(--color-blue)', opacity: (testing || !newKey.trim()) ? 0.4 : 1 }}
              onClick={handleTestAndSave} disabled={testing || !newKey.trim()}>
              {testing ? 'testing...' : 'test and save'}
            </button>
          </div>
        </Section>

        <Section label="SKILL DATA LOCATION">
          <p style={{ fontSize: 'var(--fs-xs)', wordBreak: 'break-all', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            {dataPath || 'loading...'}
          </p>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginTop: '4px' }}>
            skills.json — edit directly or export JSON from the sidebar
          </p>
        </Section>

        <Section label="DANGER ZONE">
          <button className="rounded"
            style={{ padding: '7px 14px', fontSize: 'var(--fs-xs)', background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}
            onClick={handleReset}>
            reset API key and return to wizard
          </button>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginTop: '6px' }}>
            Skill data is not deleted. Only the API key and onboarding state are cleared.
          </p>
        </Section>

        <Section label="ABOUT">
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)' }}>SkillForge20 v1.3 — Mad Tinker's Workshop</p>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginTop: '3px' }}>
            Electron + React + TypeScript. Claude API via Anthropic SDK.
          </p>
        </Section>

      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', color: 'var(--color-text-dim)', marginBottom: '8px' }}>{label}</p>
      <div style={{ padding: '14px', borderRadius: '3px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {children}
      </div>
    </div>
  )
}
