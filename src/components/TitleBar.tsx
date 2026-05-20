import { useState, useEffect } from 'react'

export default function TitleBar() {
  const [isMax, setIsMax] = useState(false)
  const [zoom, setZoom] = useState(1.0)

  useEffect(() => {
    window.api.settings.getZoom().then(setZoom)
  }, [])

  async function handleZoom(delta: number) {
    const next = Math.max(0.7, Math.min(2.0, parseFloat((zoom + delta).toFixed(1))))
    setZoom(next)
    await window.api.settings.setZoom(next)
    document.documentElement.style.setProperty('--font-scale', String(next))
  }

  async function handleMaximize() {
    await window.api.window.maximize()
    const max = await window.api.window.isMaximized()
    setIsMax(max)
  }

  return (
    <div
      className="titlebar-drag flex items-center justify-between shrink-0"
      style={{
        height: '36px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        paddingLeft: '14px',
        paddingRight: '8px',
      }}
    >
      {/* Left — branding */}
      <div className="titlebar-no-drag flex items-center gap-3">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: 'var(--color-accent)',
            boxShadow: '0 0 6px var(--color-accent)',
          }} />
          <span style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.1em', color: 'var(--color-text-dim)' }}>
            // SKILLFORGE20
          </span>
          <span style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'var(--color-text-dim)', opacity: 0.5 }}>
            MTW v1.3
          </span>
        </div>
      </div>

      {/* Right — zoom + window controls */}
      <div className="titlebar-no-drag flex items-center gap-1">
        {/* Zoom controls */}
        <button onClick={() => handleZoom(-0.1)}
          style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', width: '22px', height: '22px', fontSize: '12px' }}
          title="Zoom out">
          −
        </button>
        <span style={{ fontSize: '9px', color: 'var(--color-text-dim)', minWidth: '28px', textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => handleZoom(0.1)}
          style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', width: '22px', height: '22px', fontSize: '12px' }}
          title="Zoom in">
          +
        </button>

        <div style={{ width: '1px', height: '16px', background: 'var(--color-border)', margin: '0 4px' }} />

        {/* Window controls */}
        <WinBtn onClick={() => window.api.window.minimize()} title="Minimize">_</WinBtn>
        <WinBtn onClick={handleMaximize} title={isMax ? 'Restore' : 'Maximize'}>
          {isMax ? '❐' : '□'}
        </WinBtn>
        <WinBtn
          onClick={() => window.api.window.close()}
          title="Close"
          danger
        >×</WinBtn>
      </div>
    </div>
  )
}

function WinBtn({ onClick, children, title, danger = false }: {
  onClick: () => void
  children: React.ReactNode
  title?: string
  danger?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '26px',
        height: '26px',
        fontSize: '12px',
        background: hovered ? (danger ? 'var(--color-accent-bg)' : 'var(--color-surface-2)') : 'transparent',
        border: `1px solid ${hovered ? (danger ? 'var(--color-accent)' : 'var(--color-border-mid)') : 'var(--color-border)'}`,
        color: hovered ? (danger ? 'var(--color-accent)' : 'var(--color-text)') : 'var(--color-text-dim)',
      }}
    >
      {children}
    </button>
  )
}
