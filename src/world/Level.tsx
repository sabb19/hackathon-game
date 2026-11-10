import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { textTexture } from './textures'
import { sfx } from '../audio'
import * as THREE from 'three'
import { useGame } from '../store/game'
import { stepIndex, type StepId } from '../content/steps'
import { CEILING, DOORS, FURNITURE, WALLS, WINDOW_HEAD, WINDOW_SILL, type DoorId, type WallSeg } from './layout'
import { plasterTexture } from './textures'

// Costruzione del livello B2 a partire dai dati della pianta (layout.ts):
// muri con spessore, vetrate con telaio, finestre con davanzale, porte che si aprono con la storia.

const T = 0.15 // spessore dei muri
const DOOR_H = 2.4

// Quando si apre ogni porta (finché gli enigmi fisici non sono pronti, la apre Teo da remoto).
export function doorOpen(id: DoorId, step: StepId): boolean {
  const i = stepIndex(step)
  switch (id) {
    case 'ada': return i >= stepIndex('m0_login')
    case 'server': return i >= stepIndex('m1_plug')
    case 'tech': return i >= stepIndex('m2_locate')
    case 'meeting': return i >= stepIndex('m3_meeting')
    default: return false // scale, uscita, sala riunioni, ufficio di Teo: capitoli successivi
  }
}

// ---------- collisioni: muri + finestre + porte chiuse + arredo ----------
type Rect = [number, number, number, number]
function segRect(ax: number, az: number, bx: number, bz: number): Rect {
  return [Math.min(ax, bx) - T / 2, Math.max(ax, bx) + T / 2, Math.min(az, bz) - T / 2, Math.max(az, bz) + T / 2]
}
function wallPieces(w: WallSeg) {
  const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1])
  const dir = [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L]
  const at = (d: number): [number, number] => [w.a[0] + dir[0] * d, w.a[1] + dir[1] * d]
  const opens = [...(w.open ?? [])].sort((x, y) => x.from - y.from)
  const solids: [number, number][] = []
  let cur = 0
  for (const o of opens) {
    if (o.from > cur) solids.push([cur, o.from])
    cur = o.to
  }
  if (cur < L) solids.push([cur, L])
  return { L, dir, at, solids, opens }
}
const STATIC_COLLIDERS: Rect[] = (() => {
  const out: Rect[] = [...FURNITURE]
  for (const w of WALLS) {
    const { at, solids, opens } = wallPieces(w)
    for (const [f, t] of solids) out.push(segRect(...at(f), ...at(t)))
    for (const o of opens) if (o.type === 'window') out.push(segRect(...at(o.from), ...at(o.to)))
  }
  return out
})()
export function currentColliders(): Rect[] {
  const step = useGame.getState().progress?.step ?? 'm0_coffee'
  const out = STATIC_COLLIDERS.slice()
  for (const d of DOORS) {
    if (doorOpen(d.id, step)) continue
    const half = d.width / 2 + 0.05
    const along = d.rotY === 0
    out.push(along ? [d.pos[0] - half, d.pos[0] + half, d.pos[2] - 0.12, d.pos[2] + 0.12] : [d.pos[0] - 0.12, d.pos[0] + 0.12, d.pos[2] - half, d.pos[2] + half])
  }
  return out
}

// ---------- muri ----------
const plasterCache = new Map<string, THREE.MeshStandardMaterial>()
function plasterMat(len: number, h: number) {
  const k = `${len.toFixed(1)}x${h.toFixed(1)}`
  if (!plasterCache.has(k)) plasterCache.set(k, new THREE.MeshStandardMaterial({ map: plasterTexture(len / 2.5, h / 2.5), roughness: 0.92 }))
  return plasterCache.get(k)!
}

function Piece({ x, z, len, rotY, y0, y1, mat }: { x: number; z: number; len: number; rotY: number; y0: number; y1: number; mat: THREE.Material }) {
  if (len <= 0.01 || y1 <= y0) return null
  return (
    <mesh position={[x, (y0 + y1) / 2, z]} rotation={[0, rotY, 0]} material={mat} receiveShadow castShadow>
      <boxGeometry args={[len, y1 - y0, T]} />
    </mesh>
  )
}

export function Walls({ concrete, glass, metal }: { concrete: THREE.Material; glass: THREE.Material; metal: THREE.Material }) {
  const band = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e9ecef', transparent: true, opacity: 0.5, roughness: 0.9, depthWrite: false }), [])
  return (
    <group>
      {WALLS.map((w, wi) => {
        const { at, solids, opens, dir } = wallPieces(w)
        const rotY = -Math.atan2(dir[1], dir[0])
        const mid = (f: number, t: number) => at((f + t) / 2)
        const solidMat = (len: number) => (w.kind === 'concrete' ? concrete : plasterMat(len, CEILING))
        if (w.kind === 'glass') {
          // vetrata: telaio in alto e in basso, montanti, fascia satinata ad altezza occhi
          return (
            <group key={wi}>
              {solids.map(([f, t], i) => {
                const [x, z] = mid(f, t)
                const len = t - f
                return (
                  <group key={i} position={[x, 0, z]} rotation={[0, rotY, 0]}>
                    <mesh position={[0, 1.35, 0]} material={glass} userData={{ seeThrough: true }}><boxGeometry args={[len, 2.7, 0.02]} /></mesh>
                    <mesh position={[0, 1.3, 0.012]} material={band}><planeGeometry args={[len, 0.32]} /></mesh>
                    <mesh position={[0, 0.03, 0]} material={metal}><boxGeometry args={[len, 0.06, 0.06]} /></mesh>
                    <mesh position={[0, 2.7, 0]} material={metal}><boxGeometry args={[len, 0.06, 0.06]} /></mesh>
                    <mesh position={[-len / 2, 1.35, 0]} material={metal}><boxGeometry args={[0.06, 2.7, 0.06]} /></mesh>
                    <mesh position={[len / 2, 1.35, 0]} material={metal}><boxGeometry args={[0.06, 2.7, 0.06]} /></mesh>
                  </group>
                )
              })}
              {/* sopra le porte a vetri: sopraluce e traverso */}
              {opens.map((o, i) => {
                const [x, z] = mid(o.from, o.to)
                const len = o.to - o.from
                return (
                  <group key={`t${i}`} position={[x, 0, z]} rotation={[0, rotY, 0]}>
                    <mesh position={[0, 2.55, 0]} material={glass}><boxGeometry args={[len, 0.3, 0.02]} /></mesh>
                    <mesh position={[0, DOOR_H, 0]} material={metal}><boxGeometry args={[len, 0.06, 0.08]} /></mesh>
                  </group>
                )
              })}
              {/* sopra la vetrata, fino al soffitto: muro */}
              {(() => {
                const [x, z] = mid(0, Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]))
                const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1])
                return <Piece x={x} z={z} len={L} rotY={rotY} y0={2.7} y1={CEILING} mat={plasterMat(L, 0.5)} />
              })()}
            </group>
          )
        }
        return (
          <group key={wi}>
            {solids.map(([f, t], i) => {
              const [x, z] = mid(f, t)
              return <Piece key={i} x={x} z={z} len={t - f} rotY={rotY} y0={0} y1={CEILING} mat={solidMat(t - f)} />
            })}
            {opens.map((o, i) => {
              const [x, z] = mid(o.from, o.to)
              const len = o.to - o.from
              if (o.type === 'window')
                return (
                  <group key={`o${i}`}>
                    <Piece x={x} z={z} len={len} rotY={rotY} y0={0} y1={WINDOW_SILL} mat={solidMat(len)} />
                    <Piece x={x} z={z} len={len} rotY={rotY} y0={WINDOW_HEAD} y1={CEILING} mat={solidMat(len)} />
                  </group>
                )
              const top = o.type === 'door' ? DOOR_H : 2.7
              return <Piece key={`o${i}`} x={x} z={z} len={len} rotY={rotY} y0={top} y1={CEILING} mat={solidMat(len)} />
            })}
          </group>
        )
      })}
    </group>
  )
}

// ---------- porte ----------
// Il battente scorre dentro il muro quando la porta si apre. Il lettore badge: rosso chiusa, verde aperta.
// Da che lato del muro sta la parte pubblica (dove mettere la targa), nel sistema locale della porta.
const OPEN_NAME: Partial<Record<DoorId, string>> = { ada: "l'ufficio di Ada", server: 'la sala server', tech: 'il locale tecnico', meeting: 'la sala riunioni', teo: 'il suo ufficio', stairs: 'le scale', exit: "l'uscita" }
const PUBLIC_SIDE: Record<DoorId, 1 | -1> = { stairs: -1, exit: 1, ada: -1, teo: 1, server: 1, tech: 1, meeting: 1 }

export function Door({ id, glass, metal, ledOn }: { id: DoorId; glass: THREE.Material; metal: THREE.Material; ledOn?: boolean }) {
  const d = DOORS.find((x) => x.id === id)!
  const open = useGame((s) => (s.progress ? doorOpen(id, s.progress.step) : false))
  const leaf = useRef<THREE.Group>(null)
  const was = useRef(open)
  useEffect(() => {
    // Teo apre da remoto: clic della serratura e un avviso
    if (open && !was.current) {
      sfx.click()
      useGame.getState().showToast(`Teo ha aperto ${OPEN_NAME[id] ?? 'una porta'}`)
    }
    was.current = open
  }, [open, id])
  useFrame((_, dt) => {
    if (!leaf.current) return
    const target = open ? d.width * 0.95 : 0
    leaf.current.position.x += (target - leaf.current.position.x) * Math.min(1, dt * 2.5)
  })
  const leafMat = useMemo(
    () =>
      d.kind === 'security'
        ? new THREE.MeshStandardMaterial({ color: '#4b5157', roughness: 0.45, metalness: 0.7 })
        : d.kind === 'solid'
          ? new THREE.MeshStandardMaterial({ color: '#6b5a43', roughness: 0.6 })
          : glass,
    [d.kind, glass],
  )
  const sign = useMemo(
    () => textTexture([d.label], { w: 512, h: 96, color: '#d8d2c4', font: '800 72px "Big Shoulders Display"', align: 'center' }),
    [d.label],
  )
  const lit = ledOn ?? open
  const led = lit ? '#6FBF8E' : '#D9644A'
  const side = PUBLIC_SIDE[id]
  const isGlass = d.kind === 'glass'
  return (
    <group position={d.pos} rotation={[0, -d.rotY, 0]}>
      <group ref={leaf}>
        <group position={[0, 0, isGlass ? 0.04 : 0]}>
          <mesh position={[0, DOOR_H / 2, 0]} material={leafMat} castShadow={!isGlass} userData={isGlass ? { seeThrough: true } : undefined}>
            <boxGeometry args={[d.width, DOOR_H - 0.02, isGlass ? 0.03 : 0.06]} />
          </mesh>
          {/* maniglione */}
          <mesh position={[d.width / 2 - 0.12, 1.05, side * 0.05]} material={metal}><boxGeometry args={[0.03, isGlass ? 0.6 : 0.25, 0.03]} /></mesh>
          {d.kind === 'security' && <mesh position={[0, 1.6, side * 0.032]} rotation={[0, side < 0 ? Math.PI : 0, 0]}><planeGeometry args={[0.3, 0.4]} /><meshStandardMaterial color="#9fb6cc" transparent opacity={0.35} /></mesh>}
        </group>
      </group>
      {/* lettore badge accanto alla porta, sui due lati */}
      {[1, -1].map((sd) => (
        <group key={sd} position={[-(d.width / 2 + 0.15), 1.25, sd * (T / 2 + 0.02)]} rotation={[0, sd < 0 ? Math.PI : 0, 0]}>
          <mesh material={metal}><boxGeometry args={[0.09, 0.14, 0.03]} /></mesh>
          <mesh position={[0, 0.045, 0.016]}><planeGeometry args={[0.05, 0.015]} /><meshStandardMaterial color={led} emissive={led} emissiveIntensity={2.5} /></mesh>
        </group>
      ))}
      {/* targa sull'architrave, dal lato pubblico */}
      {id !== 'exit' && (
        <mesh position={[0, 2.93, side * (T / 2 + 0.005)]} rotation={[0, side < 0 ? Math.PI : 0, 0]}>
          <planeGeometry args={[1.4, 0.26]} />
          <meshStandardMaterial map={sign} transparent />
        </mesh>
      )}
    </group>
  )
}

export { DOORS }
