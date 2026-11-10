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
