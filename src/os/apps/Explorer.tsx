import { useState } from 'react'
import { FS, type FsNode } from '../../content/files'
import { INVENTORY } from '../../content/network'
import { FileGlyph, FolderGlyph, Icon } from '../icons'

type Dir = Extract<FsNode, { type: 'dir' }>
type File = Extract<FsNode, { type: 'file' }>

export function FileView({ file }: { file: File }) {
  if (file.kind === 'table')
    return (
      <div className="p-4 overflow-auto h-full bg-[#f4efe3] text-ink">
        <table className="font-mono text-[13px] w-full">
          <thead>
            <tr className="text-left text-ink/60 border-b-2 border-ink/20">
              <th className="pr-4 pb-2">nome</th><th className="pr-4 pb-2">ip</th><th className="pr-4 pb-2">mac</th><th className="pb-2">note</th>
            </tr>
          </thead>
          <tbody>
            {INVENTORY.map((r) => (
              <tr key={r.name} className="border-b border-ink/10 align-top">
                <td className="pr-4 py-1.5 font-semibold">{r.name}</td><td className="pr-4 py-1.5">{r.ip}</td><td className="pr-4 py-1.5">{r.mac}</td><td className="py-1.5 font-sans text-ink/70">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  return <pre className="p-5 h-full overflow-auto bg-[#f4efe3] text-ink font-mono text-[14px] leading-relaxed whitespace-pre-wrap">{file.body}</pre>
}

export default function Explorer({ openFile, startAt }: { openFile: (f: File) => void; startAt?: string }) {
  const start = startAt ? (FS as Dir).children.find((c): c is Dir => c.type === 'dir' && c.name === startAt) : undefined
  const [path, setPath] = useState<Dir[]>(start ? [FS as Dir, start] : [FS as Dir])
  const [sel, setSel] = useState<string | null>(null)
  const [denied, setDenied] = useState<string | null>(null)
  const cur = path[path.length - 1]

  const open = (n: FsNode) => {
    setDenied(null)
    if (n.type === 'dir') {
      if (n.locked) return setDenied(n.locked)
      setPath([...path, n])
      setSel(null)
    } else openFile(n)
  }

  const topDirs = (FS as Dir).children.filter((c): c is Dir => c.type === 'dir')

  return (
    <div className="h-full flex flex-col bg-[#e8e2d2] text-ink">
      {/* barra percorso */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-ink/15">
        <button className="r-bevel w-8 h-7 flex items-center justify-center disabled:opacity-40" disabled={path.length < 2} onClick={() => setPath(path.slice(0, -1))} aria-label="Cartella superiore">
          <Icon name="back" size={16} />
        </button>
        <div className="flex-1 r-sunken bg-[#f4efe3] px-3 py-1 font-mono text-[13px] truncate">/{path.map((d) => d.name).join('/')}</div>
      </div>
      <div className="flex-1 grid grid-cols-[180px_1fr] min-h-0">
        {/* albero */}
        <nav className="border-r border-ink/15 p-2 overflow-y-auto">
          <div className="kicker text-[13px] text-ink/50 px-2 mb-1">Cartelle</div>
          {topDirs.map((d) => (
            <button key={d.name} onClick={() => open(d)} className={`w-full flex items-center gap-2 px-2 py-1.5 text-[14px] text-left hover:bg-ink/10 ${cur === d ? 'bg-steel text-cream' : ''}`}>
              <Icon name={d.name === 'Cestino' ? 'trash' : 'folder'} size={16} />
              {d.name}
            </button>
          ))}
        </nav>
        {/* contenuto */}
        <div className="p-3 overflow-y-auto" onClick={() => setSel(null)}>
          {denied && (
            <div className="mb-3 flex gap-3 items-start border-2 border-bad/70 bg-[#f6e0d8] p-3">
              <Icon name="lock" className="text-bad shrink-0" />
              <p className="text-[14px] whitespace-pre-line">{denied}</p>
            </div>
          )}
          {cur.children.length === 0 && <p className="text-[14px] text-ink/50">Cartella vuota.</p>}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
            {cur.children.map((n) => (
              <button
                key={n.name}
                onClick={(e) => (e.stopPropagation(), setSel(n.name))}
                onDoubleClick={() => open(n)}
                onKeyDown={(e) => e.key === 'Enter' && open(n)}
                className={`flex flex-col items-center gap-1 p-2 text-center ${sel === n.name ? 'bg-steel text-cream' : 'hover:bg-ink/10'}`}
              >
                {n.type === 'dir' ? <FolderGlyph size={44} locked={!!n.locked} /> : <FileGlyph size={40} table={n.kind === 'table'} />}
                <span className="text-[12px] leading-tight break-all">{n.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="px-3 py-1 border-t border-ink/15 font-mono text-[11px] text-ink/60">Doppio clic per aprire · {cur.children.length} elementi</div>
    </div>
  )
}
