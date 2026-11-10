import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, Stats } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { useGame } from '../store/game'
import { inspectAction, interact, type InteractId } from './interact'
import { carpetTexture, ceilingTexture, cityTexture, concreteTexture, noticeBoardTexture, plasterTexture, textTexture } from './textures'
import { stepIndex, targetFor, unlockLevel } from '../content/steps'
import { lockPointer } from './pointer'
import { sfx } from '../audio'
import { CrtModel, CustomModel, Model, Mug, usePBR } from './assets'

export type WorldMode = 'title' | 'play' | 'idle'
type V3 = [number, number, number]

// ---------- layout (metri) ----------
// Open space: x -8..8, z -10..6, altezza 7. Sala server vetrata: x 3..8, z -10..-5. Corridoio oltre la porta: x > 8.
const BOUNDS = { minX: -7.6, maxX: 7.6, minZ: -9.6, maxZ: 5.6 }
const COLLIDERS: [number, number, number, number][] = [
  // [minX, maxX, minZ, maxZ]
  [-5.05, 1.05, 0.5, 2.5], // prima fila di scrivanie (a banco)
  [-5.05, 1.05, -3.9, -1.9], // seconda fila
  [-6.9, -5.9, -5.5, -3.5], // scrivania di Ada
  [2.9, 3.1, -10, -5], // vetrata sala server (lato)
  [4.8, 8, -5.1, -4.9], // vetrata (fronte, a destra della porta)
  [3, 3.6, -5.1, -4.9], // vetrata (a sinistra della porta)
  [3.4, 7.8, -10, -8.8], // rack + armadio
  [-6.8, 2.6, -10, -9.3], // archivi e lavagna sul muro di fondo
  [7.0, 8, 0.5, 1.3], // distributore
  [7.0, 8, 5.0, 6], // attaccapanni
  [3.35, 3.45, -3.6, -2.4], // sala riunioni: vetrata ovest (porta tra z -2.4 e -1.4)
  [3.35, 3.45, -1.4, -0.4],
  [3.4, 7.6, -0.45, -0.35], // vetrata nord
  [3.4, 7.6, -3.65, -3.55], // vetrata sud
  [4.4, 6.8, -2.6, -1.4], // tavolo riunioni
  [2.0, 4.6, 5.25, 6], // angolo caffè
  [2.05, 2.75, 1.15, 1.85], // stampante
]
const START = new THREE.Vector3(0, 1.6, 3.6)
const TITLE_POS = new THREE.Vector3(0.55, 1.5, 3.0)
const TITLE_LOOK = new THREE.Vector3(0.0, 0.8, 2.1)

function useMats() {
  const wall = usePBR('precast_concrete_wall', 1.4, 0.7, { normalScale: new THREE.Vector2(0.5, 0.5) })
  const wallDark = usePBR('precast_concrete_wall', 1, 0.5, { color: '#8d9095', normalScale: new THREE.Vector2(0.5, 0.5) })
  const floor = usePBR('smooth_concrete_floor', 6, 6, { roughness: 0.55, color: '#9aa2ab' })
  return useMemo(() => {
    const m = (color: string, roughness = 0.7, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness })
    return {
      concrete: wall,
      concreteDark: wallDark,
      floor,
      beige: m('#cbbf9f'),
      darkBeige: m('#a69a7c', 0.75),
      desk: m('#8d8473', 0.6),
      metal: m('#2a2e33', 0.45, 0.6),
      steel: m('#6f757c', 0.4, 0.7),
      paper: m('#e9e1c8', 0.9),
      black: m('#111316', 0.8),
      plant: m('#2f4a32', 0.9),
      deadPlant: m('#6b5a3a', 0.9),
      wood: m('#5b4433', 0.7),
      chair: m('#1d2024', 0.6),
      glass: new THREE.MeshStandardMaterial({ color: '#9fc0d8', transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.2 }),
      blue: m('#2B4A6B'),
      yellowFloor: m('#8a6f34', 0.8),
    }
  }, [wall, wallDark, floor])
}
type Mats = ReturnType<typeof useMats>

// Solo questi oggetti vengono controllati dallo sguardo (molto più leggero che testare tutta la scena).
const HITS = new Set<THREE.Object3D>()
// Effetti condivisi tra componenti della scena (scossa della camera durante il lockdown).
const fx = { shake: 0 }

function Hit({ id, children, position, rotation }: { id: InteractId; children: ReactNode; position?: V3; rotation?: V3 }) {
  const ref = useRef<THREE.Group>(null)
  const active = useGame((s) => s.hovered === id && !s.inspect)
  useEffect(() => {
    const o = ref.current
    if (o) HITS.add(o)
    return () => {
      if (o) HITS.delete(o)
    }
  }, [])
  // contorno caldo: l'oggetto che stai guardando si illumina appena (schermi e LED esclusi)
  useEffect(() => {
    ref.current?.traverse((n) => {
      const mesh = n as THREE.Mesh
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined
      if (!mesh.isMesh || !mat || !('emissive' in mat) || mat.emissiveMap || (!mesh.userData.own && mat.emissive.getHex() !== 0)) return
      if (!mesh.userData.own) {
        mesh.material = mat.clone() // materiale proprio: non illuminare tutte le copie del modello
        mesh.userData.own = true
      }
      const m2 = mesh.material as THREE.MeshStandardMaterial
      m2.emissive.set(active ? '#E8823A' : '#000000')
      m2.emissiveIntensity = active ? 0.14 : 1
    })
  }, [active])
  return (
    <group ref={ref} position={position} rotation={rotation} userData={{ interact: id }}>
      {children}
    </group>
  )
}

const Box = ({ p, s, m, r, cast }: { p: V3; s: V3; m: THREE.Material; r?: V3; cast?: boolean }) => (
  <mesh position={p} rotation={r} material={m} castShadow={cast} receiveShadow>
    <boxGeometry args={s} />
  </mesh>
)

function Label({ lines, p, r, w, h, opts }: { lines: string[]; p: V3; r?: V3; w: number; h: number; opts?: Parameters<typeof textTexture>[1] }) {
  const tex = useMemo(() => textTexture(lines, opts), [lines.join('|'), JSON.stringify(opts)])
  return (
    <mesh position={p} rotation={r}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} transparent />
    </mesh>
  )
}

// Parete in cemento: la texture mantiene la stessa scala (un pannello ogni ~3 m) su pareti di qualsiasi misura.
function Wall({ p, r, w, h, dark }: { p: V3; r?: V3; w: number; h: number; dark?: boolean }) {
  const mat = usePBR('precast_concrete_wall', w / 3.2, h / 3.2, { normalScale: new THREE.Vector2(0.45, 0.45), ...(dark ? { color: '#8d9095' } : {}) })
  return (
    <mesh position={p} rotation={r} material={mat} receiveShadow>
      <planeGeometry args={[w, h]} />
    </mesh>
  )
}

// Parete intonacata e tinteggiata (grigio caldo), texture in scala reale.
function Plaster({ p, r, w, h }: { p: V3; r?: V3; w: number; h: number }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: plasterTexture(w / 2.5, h / 2.5), roughness: 0.92 }), [w, h])
  return (
    <mesh position={p} rotation={r} material={mat} receiveShadow>
      <planeGeometry args={[w, h]} />
    </mesh>
  )
}

// Moquette a quadrotte da 50 cm sotto le zone di lavoro.
function Carpet({ p, w, d }: { p: [number, number]; w: number; d: number }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: carpetTexture(w, d), roughness: 1 }), [w, d])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[p[0], 0.004, p[1]]} material={mat} receiveShadow>
      <planeGeometry args={[w, d]} />
    </mesh>
  )
}

// Controsoffitto a pannelli 60 cm; luci incassate, una su tre accesa (luce di cortesia notturna).
function Ceiling() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: ceilingTexture(16 / 0.6, 16 / 0.6), roughness: 0.95 }), [])
  const lights: { x: number; z: number; on: boolean }[] = []
  let k = 0
  for (let x = -6; x <= 6; x += 3)
    for (let z = -8.4; z <= 4.8; z += 2.4) lights.push({ x, z, on: k++ % 3 === 0 })
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4.2, -2]} material={mat}><planeGeometry args={[16, 16]} /></mesh>
      {lights.map((l, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={[l.x, 4.19, l.z]}>
          <planeGeometry args={[0.6, 1.2]} />
          <meshStandardMaterial color={l.on ? '#fff6e6' : '#b9bcbf'} emissive={l.on ? '#fff1d6' : '#000000'} emissiveIntensity={l.on ? 0.35 : 0} />
        </mesh>
      ))}
      {/* bocchette dell'aria */}
      {[-4.5, 1.5].map((x) => [-6, 0].map((z) => (
        <mesh key={`v${x}${z}`} rotation={[Math.PI / 2, 0, 0]} position={[x, 4.19, z]}><planeGeometry args={[0.5, 0.5]} /><meshStandardMaterial color="#6f7276" /></mesh>
      )))}
    </group>
  )
}

// Veneziane a metà finestra: la luna passa tra le lamelle e disegna righe sul pavimento.
function Blinds({ z }: { z: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const N = 22
  useEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new THREE.Object3D()
    for (let i = 0; i < N; i++) {
      o.position.set(0, 3.75 - i * 0.055, 0)
      o.rotation.set(0, 0, 0.55)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <group position={[-7.76, 0, z]}>
      <instancedMesh ref={ref} args={[undefined, undefined, N]} castShadow>
        <boxGeometry args={[0.05, 0.004, 2.22]} />
        <meshStandardMaterial color="#c9c6bd" roughness={0.6} />
      </instancedMesh>
      <Box p={[0, 3.8, 0]} s={[0.07, 0.05, 2.26]} m={new THREE.MeshStandardMaterial({ color: '#b8b5ad' })} />
    </group>
  )
}

// Sala riunioni a vetri: tavolo, sei sedie, schermo in standby. Porta sul lato ovest.
function MeetingRoom({ m }: { m: Mats }) {
  const band = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e9ecef', transparent: true, opacity: 0.55, roughness: 0.9, depthWrite: false }), [])
  const tvTex = useMemo(() => textTexture(['RIUNIONE DI LUNEDÌ', '', 'Sicurezza Q3: 0 incidenti!', '(speriamo)'], { w: 512, h: 288, bg: '#10233a', color: '#cfe0f0', font: '600 34px "Inter Tight"', pad: 30, lineHeight: 1.3 }), [])
  const glass = (p: V3, r: V3, w: number) => (
    <group position={p} rotation={r}>
      <mesh material={m.glass}><planeGeometry args={[w, 2.6]} /></mesh>
      <mesh position={[0, -0.0, 0.002]} material={band}><planeGeometry args={[w, 0.35]} /></mesh>
      <Box p={[0, 1.3, 0]} s={[w, 0.05, 0.05]} m={m.metal} />
      <Box p={[0, -1.3, 0]} s={[w, 0.04, 0.05]} m={m.metal} />
    </group>
  )
  return (
    <group>
      {glass([5.5, 1.3, -0.4], [0, 0, 0], 4.2)}
      {glass([5.5, 1.3, -3.6], [0, 0, 0], 4.2)}
      {glass([3.4, 1.3, -3.0], [0, Math.PI / 2, 0], 1.2)}
      {glass([3.4, 1.3, -0.9], [0, Math.PI / 2, 0], 1.0)}
      {[3.4, 7.6].map((x) => [-0.4, -3.6].map((z) => <Box key={`${x}${z}`} p={[x, 1.3, z]} s={[0.06, 2.6, 0.06]} m={m.metal} />))}
      <Box p={[3.4, 2.62, -1.9]} s={[0.06, 0.05, 1.0]} m={m.metal} />
      <Label lines={['SALA RIUNIONI']} p={[3.38, 2.2, -1.9]} r={[0, -Math.PI / 2, 0]} w={0.9} h={0.18} opts={{ w: 512, h: 100, color: '#1a1b1d', font: '800 80px "Big Shoulders Display"', align: 'center' }} />
      <CustomModel name="meetingtable" position={[5.6, 0, -2.0]} />
      {[4.8, 5.6, 6.4].map((x) => <Chair key={`a${x}`} p={[x, 0, -2.75]} ry={0.05 * (x - 5.6)} />)}
      {[4.8, 5.6, 6.4].map((x) => <Chair key={`b${x}`} p={[x, 0, -1.25]} ry={Math.PI + 0.08 * (x - 5.6)} />)}
      <CustomModel
        name="tv"
        position={[7.95, 0, -2.0]}
        rotation={[0, -Math.PI / 2, 0]}
        tweak={(o) => {
          const mm = o as THREE.Mesh
          if (mm.isMesh && o.name === 'TvScreen') {
            tvTex.flipY = false
            mm.material = new THREE.MeshStandardMaterial({ map: tvTex, emissiveMap: tvTex, emissive: '#ffffff', emissiveIntensity: 0.35 })
          }
        }}
      />
    </group>
  )
}

// ---------- giocatore ----------
function Player({ mode }: { mode: WorldMode }) {
  const { camera, scene, gl } = useThree()
  const yaw = useRef(0)
  const pitch = useRef(0)
  const keys = useRef<Record<string, boolean>>({})
  const bob = useRef(0)
  const ray = useMemo(() => new THREE.Raycaster(), [])
  const placed = useRef(false)
  const frame = useRef(0)
  const lookAmt = useRef(0)
  const walked = useRef(0)
  // ispezione: posa da cui si è partiti, per tornarci
  const ret = useRef<{ pos: THREE.Vector3; active: boolean; back: boolean }>({ pos: new THREE.Vector3(), active: false, back: false })
  const tmpM = useMemo(() => new THREE.Matrix4(), [])
  const tmpQ = useMemo(() => new THREE.Quaternion(), [])
  const tmpV = useMemo(() => new THREE.Vector3(), [])
  const fwd = useMemo(() => new THREE.Vector3(), [])
  const right = useMemo(() => new THREE.Vector3(), [])
  const center = useMemo(() => new THREE.Vector2(0, 0), [])

  useEffect(() => {
    if (mode === 'play' && !placed.current) {
      camera.position.copy(START)
      yaw.current = 0
      pitch.current = -0.12
      placed.current = true
    }
    if (mode === 'title') placed.current = false
    if (mode !== 'play' && document.pointerLockElement) document.exitPointerLock()
  }, [mode, camera])

  // solo sviluppo: posiziona la camera da console per controlli visivi
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as Record<string, unknown>).__look = (x: number, z: number, yw: number, pt = 0) => {
      camera.position.set(x, 1.6, z)
      yaw.current = yw
      pitch.current = pt
      placed.current = true
    }
  }, [camera])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement || useGame.getState().note || useGame.getState().inspect) return
      const s = 0.0022 * useGame.getState().settings.sensitivity
      yaw.current -= e.movementX * s
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * s, -1.35, 1.35)
      lookAmt.current += Math.abs(e.movementX) + Math.abs(e.movementY)
      if (lookAmt.current > 400 && !useGame.getState().progress?.flags.tutLook) useGame.getState().setFlag('tutLook')
    }
    const use = (e?: MouseEvent) => {
      const g = useGame.getState()
      // clic destro = torna indietro dall'ispezione
      if (e && e.button === 2) {
        if (g.inspect) g.setInspect(null)
        return
      }
      // durante l'ispezione il clic vale come E: esegue l'azione (es. ricollegare il cavo)
      if (g.inspect) {
        if (g.inspect.action) inspectAction()
        return
      }
      if (document.pointerLockElement !== gl.domElement || g.note || !g.hovered) return
      interact(g.hovered as InteractId)
    }
    const down = (e: KeyboardEvent) => {
      const g = useGame.getState()
      if (g.inspect) {
        // durante l'ispezione: E = azione (o torna), S/Q/Backspace = torna
        if (e.code === 'KeyE') g.inspect.action ? inspectAction() : g.setInspect(null)
        if (['KeyS', 'KeyQ', 'Backspace', 'ArrowDown'].includes(e.code)) g.setInspect(null)
        // (anche clic destro e Esc riportano indietro)
        return
      }
      keys.current[e.code] = true
      if (e.code === 'KeyE') use()
    }
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false)
    const lockChange = () => {
      const g = useGame.getState()
      if (!document.pointerLockElement && g.screen === 'game' && g.view === 'world' && !g.paused && !g.phoneOpen && !g.notebookOpen) {
        g.setInspect(null)
        g.setPaused(true)
      }
      keys.current = {}
    }
    document.addEventListener('mousemove', onMove)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    gl.domElement.addEventListener('mousedown', use)
    const noMenu = (e: Event) => e.preventDefault()
    gl.domElement.addEventListener('contextmenu', noMenu)
    document.addEventListener('pointerlockchange', lockChange)
    return () => {
      document.removeEventListener('mousemove', onMove)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      gl.domElement.removeEventListener('mousedown', use)
      gl.domElement.removeEventListener('contextmenu', noMenu)
      document.removeEventListener('pointerlockchange', lockChange)
    }
  }, [gl])

  useFrame((state, dt) => {
    const g = useGame.getState()
    if (mode === 'title') {
      const t = state.clock.elapsedTime
      camera.position.set(TITLE_POS.x + Math.sin(t * 0.2) * 0.04, TITLE_POS.y + Math.sin(t * 0.33) * 0.01, TITLE_POS.z)
      camera.lookAt(TITLE_LOOK)
      return
    }
    if (mode !== 'play') {
      if (import.meta.env.DEV && mode === 'idle') camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'))
      return
    }
    // scena del lockdown: la camera si gira verso le finestre mentre scendono le serrande
    if (g.cinematic) {
      const t = (performance.now() - g.cinematic) / 1000
      const targetYaw = Math.PI / 2 + Math.round((yaw.current - Math.PI / 2) / (Math.PI * 2)) * Math.PI * 2
      const k2 = Math.min(1, dt * (t < 4.2 ? 1.6 : 0))
      yaw.current += (targetYaw - yaw.current) * k2
      pitch.current += (0.32 - pitch.current) * k2
      camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'))
      fx.shake *= Math.pow(0.02, dt)
      camera.position.y = 1.6 + (Math.random() - 0.5) * fx.shake
      camera.position.x += (Math.random() - 0.5) * fx.shake * 0.3
      g.setHovered(null)
      if (t > 5.4) {
        g.setCinematic(null)
        g.goto('m0_login')
      }
      return
    }
    // ispezione: la telecamera si avvicina all'oggetto, poi torna dove eri
    const r = ret.current
    if (g.inspect) {
      if (!r.active) {
        r.pos.copy(camera.position)
        r.active = true
        r.back = false
      }
      const k1 = Math.min(1, dt * 4.5)
      camera.position.lerp(tmpV.set(...g.inspect.pos), k1)
      tmpM.lookAt(camera.position, tmpV.set(...g.inspect.look), camera.up)
      tmpQ.setFromRotationMatrix(tmpM)
      camera.quaternion.slerp(tmpQ, k1)
      g.setHovered(null)
      return
    }
    if (r.active) {
      r.active = false
      r.back = true
    }
    if (r.back) {
      const k1 = Math.min(1, dt * 5)
      camera.position.lerp(r.pos, k1)
      tmpQ.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'))
      camera.quaternion.slerp(tmpQ, k1)
      if (camera.position.distanceTo(r.pos) < 0.01) r.back = false
      return
    }
    camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'))
    const k = keys.current
    const ix = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0)
    const iz = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0)
    if ((ix || iz) && !g.note) {
      fwd.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current))
      right.set(Math.cos(yaw.current), 0, -Math.sin(yaw.current))
      const v = fwd.multiplyScalar(iz).add(right.multiplyScalar(ix)).normalize().multiplyScalar((k.ShiftLeft ? 3.6 : 2.4) * Math.min(dt, 0.05))
      const blocked = (x: number, z: number) => COLLIDERS.some(([a, b, c, d]) => x > a - 0.28 && x < b + 0.28 && z > c - 0.28 && z < d + 0.28)
      const p = camera.position
      const nx = THREE.MathUtils.clamp(p.x + v.x, BOUNDS.minX, BOUNDS.maxX)
      if (!blocked(nx, p.z)) p.x = nx
      const nz = THREE.MathUtils.clamp(p.z + v.z, BOUNDS.minZ, BOUNDS.maxZ)
      if (!blocked(p.x, nz)) p.z = nz
      bob.current += dt * 9
      walked.current += v.length()
      if (walked.current > 1.5 && !g.progress?.flags.tutMove) g.setFlag('tutMove')
    }
    camera.position.y = 1.6 + Math.sin(bob.current) * (g.settings.reduceMotion ? 0 : 0.025)

    // controllo dello sguardo: solo sugli oggetti interattivi e 20 volte al secondo
    frame.current = (frame.current + 1) % 3
    if (frame.current) return
    ray.setFromCamera(center, camera)
    ray.far = 2.6
    let id: string | null = null
    const h = ray.intersectObjects([...HITS], true)[0]
    if (h) {
      let o: THREE.Object3D | null = h.object
      while (o && !o.userData.interact) o = o.parent
      id = o?.userData.interact ?? null
    }
    g.setHovered(id)
  })
  return null
}

// ---------- arredi ----------
const CHAIR_TINTS = ['#2c3440', '#3a2f2c', '#2f3a33']
function Chair({ p, ry = 0, tint }: { p: V3; ry?: number; m?: Mats; tint?: string }) {
  const c = tint ?? CHAIR_TINTS[Math.abs(Math.round(p[0] * 3 + p[2] * 7)) % CHAIR_TINTS.length]
  return (
    <CustomModel
      name="chair"
      position={p}
      rotation={[0, ry, 0]}
      deps={[c]}
      tweak={(o) => {
        const mm = o as THREE.Mesh
        const mat = mm.material as THREE.MeshStandardMaterial | undefined
        if (mm.isMesh && mat?.name === 'Tessuto') {
          mm.material = mat.clone()
          ;(mm.material as THREE.MeshStandardMaterial).color.set(c)
        }
      }}
    />
  )
}

function Plant({ p, s = 1 }: { p: V3; s?: number; m?: Mats }) {
  return <Model id="pachira_aquatica_01" pick={['pachira_aquatica_01_bark_d', 'pachira_aquatica_01_leaves_d']} position={p} scale={s} />
}

// Chi lavora a questa scrivania? Gli oggetti lo raccontano.
// Il piano (2 x 0.95 m) ha zone fisse che NON toccano la postazione:
// monitor al centro, tower a destra dietro (x 0.38..0.56), tastiera davanti al centro, mouse a destra davanti (fino a x 0.47).
const SLOT = {
  leftBack: [-0.66, 0.79, -0.24] as V3,
  leftFront: [-0.62, 0.79, 0.22] as V3,
  rightBack: [0.8, 0.79, -0.26] as V3,
  rightFront: [0.8, 0.79, 0.26] as V3,
}
const PENCILCUP = ['stationery_supplies_pencilcup']
const PLANT = ['potted_plant_02_pot', 'potted_plant_02_leaves', 'potted_plant_02_dirt']
type Persona = 'tidy' | 'messy' | 'empty' | 'plant' | 'boss' | 'none'
function Desk({ p, ry = 0, monitor = true, partition = true, persona = 'tidy', drawerOpen = false, saver = false, children }: { p: V3; m?: Mats; ry?: number; monitor?: boolean; partition?: boolean; persona?: Persona; drawerOpen?: boolean; saver?: boolean; children?: ReactNode }) {
  const chairTurn = { tidy: 0, messy: 0.5, empty: 0, plant: -0.2, boss: 0.15, none: 0 }[persona]
  const chairZ = persona === 'empty' || persona === 'tidy' ? 0.62 : 0.85
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <Model
        id="metal_office_desk"
        deps={[drawerOpen]}
        tweak={(o) => {
          if (o.name.endsWith('drawer_04')) o.position.z += drawerOpen ? 0.28 : 0
        }}
      />
      {partition && <CustomModel name="partition" position={[0, 0, -0.5]} />}
      {monitor && <group position={[0, 0.79, -0.15]}><CrtModel dark={!saver} saver={saver} /></group>}
      <Chair p={[0.05, 0, chairZ]} ry={Math.PI + chairTurn} />
      {monitor && <CustomModel name="powerstrip" position={[0.3, 0, -0.2]} />}
      {persona === 'tidy' && (
        <>
          <Model id="office_notepads" pick={['office_notepads_a4_stack']} position={SLOT.leftFront} rotation={[0, 0.08, 0]} />
          <Model id="stationery_supplies" pick={PENCILCUP} position={SLOT.rightBack} />
          <CustomModel name="headphones" position={SLOT.rightFront} rotation={[0, -0.6, 0]} />
        </>
      )}
      {persona === 'messy' && (
        <>
          <Model id="office_notepads" pick={['office_notepads_a4_stack']} position={SLOT.leftFront} rotation={[0, 0.35, 0]} />
          <Model id="office_notepads" pick={['office_notepads_a4_b']} position={[-0.6, 0.805, 0.18]} rotation={[0, -0.25, 0]} />
          <CustomModel name="pizzabox" position={SLOT.leftBack} rotation={[0, 0.25, 0]} />
          <CustomModel name="papercup" position={SLOT.rightFront} />
          <Mug position={SLOT.rightBack} />
          <CustomModel name="stickies" position={[0.255, 0.95, -0.115]} />
          <Model id="metal_trash_can" pick={['metal_trash_can_rust', 'metal_trash_can_rust_lid']} position={[0.25, 0, -0.15]} scale={0.45} />
        </>
      )}
      {persona === 'plant' && (
        <>
          <Model id="potted_plant_02" pick={PLANT} position={SLOT.rightBack} scale={0.4} />
          <Mug position={SLOT.leftFront} />
          <CustomModel name="stickies" position={[-0.255, 0.95, -0.115]} />
        </>
      )}
      {persona === 'boss' && (
        <>
          <Model id="binder_notebook" pick={['binder_notebook_closed']} position={SLOT.leftFront} rotation={[0, 0.1, 0]} />
          <Model id="stationery_supplies" pick={PENCILCUP} position={SLOT.leftBack} />
          <Model id="potted_plant_02" pick={PLANT} position={SLOT.rightBack} scale={0.38} />
        </>
      )}
      {children}
    </group>
  )
}

function PlayerDesk({ m, lockdown, mode }: { m: Mats; lockdown: boolean; mode: WorldMode }) {
  const p = useGame((s) => s.progress)
  const loggedIn = !!p?.flags.loggedIn
  const screen = useMemo(
    () =>
      lockdown
        ? textTexture(['RELAY OS', '', '! LOCKDOWN', loggedIn ? '  sessione attiva' : '  accesso richiesto'], { w: 320, h: 240, bg: '#2a1408', color: '#E8823A', font: '500 28px "JetBrains Mono"' })
        : textTexture(['RELAY OS', '', 'Turno in corso', 'nessun allarme'], { w: 320, h: 240, bg: '#14243a', color: '#cfe0f0', font: '500 28px "JetBrains Mono"' }),
    [lockdown, loggedIn],
  )
  const postit = useMemo(() => textTexture([p?.username ?? 'utente', 'Halden2019'], { w: 256, h: 256, bg: '#ecd66f', color: '#2a2722', font: '700 40px Caveat', pad: 22, lineHeight: 1.35 }), [p?.username])
  return (
    <group position={[0, 0, 2]}>
      <Model id="metal_office_desk" />
      <CustomModel name="partition" position={[0, 0, -0.5]} />
      <Hit id="computer" position={[0, 0.79, -0.15]}>
        <CrtModel live />
      </Hit>
      <Hit id="postit" position={[0.205, 1.195, -0.122]} rotation={[0, 0, -0.12]}>
        <mesh>
          <planeGeometry args={[0.1, 0.1]} />
          <meshStandardMaterial map={postit} />
        </mesh>
      </Hit>
      {/* lampada snodata */}
      <group position={[-0.7, 0.79, -0.2]}>
        <Model id="desk_lamp_arm_01" rotation={[0, 0.6, 0]} />
        <spotLight position={[0.1, 0.62, 0.2]} angle={0.95} penumbra={0.7} intensity={7} distance={4} color="#ffb867" castShadow shadow-mapSize={[512, 512]} shadow-bias={-0.0006} shadow-normalBias={0.02} />
      </group>
      {/* telefono fisso a tasti (muto), tazza, carte */}
      {mode !== 'title' && <CustomModel name="phone" position={[0.78, 0.79, 0.05]} rotation={[0, -0.35, 0]} />}
      {mode !== 'title' && (
        <>
          <Mug position={[0.86, 0.79, 0.36]} />
          <Model id="office_notepads" pick={['office_notepads_yellow_pad']} position={[-0.58, 0.79, 0.24]} rotation={[0, 0.2, 0]} />
          <Model id="stationery_supplies" pick={PENCILCUP} position={[0.82, 0.79, -0.3]} />
        </>
      )}
      {mode !== 'title' && <Chair p={[0, 0, 0.85]} ry={Math.PI} tint="#2c3440" />}
      <CustomModel name="powerstrip" position={[0.3, 0, -0.2]} />
    </group>
  )
}

// Oggetti del menu sulla scrivania (title screen diegetica)
export type TitleItem = 'badge' | 'notebook' | 'phone' | 'mug' | 'monitor'
function TitleProps({ m }: { m: Mats }) {
  const [hover, setHover] = useState<TitleItem | null>(null)
  const badge = useMemo(() => textTexture(['HALDEN', 'NETCARE', '', 'TECNICO'], { w: 160, h: 220, bg: '#efe9da', color: '#1c1f24', font: '600 26px Big Shoulders Display', pad: 14 }), [])
  const nb = useMemo(() => textTexture(['A.F.'], { w: 128, h: 160, bg: '#2B4A6B', color: '#E8DFC9', font: '700 40px Caveat', pad: 18 }), [])
  const pick = (id: TitleItem) => window.dispatchEvent(new CustomEvent('title-pick', { detail: id }))
  const over = (id: TitleItem | null) => {
    setHover(id)
    window.dispatchEvent(new CustomEvent('title-hover', { detail: id }))
    document.body.style.cursor = id ? 'pointer' : ''
  }
  const ev = (id: TitleItem) => ({
    onPointerOver: (e: { stopPropagation: () => void }) => (e.stopPropagation(), over(id)),
    onPointerOut: () => over(null),
    onClick: (e: { stopPropagation: () => void }) => (e.stopPropagation(), pick(id)),
  })
  // schermata di blocco dello smartphone: orario e notifica di Teo
  const lockTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 512
    const g = c.getContext('2d')!
    const gr = g.createLinearGradient(0, 0, 0, 512)
    gr.addColorStop(0, '#1b2a40')
    gr.addColorStop(1, '#0b1018')
    g.fillStyle = gr
    g.fillRect(0, 0, 256, 512)
    g.fillStyle = '#e8e2d2'
    g.textAlign = 'center'
    g.font = '900 84px "Big Shoulders Display"'
    g.fillText('23:41', 128, 140)
    g.font = '500 18px "Inter Tight"'
    g.fillText('martedì 14 novembre', 128, 172)
    g.fillStyle = 'rgba(232,226,210,0.14)'
    g.fillRect(16, 220, 224, 78)
    g.fillStyle = '#e8e2d2'
    g.textAlign = 'left'
    g.font = '600 17px "Inter Tight"'
    g.fillText('Teo', 30, 248)
    g.font = '400 15px "Inter Tight"'
    g.fillText('Primo turno di notte, eh?', 30, 272)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.flipY = false
    return t
  }, [])
  const lift = (id: TitleItem) => (hover === id ? 0.025 : 0)
  return (
    <group position={[0, 0, 2]}>
      {/* oggetti un po' più grandi del vero: devono leggersi come voci di menu */}
      {/* monitor = continua */}
      <mesh position={[0, 1.08, -0.14]} {...ev('monitor')}>
        <boxGeometry args={[0.52, 0.32, 0.08]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      <group position={[-0.82, 0.795 + lift('badge'), 0.3]} rotation={[-Math.PI / 2, 0, 0.25]} scale={1.6} {...ev('badge')}>
        <mesh><planeGeometry args={[0.09, 0.125]} /><meshStandardMaterial map={badge} emissive="#E8823A" emissiveIntensity={hover === 'badge' ? 0.25 : 0} /></mesh>
        <Box p={[0, 0.08, 0.001]} s={[0.02, 0.04, 0.002]} m={m.steel} />
      </group>
      <group position={[-0.5, 0.81 + lift('notebook'), 0.3]} rotation={[0, -0.12, 0]} scale={1.35} {...ev('notebook')}>
        <mesh><boxGeometry args={[0.17, 0.025, 0.23]} /><meshStandardMaterial color="#2B4A6B" emissive="#E8823A" emissiveIntensity={hover === 'notebook' ? 0.25 : 0} /></mesh>
        <mesh position={[0, 0.0135, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.15, 0.2]} /><meshStandardMaterial map={nb} /></mesh>
      </group>
      <group position={[0.66, 0.79 + lift('phone'), 0.36]} rotation={[0, 0.35, 0]} {...ev('phone')}>
        <CustomModel
          name="smartphone"
          tweak={(o) => {
            const mm = o as THREE.Mesh
            if (mm.isMesh && o.name === 'PhoneScreen') mm.material = new THREE.MeshStandardMaterial({ map: lockTex, emissiveMap: lockTex, emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.2 })
          }}
        />
        <mesh position={[0, 0.004, 0]}><boxGeometry args={[0.09, 0.02, 0.17]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
      </group>
      <group position={[0.8, 0.79 + lift('mug'), 0.05]} {...ev('mug')}>
        <Mug />
        <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.06, 0.06, 0.11, 12]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
      </group>
    </group>
  )
}

function AdaDesk({ m }: { m: Mats }) {
  const mug = useMemo(() => textTexture(['GANDALF'], { w: 128, h: 48, bg: '#e9e1c8', color: '#1c1f24', font: '600 26px Big Shoulders Display', align: 'center', pad: 8 }), [])
  const open = useGame((s) => !!s.progress?.flags.adaDrawerOpen)
  const taken = useGame((s) => !!s.progress?.flags.notebook)
  const nb = useMemo(() => textTexture(['A.F.'], { w: 128, h: 160, bg: '#2B4A6B', color: '#E8DFC9', font: '700 40px Caveat', pad: 18 }), [])
  // la scrivania guarda la sala: Ada sedeva con le finestre alle spalle
  return (
    <group position={[-6.4, 0, -4.5]} rotation={[0, -Math.PI / 2, 0]}>
      <Hit id="adaDesk">
        <Desk p={[0, 0, 0]} m={m} monitor={false} partition={false} persona="none" drawerOpen={open} />
      </Hit>
      {/* il taccuino nel cassetto */}
      {open && !taken && (
        <group position={[-0.715, 0.63, 0.58]} rotation={[0, 0.15, 0]}>
          <mesh castShadow><boxGeometry args={[0.17, 0.022, 0.23]} /><meshStandardMaterial color="#2B4A6B" roughness={0.8} /></mesh>
          <mesh position={[0, 0.0115, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.15, 0.2]} /><meshStandardMaterial map={nb} /></mesh>
        </group>
      )}
      <CustomModel name="deadplant" position={[0.72, 0.79, -0.22]} />
      <Model id="binder_notebook" pick={['binder_notebook_closed']} position={[-0.62, 0.79, 0.2]} rotation={[0, -0.15, 0]} />
      <Hit id="adaPhoto" position={[0.25, 0.79, -0.3]}>
        <Model id="standing_picture_frame_01" rotation={[0, -Math.PI / 2, 0]} scale={1.2} />
      </Hit>
      <Mug position={[0.45, 0.79, 0.2]} label={mug} />
      <CustomModel name="nameplate" position={[-0.2, 0.79, -0.36]} rotation={[0, Math.PI, 0]} />
    </group>
  )
}

function RackLeds({ plugged, sandbox }: { plugged: boolean; sandbox: boolean }) {
  const greens = useRef<THREE.MeshStandardMaterial[]>([])
  const p7 = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    greens.current.forEach((mm, i) => mm && (mm.emissiveIntensity = Math.sin(t * (3 + (i % 5)) + i * 1.7) > 0.2 ? 2.4 : 0.3))
    if (p7.current) p7.current.emissiveIntensity = sandbox ? (Math.sin(t * 14) > 0 ? 3.5 : 0.4) : 1.6
  })
  const out: ReactNode[] = []
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 8; col++) {
      const i = row * 8 + col
      const isP4 = row === 3 && col === 3
      const isP7 = row === 3 && col === 6
      out.push(
        <mesh key={i} position={[-0.175 + col * 0.05, 0.5 + row * 0.24 + 0.016, 0.405]}>
          <boxGeometry args={[0.026, 0.014, 0.01]} />
          {isP4 ? <meshStandardMaterial color={plugged ? '#6FBF8E' : '#D9644A'} emissive={plugged ? '#6FBF8E' : '#D9644A'} emissiveIntensity={2.4} />
            : isP7 ? <meshStandardMaterial ref={p7} color="#E8823A" emissive="#E8823A" />
            : <meshStandardMaterial ref={(r) => r && (greens.current[i] = r)} color="#6FBF8E" emissive="#6FBF8E" />}
        </mesh>,
      )
    }
  return <>{out}</>
}

function ServerRoom({ m }: { m: Mats }) {
  const step = useGame((s) => s.progress?.step ?? 'm0_coffee')
  const flags = useGame((s) => s.progress?.flags ?? {})
  const si = stepIndex(step)
  const plugged = si >= stepIndex('m1_verify')
  const sandbox = si >= stepIndex('m2_monitor')
  const open = !!flags.foundSandbox
  const sbLabel = useMemo(() => textTexture(['SANDBOX-7', 'ESERCITAZIONE', '— A.F.'], { w: 256, h: 128, bg: '#efe6c8', color: '#222', font: '500 26px "JetBrains Mono"', pad: 10 }), [])
  return (
    <group>
      {/* vetrate */}
      <mesh position={[3, 1.6, -7.5]} rotation={[0, Math.PI / 2, 0]} material={m.glass} userData={{ seeThrough: true }}><planeGeometry args={[5, 3.2]} /></mesh>
      <mesh position={[6.4, 1.6, -5]} material={m.glass} userData={{ seeThrough: true }}><planeGeometry args={[3.2, 3.2]} /></mesh>
      <mesh position={[3.3, 1.6, -5]} material={m.glass} userData={{ seeThrough: true }}><planeGeometry args={[0.6, 3.2]} /></mesh>
      {[3, 3.6, 4.8, 8].map((x) => <Box key={x} p={[x, 1.6, -5]} s={[0.06, 3.2, 0.06]} m={m.metal} />)}
      {[-10, -7.5, -5].map((z) => <Box key={z} p={[3, 1.6, z]} s={[0.06, 3.2, 0.06]} m={m.metal} />)}
      <Box p={[5.5, 3.2, -5]} s={[5, 0.08, 0.08]} m={m.metal} />
      <Box p={[3, 3.2, -7.5]} s={[0.08, 0.08, 5]} m={m.metal} />
      <Label lines={['SALA SERVER']} p={[6.4, 2.6, -4.97]} w={2.2} h={0.4} opts={{ w: 512, h: 96, color: '#E8DFC9', font: '600 72px Big Shoulders Display' }} />
      {/* rack */}
      {[4.0, 5.0].map((x, i) => (
        <group key={x} position={[x, 0, -9.4]}>
          {i === 0 ? (
            <Hit id="rack">
              <CustomModel name="rack" />
              <RackLeds plugged={plugged} sandbox={sandbox} />
              {!plugged && <mesh position={[-0.04, 1.0, 0.48]} rotation={[0.3, 0, 0.2]}><cylinderGeometry args={[0.009, 0.009, 0.55, 6]} /><meshStandardMaterial color="#3d7bd0" /></mesh>}
              <Label lines={['RACK B']} p={[0, 2.25, 0.41]} w={0.6} h={0.15} opts={{ w: 256, h: 64, color: '#E8DFC9', font: '600 44px Big Shoulders Display' }} />
            </Hit>
          ) : (
            <Hit id="rack">
              <CustomModel name="rack" />
              <RackLeds plugged sandbox={false} />
            </Hit>
          )}
        </group>
      ))}
      <Hit id="cabinet" position={[6.6, 0, -9.4]}>
        <CustomModel name="cabinet" deps={[open]} tweak={(o) => { if (o.name === 'Anta') o.rotation.y = open ? -1.6 : 0 }} />
        {open && <mesh position={[0, 0.735, 0.252]}><planeGeometry args={[0.2, 0.05]} /><meshStandardMaterial map={sbLabel} /></mesh>}
        <pointLight position={[0, 0.9, 0.5]} color="#E8823A" intensity={open ? 1 : 0} distance={1.8} />
      </Hit>
      {/* il cavo grigio, più vecchio degli altri, dalla porta 7 del Rack B all'armadio di SANDBOX-7 */}
      <mesh>
        <tubeGeometry args={[new THREE.CatmullRomCurve3([new THREE.Vector3(4.125, 1.236, -8.98), new THREE.Vector3(4.2, 1.0, -8.85), new THREE.Vector3(4.5, 0.03, -8.75), new THREE.Vector3(5.6, 0.03, -8.8), new THREE.Vector3(6.1, 0.25, -9.1)]), 48, 0.008, 6, false]} />
        <meshStandardMaterial color="#9c9a8f" roughness={0.7} />
      </mesh>
      <ServerRoomLight broken={!plugged && step !== 'm0_coffee' && step !== 'm0_login' && step !== 'm0_password'} />
      <mesh position={[5.5, 3.15, -7.5]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[3, 0.25]} /><meshStandardMaterial color="#a8c8ee" emissive="#a8c8ee" emissiveIntensity={2} /></mesh>
    </group>
  )
}

// Luce della sala server: rossa e pulsante quando il collegamento è rotto, blu e stabile quando funziona.
function ServerRoomLight({ broken }: { broken: boolean }) {
  const ref = useRef<THREE.PointLight>(null)
  useFrame(({ clock }) => {
    const l = ref.current
    if (!l) return
    if (broken) {
      l.color.set('#e0503a')
      l.intensity = 1.6 + Math.sin(clock.elapsedTime * 3) * 0.9
    } else {
      l.color.set('#7fb0e6')
      l.intensity = 3.2
    }
  })
  return <pointLight ref={ref} position={[5.5, 2.9, -7.2]} distance={9} />
}

function Shutters({ lockdown, level }: { lockdown: boolean; level: number }) {
  const telo = useRef<(THREE.Object3D | null)[]>([])
  const landed = useRef<boolean[]>([])
  const started = useRef<boolean[]>([])
  const OPEN = 3.2 // di quanto il telo sale dentro il cassonetto (finestre da 3 m)
  useFrame(() => {
    const cin = useGame.getState().cinematic
    telo.current.forEach((r, i) => {
      if (!r) return
      if (!lockdown) {
        r.position.y = OPEN
        landed.current[i] = started.current[i] = false
        return
      }
      if (!cin) {
        // la stanza "risponde" ai progressi: le serrande si sollevano man mano che riprendi il controllo
        const target = OPEN * (level >= 3 ? 0.6 : level >= 2 ? 0.3 : 0)
        if (target > r.position.y + 0.02 && !started.current[10 + i]) {
          started.current[10 + i] = true
          sfx.rattle(i * 0.2, 1.4)
        }
        r.position.y += (target - r.position.y) * 0.02
        return
      }
      const t = (performance.now() - cin) / 1000 - (0.7 + i * 0.55)
      if (t < 0) return
      if (!started.current[i]) {
        started.current[i] = true
        sfx.rattle(0, 0.5)
      }
      const y = Math.max(0, OPEN - 0.5 * 16 * t * t)
      r.position.y = y
      if (y <= 0 && !landed.current[i]) {
        landed.current[i] = true
        sfx.slam()
        fx.shake = 0.07
      }
    })
  })
  return (
    <>
      {[-7.5, -4.5, -1.5, 1.5, 4.5].map((z, i) => (
        <CustomModel
          key={z}
          name="shutter"
          position={[-7.9, 0.8, z]}
          rotation={[0, Math.PI / 2, 0]}
          tweak={(o) => {
            if (o.name === 'Telo') {
              telo.current[i] = o
              o.position.y = OPEN
            }
          }}
        />
      ))}
    </>
  )
}

function Building({ mode }: { mode: WorldMode }) {
  const m = useMats()
  const lockdown = useGame((s) => !!s.progress?.flags.lockdown) && mode !== 'title'
  const emerg = useRef<THREE.PointLight[]>([])
  useEffect(() => () => sfx.alarmOff(), [])
  const emergMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a2414', emissive: '#E8823A', emissiveIntensity: 0 }), [])
  emergMat.emissiveIntensity = lockdown ? 2.5 : 0
  const disp = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const v = lockdown ? 1.8 + Math.sin(t * 1.4) * 0.35 : 0
    emerg.current.forEach((l) => l && (l.intensity = v))
    if (disp.current) disp.current.emissiveIntensity = lockdown ? 1.1 + Math.sin(t * 1.4) * 0.2 : 0.5
  })
  const level = useGame((s) => (s.progress ? unlockLevel(s.progress.step) : 0))
  const display = useMemo(
    () =>
      lockdown
        ? textTexture(['LOCKDOWN', `SBLOCCO ${level}/3`], { w: 512, h: 192, bg: '#2a1408', color: '#E8823A', font: '600 64px Big Shoulders Display', align: 'center' })
        : textTexture(['LIVELLO B2', 'turno notturno'], { w: 512, h: 192, bg: '#0f1a26', color: '#9fc0d8', font: '600 56px Big Shoulders Display', align: 'center' }),
    [lockdown, level],
  )
  const city = useMemo(() => cityTexture(), [])
  const brokenTex = useMemo(() => textTexture(['GUASTA', 'usate quella del B1'], { w: 256, h: 104, bg: '#f2efe6', color: '#b4442e', font: '700 40px Caveat', align: 'center', pad: 8, lineHeight: 1.05 }), [])
  const boxTex = useMemo(() => textTexture(['A. FERRI', 'DA RITIRARE'], { w: 256, h: 104, bg: '#f2efe6', color: '#1a1b1d', font: '800 40px "Big Shoulders Display"', align: 'center', pad: 10, lineHeight: 1.0 }), [])
  const boardTex = useMemo(() => noticeBoardTexture(), [])
  const exitTex = useMemo(() => textTexture(['USCITA  →'], { w: 512, h: 160, bg: '#1f8a4c', color: '#f2fff4', font: '800 100px "Big Shoulders Display"', align: 'center', pad: 24 }), [])
  const wb = useMemo(() => textTexture(['GIORNI SENZA INCIDENTI:  0', '', '[UFFICI]—sw—ROUTER—sw—[SERVER]', '', '"due quartieri, un ponte" — A.'], { w: 1024, h: 512, bg: '#eeeeea', color: '#1d3a63', font: '700 52px Caveat', pad: 36, lineHeight: 1.25 }), [])

  return (
    <group>
      {/* PAVIMENTO: cemento lucidato nei passaggi, moquette a quadrotte nelle zone di lavoro */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]} material={m.floor} receiveShadow><planeGeometry args={[16, 16]} /></mesh>
      <Carpet p={[-1.9, -0.65]} w={7.4} d={7.5} />
      <Carpet p={[-6.6, -4.5]} w={2.0} d={3.4} />
      {/* SOFFITTO a 4.2 m: controsoffitto a pannelli con luci di cortesia incassate */}
      <Ceiling />
      {/* MURI: cemento a vista solo sul fondo (muro di rappresentanza), il resto intonacato */}
      <Wall p={[0, 2.1, -10]} w={16} h={4.2} />
      <Plaster p={[0, 2.1, 6]} r={[0, Math.PI, 0]} w={16} h={4.2} />
      <Plaster p={[8, 2.1, -4]} r={[0, -Math.PI / 2, 0]} w={12} h={4.2} />
      <Plaster p={[8, 2.1, 5]} r={[0, -Math.PI / 2, 0]} w={2} h={4.2} />
      <Plaster p={[8, 3.6, 3]} r={[0, -Math.PI / 2, 0]} w={2} h={1.2} />
      {/* battiscopa */}
      {([[0, -9.99, 16, 0], [0, 5.99, 16, 0], [7.99, -4, 12, 1], [7.99, 5, 2, 1]] as [number, number, number, number][]).map(([x, z, w, rot], i) => (
        <Box key={i} p={[rot ? x : x, 0.05, rot ? z : z]} r={[0, rot ? Math.PI / 2 : 0, 0]} s={[w, 0.1, 0.015]} m={m.black} />
      ))}
      {/* parete delle finestre: pilastri, davanzali, architravi */}
      {[-9.25, -6, -3, 0, 3, 5.6].map((z, i) => (
        <Plaster key={i} p={[-8, 2.1, z]} r={[0, Math.PI / 2, 0]} w={i === 0 || i === 5 ? 1.5 : 0.7} h={4.2} />
      ))}
      {[-7.5, -4.5, -1.5, 1.5, 4.5].map((z) => (
        <group key={z}>
          <Plaster p={[-8, 0.4, z]} r={[0, Math.PI / 2, 0]} w={2.3} h={0.8} />
          <Plaster p={[-8, 4.0, z]} r={[0, Math.PI / 2, 0]} w={2.3} h={0.4} />
          <Box p={[-7.92, 0.8, z]} s={[0.18, 0.04, 2.34]} m={m.steel} />
          <Hit id="window">
            <mesh position={[-8.05, 2.3, z]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[2.3, 3.0]} />
              <meshStandardMaterial color="#9fb6cc" transparent opacity={0.07} roughness={0.05} depthWrite={false} />
            </mesh>
          </Hit>
          <Box p={[-8, 2.3, z]} s={[0.08, 3.0, 0.05]} m={m.metal} />
          <Box p={[-8, 2.3, z]} s={[0.08, 0.05, 2.3]} m={m.metal} />
          <Blinds z={z} />
        </group>
      ))}
      {/* la città, fuori: ricorda che il mondo continua oltre le finestre */}
      <mesh position={[-26, 6, -2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[80, 20]} />
        <meshBasicMaterial map={city} fog={false} />
      </mesh>
      <Shutters lockdown={lockdown} level={level} />
      {/* MURO DI FONDO: archivi, lavagna davanti alle scrivanie, logo e slogan in alto */}
      {[-6.2, -5.0, 0.8, 2.0].map((x) => <Model key={x} id="drawer_cabinet" position={[x, 0, -9.7]} />)}
      <Label lines={['HALDEN NETCARE']} p={[-2, 3.42, -9.98]} w={6} h={0.78} opts={{ w: 1536, h: 200, color: '#d8d2c4', font: '900 170px Big Shoulders Display', align: 'center' }} />
      <Label lines={['BETTER CONNECTIONS, A BRIGHTER TOMORROW.']} p={[-2, 2.86, -9.98]} w={6} h={0.3} opts={{ w: 2048, h: 100, color: '#E8823A', font: '700 80px Big Shoulders Display', align: 'center' }} />
      <Hit id="whiteboard" position={[-2, 0.1, -9.95]}>
        <CustomModel
          name="whiteboard"
          tweak={(o) => {
            const mm = o as THREE.Mesh
            if (mm.isMesh && o.name === 'Board') {
              wb.flipY = false
              wb.needsUpdate = true
              mm.material = new THREE.MeshStandardMaterial({ map: wb, roughness: 0.3 })
            }
          }}
        />
      </Hit>
      <Label lines={['LEVEL', 'B2']} p={[6.1, 2.55, 5.97]} r={[0, Math.PI, 0]} w={1.9} h={1.9} opts={{ w: 512, h: 512, color: '#d8d2c4', font: '900 210px Big Shoulders Display', lineHeight: 0.92 }} />
      {/* uscita di sicurezza: verde luminoso, come negli edifici veri */}
      <group position={[7.95, 3.42, 3]} rotation={[0, -Math.PI / 2, 0]}>
        <Box p={[0, 0, -0.02]} s={[0.62, 0.22, 0.04]} m={m.black} />
        <mesh><planeGeometry args={[0.58, 0.18]} /><meshStandardMaterial map={exitTex} emissiveMap={exitTex} emissive="#ffffff" emissiveIntensity={1.4} /></mesh>
      </group>

      {/* segnaletica di orientamento */}
      <Label lines={['SALA SERVER →']} p={[2.65, 2.45, -9.98]} w={1.6} h={0.3} opts={{ w: 1024, h: 190, color: '#E8823A', font: '900 150px "Big Shoulders Display"', align: 'center' }} />
      <Label lines={['ARCHIVIO']} p={[-5.6, 2.3, -9.98]} w={1.4} h={0.3} opts={{ w: 1024, h: 210, color: '#d8d2c4', font: '900 170px "Big Shoulders Display"', align: 'center' }} />
      {/* INGRESSO: porta a vetri, lettore badge, display, attaccapanni, distributore */}
      <Hit id="door" position={[7.97, 0, 3]}>
        <CustomModel
          name="door"
          rotation={[0, -Math.PI / 2, 0]}
          deps={[lockdown]}
          tweak={(o) => {
            const mm = o as THREE.Mesh
            if (mm.isMesh && o.name.startsWith('ReaderLED')) {
              const c = lockdown ? '#D9644A' : '#6FBF8E'
              mm.material = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 3 })
            }
          }}
        />
      </Hit>
      <Hit id="display" position={[7.96, 2.1, 4.6]} rotation={[0, -Math.PI / 2, 0]}>
        <Box p={[0, 0, -0.03]} s={[1.1, 0.46, 0.04]} m={m.black} />
        <mesh><planeGeometry args={[1, 0.38]} /><meshStandardMaterial ref={disp} map={display} emissiveMap={display} emissive="#ffffff" /></mesh>
      </Hit>
      <CustomModel name="coatrack" position={[7.4, 0, 5.45]} rotation={[0, -2.2, 0]} />
      <Hit id="cooler" position={[7.55, 0, 0.9]}>
        <CustomModel name="cooler" rotation={[0, -Math.PI / 2, 0]} />
      </Hit>
      <Model id="metal_trash_can" pick={['metal_trash_can', 'metal_trash_can_lid', 'metal_trash_can_handle_left', 'metal_trash_can_handle_right']} position={[7.55, 0, 0.15]} scale={0.5} />
      {/* corridoio oltre il vetro: la libertà, vicinissima */}
      <group position={[13, 0, 3]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} material={m.yellowFloor}><planeGeometry args={[10, 2]} /></mesh>
        <Wall p={[0, 1.6, -1]} w={10} h={3.2} />
        <Wall p={[0, 1.6, 1]} r={[0, Math.PI, 0]} w={10} h={3.2} />
        <Wall p={[0, 3.2, 0]} r={[Math.PI / 2, 0, 0]} w={10} h={2} />
        <mesh position={[5, 1.6, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[2, 3.2]} /><meshStandardMaterial color="#6b5a43" /></mesh>
        <Box p={[1, 0.25, -0.75]} s={[1.4, 0.06, 0.4]} m={m.wood} />
        <Plant p={[3.5, 0, -0.7]} s={0.6} m={m} />
        <pointLight position={[0, 2.9, 0]} color="#ffd9a0" intensity={2.5} distance={8} />
      </group>

      {/* POSTAZIONI A BANCO: due file, scrivanie contrapposte; finestra a sinistra, lavagna davanti */}
      <PlayerDesk m={m} lockdown={lockdown} mode={mode} />
      {mode === 'title' && <TitleProps m={m} />}
      <Desk p={[-2, 0, 2]} persona="messy" />
      <Desk p={[-4, 0, 2]} persona="tidy" />
      <Desk p={[0, 0, 1]} ry={Math.PI} partition={false} persona="tidy" />
      <Desk p={[-2, 0, 1]} ry={Math.PI} partition={false} persona="plant" />
      <Desk p={[-4, 0, 1]} ry={Math.PI} partition={false} persona="empty" />
      <Desk p={[0, 0, -2.4]} persona="boss" />
      <Desk p={[-2, 0, -2.4]} persona="tidy" saver />
      <Desk p={[-4, 0, -2.4]} persona="empty" />
      <Desk p={[0, 0, -3.4]} ry={Math.PI} partition={false} persona="messy" />
      <Desk p={[-2, 0, -3.4]} ry={Math.PI} partition={false} persona="empty" />
      <Desk p={[-4, 0, -3.4]} ry={Math.PI} partition={false} persona="plant" />
      <AdaDesk m={m} />

      <ServerRoom m={m} />

      {/* SALA RIUNIONI a vetri, con fascia satinata ad altezza occhi */}
      <MeetingRoom m={m} />
      {/* ANGOLO CAFFÈ: la macchina è guasta (per questo, nel prologo, esci a cercarne un'altra) */}
      <Hit id="coffee" position={[3.6, 0, 5.65]} rotation={[0, Math.PI, 0]}>
        <CustomModel
          name="kitchen"
          tweak={(o) => {
            const mm = o as THREE.Mesh
            if (mm.isMesh && o.name === 'CartelloGuasta') {
              brokenTex.flipY = false
              mm.material = new THREE.MeshStandardMaterial({ map: brokenTex, roughness: 0.8 })
            }
          }}
        />
      </Hit>
      {/* luce sottopensile: la cucinetta resta accesa anche di notte */}
      <Box p={[3.6, 1.95, 5.75]} s={[2.4, 0.05, 0.3]} m={m.metal} />
      <mesh position={[3.6, 1.92, 5.75]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[2.2, 0.12]} /><meshStandardMaterial color="#fff1d6" emissive="#ffe2b0" emissiveIntensity={1.2} /></mesh>
      <pointLight position={[3.4, 1.8, 5.4]} color="#ffd9a0" intensity={1.1} distance={4.5} decay={1.5} />
      {/* BACHECA: avvisi veri (e indizi) */}
      <Hit id="board" position={[0.6, 0, 5.97]} rotation={[0, Math.PI, 0]}>
        <CustomModel
          name="board"
          tweak={(o) => {
            const mm = o as THREE.Mesh
            if (mm.isMesh && o.name === 'Cork') {
              boardTex.flipY = false
              mm.material = new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.9 })
            }
          }}
        />
      </Hit>
      {/* STAMPANTE condivisa a fine fila */}
      <CustomModel name="copier" position={[2.4, 0, 1.5]} rotation={[0, -Math.PI / 2, 0]} />
      {/* LO SCATOLONE DI ADA, mai ritirato */}
      <Hit id="adaBox" position={[-4.0, 0, -9.4]} rotation={[0, 0.25, 0]}>
        <CustomModel
          name="adabox"
          tweak={(o) => {
            const mm = o as THREE.Mesh
            if (mm.isMesh && o.name === 'Etichetta') {
              boxTex.flipY = false
              mm.material = new THREE.MeshStandardMaterial({ map: boxTex, roughness: 0.8 })
            }
          }}
        />
      </Hit>

      {/* verde e servizi: piante agli angoli delle finestre e in testa alle file, cestini */}
      <Plant p={[-7.3, 0, 5.3]} s={1.4} m={m} />
      <Plant p={[-7.3, 0, -9.2]} s={1.3} m={m} />
      <Plant p={[5.9, 0, 5.5]} s={1.1} m={m} />
      <Model id="potted_plant_02" pick={['potted_plant_02_pot', 'potted_plant_02_leaves', 'potted_plant_02_dirt']} position={[1.55, 0, 1.5]} />
      <Model id="potted_plant_02" pick={['potted_plant_02_pot', 'potted_plant_02_leaves', 'potted_plant_02_dirt']} position={[1.55, 0, -2.9]} />
      <Model id="metal_trash_can" pick={['metal_trash_can', 'metal_trash_can_lid']} position={[-5.45, 0, 1.5]} scale={0.5} />
      <Model id="metal_trash_can" pick={['metal_trash_can', 'metal_trash_can_lid']} position={[-5.45, 0, -2.9]} scale={0.5} />

      <Model id="wall_clock" position={[7.97, 3.82, 3]} rotation={[0, -Math.PI / 2, 0]} scale={1.2} />
      <Model id="security_camera_01" position={[7.65, 3.95, 5.65]} rotation={[0, Math.PI * 1.25, 0]} scale={1.3} />
      <Model id="fire_alarm" position={[7.97, 1.5, 1.7]} rotation={[0, -Math.PI / 2, 0]} scale={1.5} />
      {/* luci d'emergenza sui muri */}
      {([[-7.9, 3.7, -6], [7.9, 3.7, -6], [7.9, 3.7, 5.5], [-7.9, 3.7, 5.5], [-2, 4.0, -9.9]] as V3[]).map((pp, i) => (
        <group key={i} position={pp}>
          <Box p={[0, 0, 0]} s={[0.35, 0.1, 0.14]} m={emergMat} />
          {i < 2 && <pointLight ref={(r) => r && (emerg.current[i] = r)} color="#E8823A" intensity={0} distance={16} />}
        </group>
      ))}
    </group>
  )
}

// Ambiente per i riflessi di metallo, cromo e vetro (generato in locale, nessun file).
// Intensità bassa: deve solo dare "materia" ai metalli, non illuminare la notte.
function EnvSetup() {
  const { gl, scene } = useThree()
  useEffect(() => {
    // l'ambiente stesso è tenue: ogni materiale (anche quelli creati dopo) ha subito la luminosità giusta,
    // senza correzioni successive che causavano lampi di luce
    const room = new RoomEnvironment()
    room.traverse((o) => {
      const mm = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial | undefined
      if (!mm) return
      if ('emissiveIntensity' in mm) mm.emissiveIntensity *= 0.18
      if (mm.color) mm.color.multiplyScalar(0.18)
    })
    const pm = new THREE.PMREMGenerator(gl)
    const env = pm.fromScene(room, 0.04).texture
    scene.environment = env
    return () => {
      scene.environment = null
      env.dispose()
      pm.dispose()
    }
  }, [gl, scene])
  return null
}

// Prepara tutto all'avvio (shader e texture), così in gioco nulla viene compilato "a sorpresa" causando scatti.
function Prewarm() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    const id = setTimeout(() => {
      scene.traverse((o) => {
        const mats = ([] as THREE.Material[]).concat(((o as THREE.Mesh).material as THREE.Material) ?? [])
        for (const m of mats) {
          for (const k of ['map', 'normalMap', 'roughnessMap', 'emissiveMap', 'metalnessMap', 'aoMap'] as const) {
            const t = (m as THREE.MeshStandardMaterial)[k]
            if (t) gl.initTexture(t)
          }
        }
      })
      gl.compile(scene, camera)
    }, 300)
    return () => clearTimeout(id)
  }, [gl, scene, camera])
  return null
}

// Indicatore dell'obiettivo: un rombo sull'oggetto da raggiungere, con la distanza.
const TARGET_POINT: Record<string, V3> = {
  computer: [0, 1.15, 1.85],
  door: [7.9, 1.4, 4.25],
  adaDesk: [-6.4, 1.1, -4.5],
  rack: [4.0, 1.6, -9.0],
  cabinet: [6.6, 1.2, -9.1],
}
function ObjectiveMarker({ mode }: { mode: WorldMode }) {
  const p = useGame((s) => s.progress)
  const show = useGame((s) => s.settings.markers !== false && !s.inspect && !s.cinematic && s.hovered === null)
  const { camera } = useThree()
  const [dist, setDist] = useState(0)
  const target = p ? targetFor(p.step, p.flags) : null
  const pt = target ? TARGET_POINT[target] : null
  useFrame(() => {
    if (!pt) return
    const d = Math.round(camera.position.distanceTo(new THREE.Vector3(...pt)))
    if (d !== dist) setDist(d)
  })
  if (mode !== 'play' || !pt || !show || dist < 2) return null
  return (
    <Html position={pt} center zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
      <div className="flex flex-col items-center gap-1 select-none">
        <div className="w-4 h-4 rotate-45 border-2 border-signal bg-signal/30" />
        <div className="font-display font-bold text-[13px] text-cream bg-ink/70 px-1.5 leading-tight">{dist} m</div>
      </div>
    </Html>
  )
}

// Luce guida: una luce calda che "respira" sopra l'oggetto da raggiungere. Sempre presente (niente ricompilazioni).
function GuideLight({ mode }: { mode: WorldMode }) {
  const ref = useRef<THREE.PointLight>(null)
  const p = useGame((s) => s.progress)
  const target = p && mode !== 'title' ? targetFor(p.step, p.flags) : null
  const pt = target && target !== 'computer' ? TARGET_POINT[target] : null
  useFrame(({ clock }) => {
    const l = ref.current
    if (!l) return
    if (!pt || useGame.getState().inspect) {
      l.intensity = 0
      return
    }
    l.position.set(pt[0], pt[1] + 0.9, pt[2] + 0.4)
    l.intensity = 1.6 + Math.sin(clock.elapsedTime * 2.2) * 0.6
  })
  return <pointLight ref={ref} color="#ffcf8f" distance={3.2} decay={1.6} intensity={0} />
}

// Le ombre di una scena statica non vanno ricalcolate a ogni fotogramma.
function ShadowControl() {
  const { gl } = useThree()
  const n = useRef(0)
  const lockdown = useGame((s) => !!s.progress?.flags.lockdown)
  const flags = useGame((s) => s.progress?.flags)
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    n.current = 0
  }, [gl, lockdown, flags])
  useFrame(() => {
    // regolare e prevedibile: la scena è quasi statica, 5 aggiornamenti al secondo bastano
    if (n.current < 30 || n.current % 12 === 0 || useGame.getState().cinematic) gl.shadowMap.needsUpdate = true
    n.current++
  })
  return null
}

function Scene({ mode }: { mode: WorldMode }) {
  const lockdown = useGame((s) => !!s.progress?.flags.lockdown) && mode !== 'title'
  const level = useGame((s) => (s.progress ? unlockLevel(s.progress.step) : 0))
  const moon = !lockdown ? 1.15 : level >= 3 ? 0.7 : level >= 2 ? 0.4 : 0
  return (
    <>
      <color attach="background" args={['#0a0e15']} />
      <fog attach="fog" args={['#0a0e15', 9, 26]} />
      <ambientLight color="#3a4a66" intensity={lockdown ? 0.4 : 0.5} />
      <hemisphereLight args={['#6f7f99', '#2a241e', 0.5]} />
      {/* luci di cortesia notturne dal controsoffitto: sempre presenti, cambiano solo intensità */}
      <pointLight position={[-2, 4.0, -0.6]} color="#ffe9c8" intensity={lockdown ? 0.15 : 0.9} distance={9} decay={1.6} />
      <pointLight position={[4.5, 4.0, 1.8]} color="#ffe9c8" intensity={lockdown ? 0.1 : 0.6} distance={8} decay={1.6} />
      {/* la luce resta sempre nella scena (aggiungere/togliere luci ricompila tutti i materiali = scatto) */}
      <directionalLight position={[-16, 7, -1]} color="#a9bfe8" intensity={moon} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.03} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} />
      <Building mode={mode} />
      <Player mode={mode} />
      <ObjectiveMarker mode={mode} />
      <GuideLight mode={mode} />
      <ShadowControl />
      <EnvSetup />
      <Prewarm />
    </>
  )
}

export default function World({ mode }: { mode: WorldMode }) {
  const [fontsReady, setFontsReady] = useState(false)
  const [locked, setLocked] = useState(false)
  const note = useGame((s) => s.note)
  // solo sviluppo: P mostra il contatore dei fotogrammi
  const [stats, setStats] = useState(false)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input, textarea')) return
      if (e.code === 'KeyP') setStats((v) => !v)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  useEffect(() => {
    // le texture disegnate su canvas usano questi font: vanno caricati prima
    const fonts = ['700 52px Caveat', '900 64px "Big Shoulders Display"', '700 64px "Big Shoulders Display"', '500 28px "JetBrains Mono"']
    Promise.all(fonts.map((f) => document.fonts.load(f))).finally(() => setFontsReady(true))
    const f = () => setLocked(!!document.pointerLockElement)
    document.addEventListener('pointerlockchange', f)
    return () => document.removeEventListener('pointerlockchange', f)
  }, [])

  return (
    <div className="absolute inset-0">
      {fontsReady && (
        <Canvas shadows dpr={1} camera={{ fov: 70, near: 0.1, far: 60, position: TITLE_POS.toArray() }} gl={{ antialias: true }} onCreated={({ gl }) => (gl.toneMapping = THREE.ACESFilmicToneMapping)}>
          <Suspense fallback={null}>
            <Scene mode={mode} />
          </Suspense>
          {stats && <Stats />}
        </Canvas>
      )}
      {mode === 'play' && !locked && !note && (
        <button className="absolute inset-0 z-[5] flex items-center justify-center bg-ink/40 font-mono text-cream" onClick={lockPointer}>
          <span className="border border-cream/30 bg-ink/85 px-5 py-3 text-[15px]">Clicca per guardarti intorno</span>
        </button>
      )}
    </div>
  )
}
