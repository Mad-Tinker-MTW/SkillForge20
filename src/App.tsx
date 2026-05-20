import { useState, useEffect } from 'react'
import Wizard from './components/Wizard/Wizard'
import MainApp from './components/MainApp'
import TitleBar from './components/TitleBar'
import { loadDB, emptySkill, setSkill } from './lib/storage'

type AppView = 'loading' | 'wizard' | 'app'

export default function App() {
  const [view, setView] = useState<AppView>('loading')
  const [initialSkillId, setInitialSkillId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      await loadDB()

      // Apply saved zoom factor
      const zoom = await window.api.settings.getZoom()
      document.documentElement.style.setProperty('--font-scale', String(zoom))

      // Listen for window resize and update font scale
      window.api.window.onBoundsChange((bounds) => {
        const scale = Math.max(0.8, Math.min(2.0, bounds.width / 1280))
        document.documentElement.style.setProperty('--font-scale', String(scale))
      })

      const onboarded = await window.api.settings.isOnboarded()
      const key = await window.api.settings.getApiKey()
      if (onboarded && key) {
        setView('app')
      } else {
        setView('wizard')
      }
    }
    init()
  }, [])

  function handleWizardComplete(skillName?: string) {
    if (skillName && skillName.trim()) {
      const skill = emptySkill(skillName.trim())
      setSkill(skill.id, skill)
      setInitialSkillId(skill.id)
    }
    setView('app')
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
        {view === 'wizard' && (
          <Wizard onComplete={handleWizardComplete} />
        )}
        {view === 'app' && (
          <MainApp
            initialSkillId={initialSkillId}
            onResetToWizard={() => setView('wizard')}
          />
        )}
      </div>
    </div>
  )
}
