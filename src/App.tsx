import { useState, useEffect, useCallback } from 'react'
import type { SkillDB } from './types'
import Wizard from './components/Wizard/Wizard'
import MainApp from './components/MainApp'
import TitleBar from './components/TitleBar'
import { loadDB, emptySkill, setSkill, getDB } from './lib/storage'

type AppView = 'loading' | 'newuser' | 'userselect' | 'wizard' | 'app'

// ── NewUserView ───────────────────────────────────────────────────────────────

function NewUserView({ onComplete, onBack }: {
  onComplete: (username: string, apiKey: string) => Promise<boolean>
  onBack?: () => void
}) {
  const [username, setUsername] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [keyVisible, setKeyVisible] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function handleTest() {
    if (!apiKey.trim()) return
    setTesting(true); setTestResult(null)
    const result = await window.api.claude.testKey(apiKey.trim())
    setTesting(false); setTestResult(result)
  }

  async function handleCreate() {
    if (!username.trim()) { setError('Enter a username.'); return }
    if (!apiKey.trim()) { setError('Enter an API key.'); return }
    setCreating(true); setError('')
    const ok = await onComplete(username.trim(), apiKey.trim())
    if (!ok) { setError('Username already exists. Choose a different name.'); setCreating(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px', background: 'var(--color-bg)' }}>
      <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.1em', color: 'var(--color-accent)', marginBottom: '8px' }}>NEW USER — SKILLFORGE20</p>
          <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 500, marginBottom: '10px' }}>Create your profile</h2>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
            Each user gets their own skills file and API key stored separately.
          </p>
        </div>

        <div>
          <label style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.1em', color: 'var(--color-text-dim)', display: 'block', marginBottom: '5px' }}>USERNAME</label>
          <input type="text" className="w-full rounded"
            style={{ padding: '8px 12px', fontSize: 'var(--fs-sm)' }}
            placeholder="e.g. Francisco"
            value={username}
            onChange={e => { setUsername(e.target.value); setError('') }}
            autoFocus
          />
        </div>

        <div>
          <label style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.1em', color: 'var(--color-text-dim)', display: 'block', marginBottom: '5px' }}>ANTHROPIC API KEY</label>
          <div style={{ position: 'relative' }}>
            <input type={keyVisible ? 'text' : 'password'} className="w-full rounded"
              style={{ padding: '8px 40px 8px 12px', fontSize: 'var(--fs-xs)' }}
              placeholder="sk-ant-api03-..."
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setTestResult(null) }}
            />
            <button onClick={() => setKeyVisible(!keyVisible)}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--color-text-dim)', fontSize: '10px', cursor: 'pointer' }}>
              {keyVisible ? 'hide' : 'show'}
            </button>
          </div>
        </div>

        {testResult && (
          <div style={{ padding: '8px 10px', borderRadius: '3px', fontSize: 'var(--fs-xs)', background: testResult.ok ? 'var(--color-success-bg)' : 'var(--color-accent-bg)', border: `1px solid ${testResult.ok ? 'var(--color-success)' : 'var(--color-accent)'}`, color: testResult.ok ? 'var(--color-success)' : 'var(--color-accent)' }}>
            {testResult.ok ? '✓ ' : '✗ '}{testResult.message}
          </div>
        )}

        {error && (
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-accent)' }}>{error}</p>
        )}

        <button className="w-full rounded"
          style={{ padding: '8px', fontSize: 'var(--fs-xs)', background: 'var(--color-blue-bg)', border: '1px solid var(--color-blue)', color: 'var(--color-blue)', opacity: (testing || !apiKey.trim()) ? 0.4 : 1 }}
          onClick={handleTest} disabled={testing || !apiKey.trim()}>
          {testing ? 'Testing...' : 'Test API connection'}
        </button>

        <button className="w-full rounded"
          style={{ padding: '10px', fontSize: 'var(--fs-xs)', background: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)', opacity: (creating || !username.trim() || !apiKey.trim()) ? 0.4 : 1 }}
          onClick={handleCreate} disabled={creating || !username.trim() || !apiKey.trim()}>
          {creating ? 'Creating...' : 'Create profile and continue'}
        </button>

        {onBack && (
          <button className="w-full rounded"
            style={{ padding: '6px', background: 'transparent', border: 'none', color: 'var(--color-text-dim)', fontSize: 'var(--fs-xs)' }}
            onClick={onBack}>
            ← back
          </button>
        )}
      </div>
    </div>
  )
}

// ── UserSelectView ────────────────────────────────────────────────────────────

function UserSelectView({ users, currentUser, onSelect, onNewUser }: {
  users: string[]
  currentUser: string
  onSelect: (username: string) => Promise<void>
  onNewUser: (username: string, apiKey: string) => Promise<boolean>
}) {
  const [showNew, setShowNew] = useState(false)

  if (showNew) {
    return (
      <NewUserView
        onComplete={async (username, apiKey) => {
          const ok = await onNewUser(username, apiKey)
          return ok
        }}
        onBack={() => setShowNew(false)}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px', background: 'var(--color-bg)' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <p style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.1em', color: 'var(--color-accent)', marginBottom: '8px' }}>SKILLFORGE20</p>
        <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 500, marginBottom: '20px' }}>Select user</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          {users.map(u => (
            <button key={u}
              style={{ width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: '3px', fontSize: 'var(--fs-sm)', background: u === currentUser ? 'var(--color-accent-bg)' : 'var(--color-surface)', border: `1px solid ${u === currentUser ? 'var(--color-accent)' : 'var(--color-border)'}`, color: u === currentUser ? 'var(--color-accent)' : 'var(--color-text)', cursor: 'pointer' }}
              onClick={() => onSelect(u)}>
              {u}
              {u === currentUser && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-dim)', marginLeft: '8px' }}>current</span>}
            </button>
          ))}
        </div>

        <button className="w-full rounded"
          style={{ padding: '10px', fontSize: 'var(--fs-xs)', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
          onClick={() => setShowNew(true)}>
          + add new user
        </button>
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<AppView>('loading')
  const [users, setUsers] = useState<string[]>([])
  const [currentUser, setCurrentUser] = useState('')
  const [initialSkillId, setInitialSkillId] = useState<string | null>(null)

  const selectUserAndProceed = useCallback(async (username: string) => {
    await window.api.user.setActive(username)
    setCurrentUser(username)
    await loadDB()
    const keys = Object.keys(getDB())
    setInitialSkillId(keys.length > 0 ? keys[0] : null)
    const onboarded = await window.api.settings.isOnboarded()
    const apiKey = await window.api.settings.getApiKey()
    setView(onboarded && apiKey ? 'app' : 'wizard')
  }, [])

  useEffect(() => {
    async function init() {
      const zoom = await window.api.settings.getZoom()
      document.documentElement.style.setProperty('--font-scale', String(zoom))
      window.api.window.onBoundsChange((bounds) => {
        const scale = Math.max(0.8, Math.min(2.0, bounds.width / 1280))
        document.documentElement.style.setProperty('--font-scale', String(scale))
      })

      const userList = await window.api.user.list()
      setUsers(userList)

      if (userList.length === 0) {
        setView('newuser')
      } else if (userList.length === 1) {
        await selectUserAndProceed(userList[0])
      } else {
        // Restore last active user highlight if any
        const active = await window.api.user.getActive()
        if (active) setCurrentUser(active)
        setView('userselect')
      }
    }
    init()
  }, [selectUserAndProceed])

  async function handleNewUser(username: string, apiKey: string): Promise<boolean> {
    const ok = await window.api.user.create(username, apiKey)
    if (!ok) return false
    await window.api.settings.setOnboarded()
    setCurrentUser(username)
    await loadDB()
    setInitialSkillId(null)
    // Refresh user list
    const userList = await window.api.user.list()
    setUsers(userList)
    setView('app')
    return true
  }

  function handleWizardComplete(skillName?: string) {
    if (skillName && skillName.trim()) {
      const skill = emptySkill(skillName.trim())
      setSkill(skill.id, skill)
      setInitialSkillId(skill.id)
    }
    setView('app')
  }

  async function handleSwitchUser() {
    const userList = await window.api.user.list()
    setUsers(userList)
    setView('userselect')
  }

  async function handleImportAsNewUser(importedDB: SkillDB, username: string): Promise<boolean> {
    const currentKey = await window.api.settings.getApiKey()
    const ok = await window.api.user.create(username, currentKey)
    if (!ok) return false
    await window.api.skills.save(importedDB)
    await loadDB()
    const keys = Object.keys(importedDB)
    setInitialSkillId(keys.length > 0 ? keys[0] : null)
    const userList = await window.api.user.list()
    setUsers(userList)
    setCurrentUser(username)
    return true
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <TitleBar />
      <div className="flex-1 overflow-hidden">
        {view === 'loading' && (
          <div className="flex items-center justify-center h-full"
            style={{ color: 'var(--color-text-dim)', fontSize: 'var(--fs-xs)', letterSpacing: '0.1em' }}>
            INITIALIZING...
          </div>
        )}
        {view === 'newuser' && (
          <NewUserView onComplete={handleNewUser} />
        )}
        {view === 'userselect' && (
          <UserSelectView
            users={users}
            currentUser={currentUser}
            onSelect={selectUserAndProceed}
            onNewUser={handleNewUser}
          />
        )}
        {view === 'wizard' && (
          <Wizard onComplete={handleWizardComplete} />
        )}
        {view === 'app' && (
          <MainApp
            key={currentUser}
            initialSkillId={initialSkillId}
            currentUser={currentUser}
            onResetToWizard={() => setView('wizard')}
            onSwitchUser={handleSwitchUser}
            onImportAsNewUser={handleImportAsNewUser}
          />
        )}
      </div>
    </div>
  )
}
