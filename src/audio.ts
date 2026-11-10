// Suoni sintetizzati con Web Audio: nessun file esterno.
import { useGame } from './store/game'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let alarmTimer: ReturnType<typeof setInterval> | null = null
let ringTimer: ReturnType<typeof setInterval> | null = null

function ac() {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.connect(ctx.destination)
  }
  master!.gain.value = useGame.getState().settings.volume ?? 0.8
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.08, cutoff = 3000) {
  const c = ac()
  const o = c.createOscillator()
  const g = c.createGain()
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = cutoff
  o.type = type
  o.frequency.value = freq
  const t0 = c.currentTime + start
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(vol, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur)
  o.connect(f).connect(g).connect(master!)
  o.start(c.currentTime + start)
  o.stop(c.currentTime + start + dur + 0.05)
}

function noise(dur: number) {
  const c = ac()
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2)
  const s = c.createBufferSource()
  s.buffer = buf
  return s
}

export const sfx = {
  // badge rifiutato: due note morbide discendenti, come un lettore vero
  denied() {
    tone(740, 0, 0.18, 'sine', 0.07)
    tone(554, 0.17, 0.28, 'sine', 0.07)
  },
  // badge accettato / click generico
  click() {
    tone(1800, 0, 0.04, 'sine', 0.04)
  },
  // serranda d'acciaio che arriva a terra: tonfo + rumore metallico
  slam(delay = 0) {
    const c = ac()
    const t = c.currentTime + delay
    const n = noise(0.6)
    const f = c.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 900
    const g = c.createGain()
    g.gain.value = 0.55
    n.connect(f).connect(g).connect(master!)
    n.start(t)
    const o = c.createOscillator()
    const og = c.createGain()
    o.frequency.setValueAtTime(90, t)
    o.frequency.exponentialRampToValueAtTime(35, t + 0.4)
    og.gain.setValueAtTime(0.5, t)
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
    o.connect(og).connect(master!)
    o.start(t)
    o.stop(t + 0.55)
  },
  // rullo della serranda che scende
  rattle(delay = 0, dur = 1.2) {
    const c = ac()
    const t = c.currentTime + delay
    const n = noise(dur)
    const f = c.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 2200
    f.Q.value = 3
    const g = c.createGain()
    g.gain.value = 0.12
    n.connect(f).connect(g).connect(master!)
    n.start(t)
  },
  // allarme dell'edificio: due toni, lontano (filtrato) e intermittente — non un ronzio continuo
  // "voce a sillabe": una sillaba breve e intonata, filtrata come una vocale. Niente parole, solo il ritmo del parlato.
  // mood: 'calm' = grave e rilassata, 'tense' = più acuta e rapida. rise = fine di una domanda.
  syllable(vowel: string, seed: number, mood: 'calm' | 'tense' = 'calm', rise = false) {
    const c = ac()
    const t = c.currentTime
    const F1: Record<string, number> = { a: 780, e: 520, i: 320, o: 500, u: 360 }
    const F2: Record<string, number> = { a: 1250, e: 1850, i: 2200, o: 900, u: 800 }
    const v = F1[vowel] ? vowel : 'a'
    const base = mood === 'calm' ? 88 : 108 // voce adulta, grave
    const f0 = base * (1 + (seed % 5) * 0.022) * (rise ? 1.18 : 1)
    const dur = mood === 'calm' ? 0.13 : 0.1
    const o = c.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(f0 * (rise ? 0.92 : 1.04), t)
    o.frequency.linearRampToValueAtTime(rise ? f0 * 1.08 : f0 * 0.94, t + dur)
    const g = c.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.2, t + 0.022)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    // meno squillante: taglio delle alte, formanti di un tratto vocale adulto
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 2200
    const out = c.createGain()
    out.gain.value = 0.9
    for (const [f, q, lvl] of [[F1[v] * 0.88, 4, 1], [F2[v] * 0.88, 6, 0.35]] as [number, number, number][]) {
      const bp = c.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = f
      bp.Q.value = q
      const lg = c.createGain()
      lg.gain.value = lvl
      g.connect(bp).connect(lg).connect(out)
    }
    o.connect(g)
    out.connect(lp).connect(master!)
    o.start(t)
    o.stop(t + dur + 0.03)
  },
  // squillo del telefono: trillo morbido, due volte ogni 3 secondi
  ringStart() {
    if (ringTimer) return
    const ring = () => {
      for (let k = 0; k < 8; k++) tone(k % 2 ? 1180 : 1320, k * 0.06, 0.07, 'sine', 0.03, 2400)
      for (let k = 0; k < 8; k++) tone(k % 2 ? 1180 : 1320, 0.7 + k * 0.06, 0.07, 'sine', 0.03, 2400)
    }
    ring()
    ringTimer = setInterval(ring, 3000)
  },
  ringStop() {
    if (ringTimer) clearInterval(ringTimer)
    ringTimer = null
  },
  // ascensore arrivato al piano
  ding() {
    tone(1046, 0, 1.2, 'sine', 0.05)
    tone(784, 0.35, 1.4, 'sine', 0.05)
  },
  alarmOn() {
    if (alarmTimer) return
    const chime = () => {
      for (let k = 0; k < 3; k++) {
        tone(988, k * 0.5, 0.22, 'triangle', 0.035, 1600)
        tone(784, k * 0.5 + 0.25, 0.22, 'triangle', 0.035, 1600)
      }
    }
    chime()
    alarmTimer = setInterval(chime, 6000)
  },
  alarmOff() {
    if (alarmTimer) clearInterval(alarmTimer)
    alarmTimer = null
  },
  // notifica: due note brevi e morbide, come un messaggio in arrivo
  notify() {
    tone(880, 0, 0.12, 'sine', 0.035, 4000)
    tone(1318, 0.09, 0.18, 'sine', 0.03, 4000)
  },
  // vibrazione del telefono
  buzz() {
    for (let i = 0; i < 2; i++) tone(170, i * 0.32, 0.22, 'triangle', 0.05, 500)
  },
  setVolume(v: number) {
    if (master) master.gain.value = v
  },
}
