// Icone SVG di RELAY OS (niente emoji: leggibili, coerenti, accessibili).
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export type IconName = 'mail' | 'folder' | 'file' | 'table' | 'network' | 'monitor' | 'trash' | 'lock' | 'relay' | 'bell' | 'power' | 'back' | 'alert' | 'check'

export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  let d: JSX.Element
  switch (name) {
    case 'mail': d = <><rect x="3" y="5" width="18" height="14" rx="1" {...P} /><path d="M3 6l9 7 9-7" {...P} /></>; break
    case 'folder': d = <path d="M3 7h6l2 2h10v10H3z" {...P} />; break
    case 'file': d = <><path d="M6 3h8l4 4v14H6z" {...P} /><path d="M14 3v4h4M9 12h6M9 16h6" {...P} /></>; break
    case 'table': d = <><rect x="3" y="4" width="18" height="16" {...P} /><path d="M3 9h18M3 14h18M9 4v16" {...P} /></>; break
    case 'network': d = <><rect x="2" y="3" width="7" height="5" {...P} /><rect x="15" y="3" width="7" height="5" {...P} /><rect x="8.5" y="16" width="7" height="5" {...P} /><path d="M5.5 8v3h13V8M12 11v5" {...P} /></>; break
    case 'monitor': d = <><rect x="3" y="4" width="18" height="12" {...P} /><path d="M8 20h8M12 16v4M6 12l3-3 3 2 5-5" {...P} /></>; break
    case 'trash': d = <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" {...P} /></>; break
    case 'lock': d = <><rect x="5" y="11" width="14" height="10" {...P} /><path d="M8 11V7a4 4 0 018 0v4" {...P} /></>; break
    case 'relay': d = <><path d="M3 9h13l-3-3M21 15H8l3 3" {...P} strokeWidth={2.2} /></>; break
    case 'bell': d = <><path d="M6 17V11a6 6 0 0112 0v6l2 2H4z" {...P} /><path d="M10 21h4" {...P} /></>; break
    case 'power': d = <><path d="M12 3v8" {...P} /><path d="M7 6a8 8 0 1010 0" {...P} /></>; break
    case 'back': d = <path d="M15 5l-7 7 7 7" {...P} />; break
    case 'alert': d = <><path d="M12 3l10 18H2z" {...P} /><path d="M12 10v5M12 18v.5" {...P} /></>; break
    case 'check': d = <path d="M4 12l5 5L20 6" {...P} strokeWidth={2.2} />; break
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      {d}
    </svg>
  )
}

// Icone "piene" del desktop e di Esplora file (cartella color carta da pacchi, file bianco).
export function FolderGlyph({ size = 44, locked = false }: { size?: number; locked?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path d="M4 12a2 2 0 012-2h12l4 4h20a2 2 0 012 2v4H4z" fill="#c89a4a" />
      <path d="M4 18h40v20a2 2 0 01-2 2H6a2 2 0 01-2-2z" fill="#e3b765" />
      <path d="M4 18h40v3H4z" fill="#f0c97a" />
      {locked && (
        <g transform="translate(28 24)">
          <rect x="0" y="6" width="14" height="11" rx="1.5" fill="#1a1b1d" />
          <path d="M3 6V4a4 4 0 018 0v2" stroke="#1a1b1d" strokeWidth="2.2" fill="none" />
        </g>
      )}
    </svg>
  )
}
export function FileGlyph({ size = 40, table = false }: { size?: number; table?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path d="M10 4h20l8 8v32H10z" fill="#f7f4ec" stroke="#b9b2a2" strokeWidth="1.2" />
      <path d="M30 4v8h8" fill="#e2dccd" stroke="#b9b2a2" strokeWidth="1.2" />
      {table ? (
        <g stroke="#3d8a5a" strokeWidth="1.6">
          <rect x="15" y="18" width="18" height="18" fill="#dff0e4" />
          <path d="M15 24h18M15 30h18M21 18v18" />
        </g>
      ) : (
        <path d="M15 20h18M15 25h18M15 30h12" stroke="#8a8474" strokeWidth="1.8" />
      )}
    </svg>
  )
}
// Riquadro colorato delle app (come le icone di un sistema operativo vero)
export function AppTile({ name, color, size = 44, locked = false }: { name: IconName; color: string; size?: number; locked?: boolean }) {
  return (
    <span className="relative inline-flex items-center justify-center rounded-[8px] shadow-[0_2px_6px_rgba(0,0,0,0.35)]" style={{ width: size, height: size, background: locked ? '#5b6168' : color, color: '#fff' }}>
      <Icon name={locked ? 'lock' : name} size={Math.round(size * 0.55)} />
    </span>
  )
}
