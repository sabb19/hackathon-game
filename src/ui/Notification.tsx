import { useGame } from '../store/game'

// Banner di notifica come su uno smartphone vero: chi scrive + anteprima. Si apre con T.
export default function Notification() {
  const n = useGame((s) => s.notif)
  const open = useGame((s) => s.phoneOpen)
  if (!n || open) return null
  return (
    <button
      key={n.id}
      onClick={() => useGame.getState().setPhone(true)}
      className="absolute top-5 right-5 z-[85] w-[340px] text-left fade-up bg-[#efeae0]/95 text-ink rounded-2xl shadow-2xl px-4 py-3 flex gap-3 items-start"
    >
      <span className="w-9 h-9 shrink-0 rounded-full bg-steel text-cream flex items-center justify-center font-display font-black">T</span>
      <span className="flex-1 min-w-0">
        <span className="flex justify-between text-[12px] text-ink/55">
          <span className="font-semibold text-ink">Teo Marchi</span>
          <span>adesso</span>
        </span>
        <span className="block text-[14px] leading-snug mt-0.5 line-clamp-2">{n.text}</span>
        <span className="block text-[12px] text-ink/50 mt-1">Tab per aprire il telefono</span>
      </span>
    </button>
  )
}
