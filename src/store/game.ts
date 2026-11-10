import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sfx } from '../audio'
import { STEPS, type StepId } from '../content/steps'
import type { ConceptId } from '../content/concepts'
import type { CallId } from '../content/calls'

export type Screen = 'title' | 'intro' | 'game' | 'demoEnd'
export type View = 'world' | 'desktop'

export interface ChatMsg {
  id: number
  from: 'teo' | 'tu' | 'ada' | 'relay'
  text: string
  subject?: string // per la Posta
}

export interface Settings {
  sensitivity: number
  bigText: boolean
  reduceMotion: boolean
  crt: boolean
  volume: number
  markers: boolean
}

export interface Progress {
  name: string
  username: string
  step: StepId
  flags: Record<string, boolean>
  concepts: ConceptId[]
  messages: ChatMsg[]
  seenPhone: number
  seenMail: number
  hintLevel: Partial<Record<StepId, number>>
  hintsUsed: number
  cables: string[] // "a|b" in ordine alfabetico
}

interface State {
  settings: Settings
  progress: Progress | null
  archive: ConceptId[] // pagine del taccuino sbloccate in modo permanente
  // transitorio
  screen: Screen
  view: View
  paused: boolean
  phoneOpen: boolean
  inspect: { id: string; pos: [number, number, number]; look: [number, number, number]; action?: string } | null
  notif: { id: number; text: string } | null
  cinematic: number | null // inizio della scena del lockdown (performance.now)
  call: { id: CallId; ringing: boolean } | null // videochiamata di Teo
  timeSkip: number | null // inizio del salto di tempo (performance.now)
  minigame: 'rackCable' | 'keypad' | null // minigioco fisico aperto
  notebookOpen: boolean
  toast: string | null
  hovered: string | null
  note: { title: string; body: string } | null

  setScreen: (s: Screen) => void
  setView: (v: View) => void
  setPaused: (p: boolean) => void
  setPhone: (o: boolean) => void
  setCinematic: (t: number | null) => void
  setCall: (c: State['call']) => void
  setTimeSkip: (t: number | null) => void
  setMinigame: (m: State['minigame']) => void
  log: (from: ChatMsg['from'], text: string) => void
  setInspect: (i: State['inspect']) => void
  setNotebook: (o: boolean) => void
  setHovered: (h: string | null) => void
  showNote: (n: State['note']) => void
  showToast: (t: string) => void
  updateSettings: (s: Partial<Settings>) => void
  newGame: (name: string) => void
  resetAll: () => void
  goto: (step: StepId) => void
  setFlag: (f: string, v?: boolean) => void
  learn: (c: ConceptId) => void
  say: (from: ChatMsg['from'], text: string, subject?: string) => void
  markSeen: (ch: 'phone' | 'mail') => void
  nextHint: () => void
  autoHint: () => void
  toggleCable: (a: string, b: string) => void
}

let msgId = Date.now()
let toastTimer: ReturnType<typeof setTimeout> | undefined

export const makeUsername = (name: string) => {
  const parts = name.trim().toLowerCase().normalize('NFD').replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean)
  if (!parts.length) return 'tecnico'
  return parts.length === 1 ? parts[0] : `${parts[0][0]}.${parts[parts.length - 1]}`
}

export const cableKey = (a: string, b: string) => [a, b].sort().join('|')
export const channelOf = (m: ChatMsg): 'phone' | 'mail' => (m.from === 'teo' || m.from === 'tu' ? 'phone' : 'mail')
export const unreadOf = (p: Progress, ch: 'phone' | 'mail') =>
  p.messages.filter((m) => channelOf(m) === ch).length - (ch === 'phone' ? p.seenPhone : p.seenMail)

export const useGame = create<State>()(
  persist(
    (set, get) => ({
      settings: { sensitivity: 1, bigText: false, reduceMotion: false, crt: true, volume: 0.8, markers: true },
      progress: null,
      archive: [],
      screen: 'title',
      view: 'world',
      paused: false,
      phoneOpen: false,
      inspect: null,
      notif: null,
      cinematic: null,
      call: null,
      timeSkip: null,
      minigame: null,
      notebookOpen: false,
      toast: null,
      hovered: null,
      note: null,

      setScreen: (screen) => set({ screen, paused: false, phoneOpen: false, notebookOpen: false, inspect: null, call: null, timeSkip: null, cinematic: null, minigame: null }),
      setView: (view) => set({ view }),
      setPaused: (paused) => set({ paused }),
      setCinematic: (cinematic) => set({ cinematic }),
      setCall: (call) => set({ call, phoneOpen: false, notebookOpen: false, inspect: null }),
      setTimeSkip: (timeSkip) => set({ timeSkip }),
      setMinigame: (minigame) => set({ minigame, phoneOpen: false, notebookOpen: false }),
      // registra nel telefono senza notifica (es. la trascrizione di una videochiamata)
      log: (from, text) => {
        const p = get().progress
        if (!p) return
        set({ progress: { ...p, messages: [...p.messages, { id: msgId++, from, text }] } })
        get().markSeen('phone')
      },
      setInspect: (inspect) => set({ inspect }),
      setPhone: (phoneOpen) => {
        set({ phoneOpen, notebookOpen: false })
        if (phoneOpen) {
          get().markSeen('phone')
          if (!get().progress?.flags.tutPhone) get().setFlag('tutPhone')
        }
      },
      setNotebook: (notebookOpen) => set({ notebookOpen, phoneOpen: false }),
      setHovered: (hovered) => (get().hovered === hovered ? undefined : set({ hovered })),
      showNote: (note) => set({ note }),
      showToast: (toast) => {
        clearTimeout(toastTimer)
        set({ toast })
        toastTimer = setTimeout(() => set({ toast: null }), 3500)
      },
      updateSettings: (s) => set({ settings: { ...get().settings, ...s } }),
      newGame: (name) => {
        set({
          progress: {
            name: name.trim() || 'Tecnico',
            username: makeUsername(name),
            step: 'm0_arrive',
            flags: {},
            concepts: [],
            messages: [],
            seenPhone: 0,
            seenMail: 0,
            hintLevel: {},
            hintsUsed: 0,
            cables: ['printer|sw1', 'security|sw2'],
          },
          view: 'world',
          paused: false,
          note: null,
        })
        get().goto('m0_arrive')
      },
      resetAll: () => set({ progress: null, archive: [] }),

      goto: (step) => {
        const p = get().progress
        if (!p) return
        set({ progress: { ...p, step } })
        for (const m of STEPS[step].onEnter ?? []) get().say(m.from, m.text, m.subject)
      },
      setFlag: (f, v = true) => {
        const p = get().progress
        if (p) set({ progress: { ...p, flags: { ...p.flags, [f]: v } } })
      },
      learn: (c) => {
        const { progress: p, archive } = get()
        if (!p || p.concepts.includes(c)) return
        set({
          progress: { ...p, concepts: [...p.concepts, c] },
          archive: archive.includes(c) ? archive : [...archive, c],
        })
        get().showToast(p.flags.notebook ? 'Nuova pagina nel taccuino · Tab' : '✎ Concetto annotato (trova il taccuino di Ada per rileggerlo)')
      },
      say: (from, text, subject) => {
        const p = get().progress
        if (!p) return
        set({ progress: { ...p, messages: [...p.messages, { id: msgId++, from, text, subject }] } })
        const g = get()
        if (from === 'teo' && g.phoneOpen) g.markSeen('phone')
        if (from === 'teo' && !g.phoneOpen && g.screen === 'game') {
          const id = msgId
          set({ notif: { id, text } })
          sfx.notify()
          setTimeout(() => get().notif?.id === id && set({ notif: null }), 5500)
        }
      },
      markSeen: (ch) => {
        const p = get().progress
        if (!p) return
        const n = p.messages.filter((m) => channelOf(m) === ch).length
        if (ch === 'phone' && p.seenPhone !== n) set({ progress: { ...p, seenPhone: n } })
        if (ch === 'mail' && p.seenMail !== n) set({ progress: { ...p, seenMail: n } })
      },
      nextHint: () => {
        const p = get().progress
        if (!p) return
        const hints = STEPS[p.step].hints
        const lvl = p.hintLevel[p.step] ?? 0
        if (lvl >= hints.length) return
        get().say('tu', lvl === 0 ? 'Teo, sono bloccato. Un aiutino?' : 'Ancora non ci arrivo…')
        set({ progress: { ...get().progress!, hintLevel: { ...p.hintLevel, [p.step]: lvl + 1 }, hintsUsed: p.hintsUsed + 1 } })
        get().say('teo', hints[lvl])
      },
      // Teo interviene da solo quando il giocatore è fermo da troppo tempo
      autoHint: () => {
        const p = get().progress
        if (!p) return
        const hints = STEPS[p.step].hints
        const lvl = p.hintLevel[p.step] ?? 0
        if (lvl >= hints.length) return
        set({ progress: { ...p, hintLevel: { ...p.hintLevel, [p.step]: lvl + 1 } } })
        get().say('teo', hints[lvl])
      },
      toggleCable: (a, b) => {
        const p = get().progress
        if (!p) return
        const k = cableKey(a, b)
        const cables = p.cables.includes(k) ? p.cables.filter((c) => c !== k) : [...p.cables, k]
        set({ progress: { ...p, cables } })
      },
    }),
    {
      name: 'the-last-session',
      version: 4,
      migrate: (old) => ({ ...(old as object), progress: null }) as never,
      partialize: (s) => ({ settings: s.settings, progress: s.progress, archive: s.archive }),
    },
  ),
)
