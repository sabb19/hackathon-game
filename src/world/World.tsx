import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, RoundedBox, Stats } from '@react-three/drei'
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { useGame } from '../store/game'
import { inspectAction, interact, type InteractId } from './interact'
import { carpetTexture, ceilingTexture, cityTexture, noticeBoardTexture, plasterTexture, textTexture, woodTexture } from './textures'
import { stepIndex, targetFor, unlockLevel } from '../content/steps'
import { lockPointer } from './pointer'
import { sfx } from '../audio'
import { CrtModel, CustomModel, Model, Mug, usePBR } from './assets'
import * as L from './layout'
import { Door, Walls, currentColliders } from './Level'

export type WorldMode = 'title' | 'play' | 'idle'
type V3 = [number, number, number]

// ---------- pianta: tutte le coordinate vengono da layout.ts ----------
const BOUNDS = { minX: -13.7, maxX: 13.7, minZ: -11.7, maxZ: 10.7 }
const START = new THREE.Vector3(...L.START)
const ARRIVE = new THREE.Vector3(...L.ARRIVE)
const TITLE_POS = new THREE.Vector3(...L.TITLE_POS)
const TITLE_LOOK = new THREE.Vector3(...L.TITLE_LOOK)

function useMats() {
  const wall = usePBR('precast_concrete_wall', 1.4, 0.7, { normalScale: new THREE.Vector2(0.5, 0.5) })
  const wallDark = usePBR('precast_concrete_wall', 1, 0.5, { color: '#8d9095', normalScale: new THREE.Vector2(0.5, 0.5) })
  const floor = usePBR('smooth_concrete_floor', 10, 8, { roughness: 0.55, color: '#9aa2ab' })
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
      if (!mesh.isMesh || !mat || !('emissive' in mat) || mat.emissiveMap) return
      // materiale proprio: non illuminare tutte le copie (e se React ha rimesso quello condiviso, riclonarlo)
      if (mesh.material !== mesh.userData.ownMat) {
        if (!mesh.userData.ownMat && mat.emissive.getHex() !== 0) return // LED e schermi: già luminosi, non si toccano
        const c = mat.clone()
        c.emissive.set('#000000')
        mesh.material = c
        mesh.userData.ownMat = c
      }
      const m2 = mesh.material as THREE.MeshStandardMaterial
      // evidenziazione discreta: deve dire "si può usare", non colorare l'oggetto
      m2.emissive.set(active ? '#E8823A' : '#000000')
      m2.emissiveIntensity = active ? 0.06 : 1
    })
  }, [active])
  return (
    <group ref={ref} position={position} rotation={rotation} userData={{ interact: id }}>
      {children}
    </group>
  )
}

// Scatola con spigoli smussati (niente spigoli vivi "da low poly"); sotto i 2 cm resta un box semplice.
const Box = ({ p, s, m, r, cast }: { p: V3; s: V3; m: THREE.Material; r?: V3; cast?: boolean }) => {
  const min = Math.min(...s)
  if (min < 0.02)
    return (
      <mesh position={p} rotation={r} material={m} castShadow={cast} receiveShadow>
        <boxGeometry args={s} />
      </mesh>
    )
  return <RoundedBox args={s} radius={Math.min(0.012, min / 3)} smoothness={2} position={p} rotation={r} material={m} castShadow={cast} receiveShadow />
}

function Label({ lines, p, r, w, h, opts }: { lines: string[]; p: V3; r?: V3; w: number; h: number; opts?: Parameters<typeof textTexture>[1] }) {
  const tex = useMemo(() => textTexture(lines, opts), [lines.join('|'), JSON.stringify(opts)])
  return (
    <mesh position={p} rotation={r}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} transparent />
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

// Controsoffitto a pannelli 60 cm su tutto il piano; plafoniere 120×60 lontane dai muri, una su tre accesa.
const CEIL_X = [-12.5, -9.5, -6.5, -3, 0.5, 3.5, 6.5, 9.5, 12.5]
const CEIL_Z = [-10.5, -8, -5.5, -2.5, 0.5, 3.5, 6.5, 9.5]
function Ceiling() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: ceilingTexture(28 / 0.6, 23 / 0.6), roughness: 0.95, emissive: '#2a2f38', emissiveIntensity: 1 }), [])
  const on = useRef<THREE.InstancedMesh>(null)
  const off = useRef<THREE.InstancedMesh>(null)
  const cells = useMemo(() => {
    const a: { x: number; z: number; on: boolean }[] = []
    let k = 0
    for (const x of CEIL_X) for (const z of CEIL_Z) a.push({ x, z, on: k++ % 3 === 0 })
    return a
  }, [])
  const nOn = cells.filter((c) => c.on).length
  useEffect(() => {
    const o = new THREE.Object3D()
    let i = 0
    let j = 0
    for (const c of cells) {
      o.position.set(c.x, L.CEILING - 0.01, c.z)
      o.rotation.set(Math.PI / 2, 0, 0)
      o.updateMatrix()
      if (c.on) on.current?.setMatrixAt(i++, o.matrix)
      else off.current?.setMatrixAt(j++, o.matrix)
    }
    if (on.current) on.current.instanceMatrix.needsUpdate = true
    if (off.current) off.current.instanceMatrix.needsUpdate = true
  }, [cells])
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, L.CEILING, -0.5]} material={mat}><planeGeometry args={[28, 23]} /></mesh>
      <instancedMesh ref={on} args={[undefined, undefined, nOn]} frustumCulled={false}>
        <planeGeometry args={[1.2, 0.6]} />
        <meshStandardMaterial color="#ffffff" emissive="#fff3dc" emissiveIntensity={1.6} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={off} args={[undefined, undefined, cells.length - nOn]} frustumCulled={false}>
        <planeGeometry args={[1.2, 0.6]} />
        <meshStandardMaterial color="#8d9094" emissive="#1c2027" />
      </instancedMesh>
    </group>
  )
}

// Veneziane a metà finestra: la luna passa tra le lamelle e disegna righe sul pavimento.
function Blinds({ x, z, rotY }: { x: number; z: number; rotY: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const N = 20
  useEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new THREE.Object3D()
    for (let i = 0; i < N; i++) {
      o.position.set(0, 2.8 - i * 0.055, 0)
      o.rotation.set(0, 0, 0.55)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }, [])
  const south = rotY === 0
  const rail = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b8b5ad' }), [])
  return (
    <group position={south ? [x, 0, z - 0.24] : [x + 0.24, 0, z]} rotation={[0, south ? Math.PI / 2 : 0, 0]}>
      <instancedMesh ref={ref} args={[undefined, undefined, N]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.05, 0.004, 2.22]} />
        <meshStandardMaterial color="#c9c6bd" roughness={0.6} />
      </instancedMesh>
      <Box p={[0, 2.85, 0]} s={[0.07, 0.05, 2.26]} m={rail} />
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
      // nuova partita: si parte dall'ascensore; partita salvata: dalla tua scrivania
      camera.position.copy(useGame.getState().progress?.step === 'm0_arrive' ? ARRIVE : START)
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
    ;(window as unknown as Record<string, unknown>).__titleCam = (pos: V3, look: V3) => {
      TITLE_POS.set(...pos)
      TITLE_LOOK.set(...look)
    }
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
      if (!document.pointerLockElement && g.screen === 'game' && g.view === 'world' && !g.paused && !g.phoneOpen && !g.notebookOpen && !g.call && !g.timeSkip && !g.minigame) {
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
      const targetYaw = L.LOCK_YAW + Math.round((yaw.current - L.LOCK_YAW) / (Math.PI * 2)) * Math.PI * 2
      const k2 = Math.min(1, dt * (t < 4.2 ? 1.6 : 0))
      yaw.current += (targetYaw - yaw.current) * k2
      pitch.current += (0.12 - pitch.current) * k2
      camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'))
      fx.shake *= Math.pow(0.02, dt)
      camera.position.y = 1.6 + (Math.random() - 0.5) * fx.shake
      camera.position.x += (Math.random() - 0.5) * fx.shake * 0.3
      g.setHovered(null)
      if (t > 5.4) {
        g.setCinematic(null)
        g.goto('m0_login')
        // Teo ha visto l'allarme: videochiamata
        setTimeout(() => useGame.getState().setCall({ id: 'lockdown', ringing: true }), 900)
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
      const cols = currentColliders()
      const blocked = (x: number, z: number) => cols.some(([a, b, c, d]) => x > a - 0.28 && x < b + 0.28 && z > c - 0.28 && z < d + 0.28)
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
// Scrivania da open space (modello Blender desk2): piano in rovere, telaio antracite, cassettiera su ruote.
function DeskModel({ drawerOpen = false }: { drawerOpen?: boolean }) {
  return (
    <CustomModel
      name="desk2"
      deps={[drawerOpen]}
      tweak={(o) => {
        if (o.name === 'Cassetto') o.position.z = drawerOpen ? 0.28 : 0
        const mm = o as THREE.Mesh
        const mat = mm.material as THREE.MeshStandardMaterial | undefined
        if (mm.isMesh && mat?.name === 'Laminato rovere' && !mat.map) {
          mat.map = woodTexture()
          mat.color.set('#ffffff')
          mat.needsUpdate = true
        }
      }}
    />
  )
}
const PENCILCUP = ['stationery_supplies_pencilcup']
const PLANT = ['potted_plant_02_pot', 'potted_plant_02_leaves', 'potted_plant_02_dirt']
type Persona = 'tidy' | 'messy' | 'empty' | 'plant' | 'boss' | 'none'
function Desk({ p, ry = 0, monitor = true, partition = true, persona = 'tidy', drawerOpen = false, saver = false, children }: { p: V3; m?: Mats; ry?: number; monitor?: boolean; partition?: boolean; persona?: Persona; drawerOpen?: boolean; saver?: boolean; children?: ReactNode }) {
  const chairTurn = { tidy: 0, messy: 0.5, empty: 0, plant: -0.2, boss: 0.15, none: 0 }[persona]
  const chairZ = persona === 'empty' || persona === 'tidy' ? 0.62 : 0.85
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <DeskModel drawerOpen={drawerOpen} />
      {partition && <CustomModel name="screen2" />}
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
    <group position={[L.PLAYER_DESK.x, 0, L.PLAYER_DESK.z]}>
      <DeskModel />
      <CustomModel name="screen2" />
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
      <group position={[0.86, 0.79, -0.3]}>
        <Model id="desk_lamp_arm_01" rotation={[0, -0.6, 0]} />
        <spotLight position={[-0.1, 0.62, 0.2]} angle={0.95} penumbra={0.7} intensity={7} distance={4} color="#ffb867" castShadow shadow-mapSize={[512, 512]} shadow-bias={-0.0006} shadow-normalBias={0.02} />
      </group>
      {/* telefono fisso a tasti (muto), tazza, carte */}
      {mode !== 'title' && <CustomModel name="phone" position={[0.78, 0.79, 0.05]} rotation={[0, -0.35, 0]} />}
      {mode !== 'title' && (
        <>
          <Mug position={[0.86, 0.79, 0.36]} />
          <Model id="office_notepads" pick={['office_notepads_yellow_pad']} position={[-0.58, 0.79, 0.24]} rotation={[0, 0.2, 0]} />
          <Model id="stationery_supplies" pick={PENCILCUP} position={[-0.78, 0.79, -0.28]} />
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
    <group position={[L.PLAYER_DESK.x, 0, L.PLAYER_DESK.z]}>
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
    <group position={[L.ADA_DESK.x, 0, L.ADA_DESK.z]} rotation={[0, -Math.PI / 2, 0]}>
      <Hit id="adaDesk">
        <Desk p={[0, 0, 0]} m={m} monitor={false} partition={false} persona="none" drawerOpen={open} />
      </Hit>
      {/* il taccuino nel cassetto */}
      {open && !taken && (
        <group position={[-0.62, 0.548, 0.27]} rotation={[0, 0.15, 0]}>
          <mesh castShadow><boxGeometry args={[0.17, 0.022, 0.23]} /><meshStandardMaterial color="#2B4A6B" roughness={0.8} /></mesh>
          <mesh position={[0, 0.0115, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.15, 0.2]} /><meshStandardMaterial map={nb} /></mesh>
        </group>
      )}
      <CustomModel name="deadplant" position={[0.72, 0.79, -0.22]} />
      <Model id="binder_notebook" pick={['binder_notebook_closed']} position={[-0.62, 0.79, 0.2]} rotation={[0, -0.15, 0]} />
      <group position={[0.25, 0.79, -0.3]}>
        <Model id="standing_picture_frame_01" rotation={[0, -Math.PI / 2, 0]} scale={1.2} />
      </group>
      {/* lucchetto a codice sul cassetto: LED rosso chiuso, verde aperto */}
      <group position={[-0.62, 0.548, open ? 0.585 : 0.305]}>
        <mesh><boxGeometry args={[0.06, 0.07, 0.02]} /><meshStandardMaterial color="#2a2e33" roughness={0.4} metalness={0.5} /></mesh>
        <mesh position={[0.022, 0.032, 0.011]}><planeGeometry args={[0.012, 0.012]} /><meshStandardMaterial color={open ? '#6FBF8E' : '#D9644A'} emissive={open ? '#6FBF8E' : '#D9644A'} emissiveIntensity={2.5} /></mesh>
        <mesh position={[0, -0.01, 0.011]}><planeGeometry args={[0.05, 0.05]} /><meshStandardMaterial color="#c9c4b6" /></mesh>
      </group>
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

// LED dei rack "di contorno": una texture condivisa al posto di decine di mesh per rack.
function rackLedTexture() {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 512
  const g = c.getContext('2d')!
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 8; col++) {
      const r = Math.sin(row * 12.9 + col * 78.2) * 43758.5
      const v = r - Math.floor(r)
      g.fillStyle = v > 0.93 ? '#E8823A' : v > 0.35 ? '#6FBF8E' : '#1d3326'
      g.fillRect(6 + col * 15, 512 - (16 + row * 84), 9, 5)
    }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// Sala server: due file di rack contrapposte (corridoio caldo in mezzo), pavimento flottante, condizionatore.
const RACK_XS = Array.from({ length: 10 }, (_, i) => 0.9 + i * 0.7)
const RACK_B_INDEX = 3 // x = 3.0 = L.RACK_B.x
function ServerRoom({ m }: { m: Mats }) {
  const step = useGame((s) => s.progress?.step ?? 'm0_coffee')
  const flags = useGame((s) => s.progress?.flags ?? {})
  const si = stepIndex(step)
  const plugged = si >= stepIndex('m1_verify')
  const sandbox = si >= stepIndex('m2_monitor')
  const open = !!flags.cabinetOpen || !!flags.foundSandbox
  const sbLabel = useMemo(() => textTexture(['SANDBOX-7', 'ESERCITAZIONE', '— A.F.'], { w: 256, h: 128, bg: '#efe6c8', color: '#222', font: '500 26px "JetBrains Mono"', pad: 10 }), [])
  const ledMat = useMemo(() => {
    const t = rackLedTexture()
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 1.3, transparent: true })
  }, [])
  const tiles = useMemo(() => new THREE.MeshStandardMaterial({ map: ceilingTexture(15 / 0.6, 8 / 0.6), color: '#a3aab2', roughness: 0.6 }), [])
  const crac = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9c8c1', roughness: 0.6 }), [])
  const cable = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        ([[3.125, 1.236, -10.18], [3.15, 0.9, -10.0], [3.0, 0.03, -9.85], [0.2, 0.03, -9.85], [-0.9, 0.03, -9.85], [-1.2, 0.03, -9.9], [-2.6, 0.03, -10.6], [-2.8, 0.25, -11.0]] as V3[]).map((v) => new THREE.Vector3(...v)),
      ),
    [],
  )
  return (
    <group>
      {/* pavimento flottante a piastrelle da 60 cm */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6.5, 0.006, -8]} material={tiles} receiveShadow><planeGeometry args={[15, 8]} /></mesh>
      {RACK_XS.map((x, i) =>
        [0, 1].map((row) => {
          const z = row === 0 ? L.RACK_B.z : -6.4
          if (row === 0 && i === RACK_B_INDEX)
            return (
              <group key={`${i}${row}`} position={[x, 0, z]}>
                <Hit id="rack">
                  <CustomModel name="rack" />
                  <RackLeds plugged={plugged} sandbox={sandbox} />
                  {!plugged && <mesh position={[-0.04, 1.0, 0.48]} rotation={[0.3, 0, 0.2]}><cylinderGeometry args={[0.009, 0.009, 0.55, 6]} /><meshStandardMaterial color="#3d7bd0" /></mesh>}
                  <Label lines={['RACK B']} p={[0, 2.25, 0.41]} w={0.6} h={0.15} opts={{ w: 256, h: 64, color: '#E8DFC9', font: '600 44px Big Shoulders Display' }} />
                </Hit>
              </group>
            )
          return (
            <group key={`${i}${row}`} position={[x, 0, z]} rotation={[0, row ? Math.PI : 0, 0]}>
              <CustomModel name="rack" />
              <mesh position={[0, 1.22, 0.406]} material={ledMat}><planeGeometry args={[0.4, 1.45]} /></mesh>
            </group>
          )
        }),
      )}
      <Label lines={['FILA A']} p={[4.05, 2.3, -6.0]} w={0.9} h={0.2} opts={{ w: 256, h: 64, color: '#E8DFC9', font: '600 44px Big Shoulders Display', align: 'center' }} />
      {/* condizionatore di precisione sul muro est */}
      <group position={[13.5, 0, -8]} rotation={[0, -Math.PI / 2, 0]}>
        <Box p={[0, 1.05, 0]} s={[1.9, 2.1, 0.85]} m={crac} cast />
        {[-0.5, 0, 0.5].map((x) => <Box key={x} p={[x, 1.55, 0.43]} s={[0.42, 0.8, 0.01]} m={m.metal} />)}
        <mesh position={[0.6, 0.6, 0.431]}><planeGeometry args={[0.18, 0.1]} /><meshStandardMaterial color="#9fd0ff" emissive="#7fb0e6" emissiveIntensity={1.5} /></mesh>
      </group>
      {/* LOCALE TECNICO: l'armadio di SANDBOX-7 e vecchie cassettiere */}
      <Hit id="cabinet" position={[L.CABINET.x, 0, L.CABINET.z]}>
        <CustomModel name="cabinet" deps={[open]} tweak={(o) => { if (o.name === 'Anta') o.rotation.y = open ? -1.6 : 0 }} />
        {open && <mesh position={[0, 0.735, 0.252]}><planeGeometry args={[0.2, 0.05]} /><meshStandardMaterial map={sbLabel} /></mesh>}
        <pointLight position={[0, 0.9, 0.5]} color="#E8823A" intensity={open ? 1 : 0} distance={1.8} />
      </Hit>
      {[-7.05, -7.95].map((z) => <FilingCabinet key={z} p={[-4.7, 0, z]} ry={Math.PI / 2} />)}
      {/* il cavo grigio, più vecchio degli altri: dalla porta 7 del Rack B, sotto il muro, fino all'armadio */}
      <mesh>
        <tubeGeometry args={[cable, 96, 0.008, 6, false]} />
        <meshStandardMaterial color="#9c9a8f" roughness={0.7} />
      </mesh>
      <ServerRoomLight broken={!plugged && si >= stepIndex('m1_lab')} />
      {[-10.6, -6.4].map((z) => (
        <mesh key={z} position={[4.05, L.CEILING - 0.02, z + (z < -8 ? 1.0 : -1.0)]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[6.5, 0.2]} /><meshStandardMaterial color="#a8c8ee" emissive="#a8c8ee" emissiveIntensity={2} /></mesh>
      ))}
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
      l.intensity = 1.8 + Math.sin(clock.elapsedTime * 3) * 0.9
    } else {
      l.color.set('#7fb0e6')
      l.intensity = 3.4
    }
  })
  return <pointLight ref={ref} position={[5, 2.9, -8.5]} distance={12} />
}

// Serrande su tutte le finestre: scendono una dopo l'altra, dalla più vicina alla porta delle scale.
const STAIRS = L.DOORS.find((d) => d.id === 'stairs')!.pos
const SHUT_RANK: number[] = (() => {
  const order = L.WINDOWS.map((w, i) => ({ i, d: Math.hypot(w.x - STAIRS[0], w.z - STAIRS[2]) })).sort((a, b) => a.d - b.d)
  const r: number[] = []
  order.forEach((o, k) => (r[o.i] = k))
  return r
})()
function Shutters({ lockdown, level }: { lockdown: boolean; level: number }) {
  const telo = useRef<(THREE.Object3D | null)[]>([])
  const landed = useRef<boolean[]>([])
  const started = useRef<boolean[]>([])
  const OPEN = 3.2 // di quanto il telo sale dentro il cassonetto (unità del modello)
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
        if (target > r.position.y + 0.02 && !started.current[20 + i]) {
          started.current[20 + i] = true
          if (SHUT_RANK[i] < 3) sfx.rattle(SHUT_RANK[i] * 0.2, 1.4)
        }
        r.position.y += (target - r.position.y) * 0.02
        return
      }
      const t = (performance.now() - cin) / 1000 - (0.7 + SHUT_RANK[i] * 0.45)
      if (t < 0) return
      if (!started.current[i]) {
        started.current[i] = true
        if (SHUT_RANK[i] < 4) sfx.rattle(0, 0.5)
      }
      const y = Math.max(0, OPEN - 0.5 * 16 * t * t)
      r.position.y = y
      if (y <= 0 && !landed.current[i]) {
        landed.current[i] = true
        if (SHUT_RANK[i] < 4) sfx.slam()
        fx.shake = Math.max(fx.shake, 0.07 / (1 + SHUT_RANK[i] * 0.4))
      }
    })
  })
  return (
    <>
      {L.WINDOWS.map((w, i) => {
        const south = w.rotY === 0
        return (
          <CustomModel
            key={i}
            name="shutter"
            position={south ? [w.x, L.WINDOW_SILL, w.z - 0.12] : [w.x + 0.12, L.WINDOW_SILL, w.z]}
            rotation={[0, south ? Math.PI : Math.PI / 2, 0]}
            scale={[1, 0.7, 1]}
            tweak={(o) => {
              if (o.name === 'Telo') {
                telo.current[i] = o
                o.position.y = OPEN
              }
            }}
          />
        )
      })}
    </>
  )
}

const POTTED = ['potted_plant_02_pot', 'potted_plant_02_leaves', 'potted_plant_02_dirt']

// La foto di Pixel, il gatto di Ada (con la data scritta a mano: l'indizio del codice)
function adaCatPhoto() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 416
  const g = c.getContext('2d')!
  g.fillStyle = '#f4efe3'
  g.fillRect(0, 0, 512, 416)
  // la foto: un gatto sul davanzale, controluce
  const gr = g.createLinearGradient(0, 24, 0, 320)
  gr.addColorStop(0, '#e9b779')
  gr.addColorStop(1, '#a8654a')
  g.fillStyle = gr
  g.fillRect(24, 24, 464, 296)
  g.fillStyle = '#5a3a2e'
  g.fillRect(24, 260, 464, 60)
  g.fillStyle = '#2b2220'
  g.beginPath()
  g.ellipse(250, 225, 78, 48, 0, 0, Math.PI * 2) // corpo
  g.fill()
  g.beginPath()
  g.ellipse(318, 168, 42, 38, 0, 0, Math.PI * 2) // testa
  g.fill()
  g.beginPath()
  g.moveTo(290, 140); g.lineTo(298, 104); g.lineTo(316, 134); g.closePath()
  g.moveTo(330, 132); g.lineTo(346, 100); g.lineTo(354, 140); g.closePath()
  g.fill()
  g.lineWidth = 14
  g.strokeStyle = '#2b2220'
  g.beginPath()
  g.moveTo(176, 238); g.quadraticCurveTo(120, 230, 132, 180)
  g.stroke()
  // didascalia a mano
  g.fillStyle = '#1d3a63'
  g.font = '700 46px Caveat'
  g.fillText('Pixel — nato il 4 dicembre', 40, 384)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
// Calendario fermo a maggio: l'ultimo mese di Ada in ufficio
function adaCalendar() {
  const c = document.createElement('canvas')
  c.width = 420
  c.height = 600
  const g = c.getContext('2d')!
  g.fillStyle = '#f4efe3'
  g.fillRect(0, 0, 420, 600)
  g.fillStyle = '#2B4A6B'
  g.fillRect(0, 0, 420, 120)
  g.fillStyle = '#f4efe3'
  g.font = '900 64px "Big Shoulders Display"'
  g.fillText('MAGGIO', 30, 88)
  g.font = '500 22px "JetBrains Mono"'
  g.fillStyle = '#1a1b1d'
  const days = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
  days.forEach((d, i) => g.fillText(d, 34 + i * 54, 160))
  // maggio con l'1 di giovedì
  for (let d = 1; d <= 31; d++) {
    const idx = d + 2
    const col = idx % 7
    const row = Math.floor(idx / 7)
    g.fillText(String(d), 30 + col * 54, 210 + row * 62)
  }
  // ultimo giorno cerchiato
  g.strokeStyle = '#b4442e'
  g.lineWidth = 4
  g.beginPath()
  g.arc(30 + 5 * 54 + 12, 210 + 4 * 62 - 8, 26, 0, Math.PI * 2)
  g.stroke()
  g.fillStyle = '#b4442e'
  g.font = '700 34px Caveat'
  g.fillText('ultimo giorno!', 150, 560)
  g.fillStyle = '#1d3a63'
  g.font = '700 30px Caveat'
  g.fillText('ricordarsi: crocchette Pixel', 24, 512)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// Armadio metallico a 4 cassetti (archivio, uffici). open = un cassetto lasciato aperto.
const FC_BODY = new THREE.MeshStandardMaterial({ color: '#8f959b', roughness: 0.45, metalness: 0.55 })
const FC_DRAWER = new THREE.MeshStandardMaterial({ color: '#a3a9af', roughness: 0.4, metalness: 0.5 })
const FC_HANDLE = new THREE.MeshStandardMaterial({ color: '#2a2e33', roughness: 0.3, metalness: 0.8 })
const FC_LABEL = new THREE.MeshStandardMaterial({ color: '#efe6c8', roughness: 0.9 })
function FilingCabinet({ p, ry = 0, open = false }: { p: V3; ry?: number; open?: boolean }) {
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <mesh position={[0, 0.66, 0]} material={FC_BODY} castShadow receiveShadow><boxGeometry args={[0.46, 1.32, 0.6]} /></mesh>
      {[0, 1, 2, 3].map((i) => {
        const out = open && i === 1 ? 0.32 : 0
        return (
          <group key={i} position={[0, 0.2 + i * 0.31, 0.3 + out]}>
            <mesh material={FC_DRAWER}><boxGeometry args={[0.42, 0.28, 0.02]} /></mesh>
            {out > 0 && <mesh position={[0, -0.02, -0.16]} material={FC_BODY}><boxGeometry args={[0.4, 0.22, 0.3]} /></mesh>}
            <mesh position={[0, 0.04, 0.015]} material={FC_HANDLE}><boxGeometry args={[0.16, 0.025, 0.02]} /></mesh>
            <mesh position={[0, 0.095, 0.011]} material={FC_LABEL}><planeGeometry args={[0.09, 0.04]} /></mesh>
          </group>
        )
      })}
    </group>
  )
}

// Scaffale metallico con faldoni colorati
const SHELF_MAT = new THREE.MeshStandardMaterial({ color: '#6f757c', roughness: 0.5, metalness: 0.6 })
const BINDER_COLORS = ['#2B4A6B', '#7a4a3a', '#3c5a46', '#c9b07a', '#4b5157', '#2B4A6B', '#8a3a2a']
function Shelf({ p, ry = 0 }: { p: V3; ry?: number }) {
  const binders = useMemo(() => {
    const out: { x: number; y: number; c: string; h: number }[] = []
    for (let row = 0; row < 4; row++) {
      let x = -0.85
      let k = row * 3
      while (x < 0.8) {
        const w = 0.07
        if ((k * 7 + row) % 9 !== 0) out.push({ x: x + w / 2, y: 0.12 + row * 0.5, c: BINDER_COLORS[(k * 3 + row) % BINDER_COLORS.length], h: 0.3 + ((k * 5) % 3) * 0.02 })
        x += w + 0.008
        k++
      }
    }
    return out
  }, [])
  const mats = useMemo(() => Object.fromEntries(BINDER_COLORS.map((c) => [c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })])), [])
  return (
    <group position={p} rotation={[0, ry, 0]}>
      {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[0, 0.1 + i * 0.5, 0]} material={SHELF_MAT} castShadow><boxGeometry args={[1.8, 0.025, 0.4]} /></mesh>)}
      {[-0.9, 0.9].map((x) => <mesh key={x} position={[x, 1.1, 0]} material={SHELF_MAT}><boxGeometry args={[0.03, 2.2, 0.4]} /></mesh>)}
      {binders.map((b, i) => (
        <mesh key={i} position={[b.x, b.y + b.h / 2, 0.02]} material={mats[b.c]}><boxGeometry args={[0.065, b.h, 0.28]} /></mesh>
      ))}
    </group>
  )
}

// Parete della sorveglianza nell'open space: le reti dei clienti, sempre sotto gli occhi del tecnico di turno.
const NOC_SITES = ['VALLE VERDE', 'FERRARIS', 'RODARI', 'GALVANI', 'FARMACIA C.', 'POLIAMB. EST']
function nocTexture(name: string, lockdown: boolean) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 288
  const g = c.getContext('2d')!
  g.fillStyle = lockdown ? '#2a1408' : '#0f1a26'
  g.fillRect(0, 0, 512, 288)
  g.fillStyle = lockdown ? '#E8823A' : '#9fc0d8'
  g.font = '800 40px "Big Shoulders Display"'
  g.fillText(lockdown ? 'COLLEGAMENTO PERSO' : name, 28, 58)
  // piccolo grafico del traffico
  g.strokeStyle = lockdown ? '#6b3a1a' : '#6FBF8E'
  g.lineWidth = 4
  g.beginPath()
  for (let i = 0; i <= 20; i++) {
    const y = 200 - (lockdown ? 0 : Math.abs(Math.sin(i * 0.9 + name.length) * 70 + ((i * 37) % 23)))
    i ? g.lineTo(28 + i * 22, y) : g.moveTo(28, y)
  }
  g.stroke()
  g.fillStyle = lockdown ? '#E8823A' : '#6FBF8E'
  g.beginPath()
  g.arc(470, 46, 14, 0, Math.PI * 2)
  g.fill()
  g.font = '500 24px "JetBrains Mono"'
  g.fillText(lockdown ? 'B2 isolato' : 'tutto ok', 28, 260)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
function NocWall({ lockdown }: { lockdown: boolean }) {
  const texs = useMemo(() => NOC_SITES.map((n) => nocTexture(n, lockdown)), [lockdown])
  const title = useMemo(() => textTexture(['SORVEGLIANZA RETI CLIENTI'], { w: 1024, h: 96, color: '#d8d2c4', font: '800 64px "Big Shoulders Display"', align: 'center' }), [])
  const frame = useMemo(() => new THREE.MeshStandardMaterial({ color: '#15181c', roughness: 0.5 }), [])
  return (
    <group position={[5, 0, 7.915]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 2.88, 0.01]}><planeGeometry args={[3.6, 0.34]} /><meshStandardMaterial map={title} transparent /></mesh>
      {texs.map((t, i) => {
        const col = i % 3
        const row = Math.floor(i / 3)
        return (
          <group key={i} position={[(col - 1) * 1.16, 2.33 - row * 0.67, 0.03]}>
            <mesh material={frame}><boxGeometry args={[1.12, 0.65, 0.05]} /></mesh>
            <mesh position={[0, 0, 0.027]}><planeGeometry args={[1.06, 0.596]} /><meshStandardMaterial map={t} emissiveMap={t} emissive="#ffffff" emissiveIntensity={0.85} /></mesh>
          </group>
        )
      })}
      <mesh position={[0, 0.45, 0.25]} castShadow><boxGeometry args={[3.4, 0.9, 0.5]} /><meshStandardMaterial color="#3a3f46" roughness={0.6} /></mesh>
    </group>
  )
}

// Telecamera di sicurezza: ruota lentamente per seguirti, il LED rosso dice che Teo ti sta guardando.
function TeoCam({ p }: { p: V3 }) {
  const ref = useRef<THREE.Group>(null)
  const led = useRef<THREE.MeshStandardMaterial>(null)
  const { camera } = useThree()
  useEffect(() => {
    if (ref.current) ref.current.rotation.order = 'YXZ'
  }, [])
  useFrame(({ clock }, dt) => {
    const g = ref.current
    if (!g) return
    const dx = camera.position.x - p[0]
    const dz = camera.position.z - p[2]
    const dy = camera.position.y - p[1]
    const near = Math.hypot(dx, dz) < 14
    if (near) {
      const yaw = Math.atan2(dx, dz)
      let d = yaw - g.rotation.y
      d = Math.atan2(Math.sin(d), Math.cos(d))
      const k = Math.min(1, dt * 1.5)
      g.rotation.y += d * k
      g.rotation.x += (Math.atan2(-dy, Math.hypot(dx, dz)) - g.rotation.x) * k
    }
    if (led.current) led.current.emissiveIntensity = near && Math.sin(clock.elapsedTime * 2.5) > -0.2 ? 3 : 0.3
  })
  return (
    <group position={p} scale={1.5}>
      <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.03, 0.03, 0.12, 8]} /><meshStandardMaterial color="#d9d6cf" roughness={0.5} /></mesh>
      <group ref={ref}>
        <mesh position={[0, -0.02, 0.06]}><boxGeometry args={[0.11, 0.1, 0.24]} /><meshStandardMaterial color="#e6e3dc" roughness={0.45} /></mesh>
        <mesh position={[0, -0.02, 0.185]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.035, 0.035, 0.02, 16]} /><meshStandardMaterial color="#111316" roughness={0.2} metalness={0.4} /></mesh>
        <mesh position={[0.038, 0.02, 0.183]}><sphereGeometry args={[0.008, 8, 8]} /><meshStandardMaterial ref={led} color="#ff3b2f" emissive="#ff3b2f" emissiveIntensity={3} /></mesh>
      </group>
    </group>
  )
}

// Regia del prologo: arrivato alla scrivania, squilla la videochiamata di Teo.
function PrologueDirector({ mode }: { mode: WorldMode }) {
  const { camera } = useThree()
  useFrame(() => {
    if (mode !== 'play') return
    const g = useGame.getState()
    if (g.progress?.step !== 'm0_arrive' || g.call || g.timeSkip || !g.progress.flags.tutMove) return
    if (Math.hypot(camera.position.x - L.PLAYER_DESK.x, camera.position.z - L.PLAYER_DESK.z - 0.6) < 1.6) {
      g.setCall({ id: 'handover', ringing: true })
    }
  })
  return null
}

function Building({ mode }: { mode: WorldMode }) {
  const m = useMats()
  const northWall = usePBR('precast_concrete_wall', 8.75, 1, { normalScale: new THREE.Vector2(0.45, 0.45) })
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
  const exitTex = useMemo(() => textTexture(['USCITA'], { w: 512, h: 160, bg: '#1f8a4c', color: '#f2fff4', font: '800 100px "Big Shoulders Display"', align: 'center', pad: 24 }), [])
  const wb = useMemo(() => textTexture(['GIORNI SENZA INCIDENTI:  0', '', '[UFFICI]—sw—ROUTER—sw—[SERVER]', '', '"due quartieri, un ponte" — A.'], { w: 1024, h: 512, bg: '#eeeeea', color: '#1d3a63', font: '700 52px Caveat', pad: 36, lineHeight: 1.25 }), [])
  const tvTex = useMemo(() => textTexture(['RIUNIONE DI LUNEDÌ', 'Sicurezza Q3: 0 incidenti!', '', 'Prossimo punto:', 'formazione phishing', 'RIMANDATA (di nuovo)'], { w: 512, h: 288, bg: '#10233a', color: '#cfe0f0', font: '600 28px "Inter Tight"', pad: 26, lineHeight: 1.25 }), [])
  const PD = L.PLAYER_DESK
  const catPhoto = useMemo(() => adaCatPhoto(), [])
  const phishTex = useMemo(
    () => textTexture(['HALDEN NETCARE', '', 'Da: supporto@halden-netcare-it.com', 'URGENTE: account bloccato', 'tra 30 minuti', '', 'Gentile utente,', 'conferma la password...', '', 'fatto! — B.'], { w: 420, h: 594, bg: '#f7f5ef', color: '#1c1f24', font: '500 22px "Inter Tight"', pad: 28, lineHeight: 1.45 }),
    [],
  )
  const calendar = useMemo(() => adaCalendar(), [])
  const pillarMat = useMemo(() => new THREE.MeshStandardMaterial({ map: plasterTexture(0.6, 1.3), roughness: 0.9 }), [])
  const cabinetMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d8d4ca', roughness: 0.55 }), [])
  const cabinetDoor = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e4e0d6', roughness: 0.5 }), [])
  // le luci dell'archivio restano accese fino al prologo (le spegni tu); dopo il lockdown restano spente
  const archiveDark = useGame((s) => !!s.progress?.flags.archiveDark || !!s.progress?.flags.lockdown) || mode === 'title'

  return (
    <group>
      {/* PAVIMENTO: cemento lucidato; moquette negli uffici e nella zona di lavoro */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.5]} material={m.floor} receiveShadow><planeGeometry args={[28, 23]} /></mesh>
      <Carpet p={[-1, 2.5]} w={7.6} d={7.4} />
      <Carpet p={[-11, -1]} w={5.8} d={5.8} />
      <Carpet p={[11, -1]} w={5.8} d={5.8} />
      <Carpet p={[-9.5, -8]} w={8.8} d={7.8} />
      <Ceiling />
      <Walls concrete={northWall} glass={m.glass} metal={m.metal} />

      {/* PORTE */}
      {L.DOORS.map((d) =>
        d.id === 'stairs' ? (
          <Hit key={d.id} id="door"><Door id="stairs" glass={m.glass} metal={m.metal} ledOn={!lockdown} /></Hit>
        ) : (
          <Hit key={d.id} id={`door_${d.id}` as InteractId}><Door id={d.id} glass={m.glass} metal={m.metal} /></Hit>
        ),
      )}

      {/* FINESTRE: vetro, montante, davanzale; fuori la città */}
      {L.WINDOWS.map((w, i) => (
        <group key={i} position={[w.x, 0, w.z]} rotation={[0, w.rotY === 0 ? 0 : Math.PI / 2, 0]}>
          <Hit id="window">
            <mesh position={[0, 1.85, 0]}>
              <planeGeometry args={[2.3, 2.1]} />
              <meshStandardMaterial color="#9fb6cc" transparent opacity={0.07} roughness={0.05} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
          </Hit>
          <Box p={[0, 1.85, 0]} s={[0.05, 2.1, 0.08]} m={m.metal} />
          <Box p={[0, L.WINDOW_SILL, 0]} s={[2.34, 0.04, 0.32]} m={m.steel} />
        </group>
      ))}
      {L.WINDOWS.filter((w) => w.rotY !== 0 && w.z < 2).map((w) => <Blinds key={w.z} x={w.x} z={w.z} rotY={w.rotY} />)}
      <mesh position={[-42, 6, -0.5]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[90, 24]} /><meshBasicMaterial map={city} fog={false} /></mesh>
      <mesh position={[0, 6, 38]} rotation={[0, Math.PI, 0]}><planeGeometry args={[90, 24]} /><meshBasicMaterial map={city} fog={false} /></mesh>
      <Shutters lockdown={lockdown} level={level} />

      {/* OPEN SPACE: due banchi da sei postazioni, la tua in prima fila */}
      <PlayerDesk m={m} lockdown={lockdown} mode={mode} />
      {mode === 'title' && <TitleProps m={m} />}
      <Desk p={[PD.x - 2, 0, PD.z]} persona="tidy" />
      {/* la scrivania di Bruno: l'email di phishing che ha stampato (capitolo 4) */}
      <Desk p={[PD.x - 4, 0, PD.z]} persona="messy">
        <Hit id="brunoMail" position={[-0.32, 0.793, 0.2]} rotation={[0, 0.18, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.21, 0.297]} /><meshStandardMaterial map={phishTex} roughness={0.9} /></mesh>
        </Hit>
      </Desk>
      <Desk p={[PD.x, 0, PD.z - 1]} ry={Math.PI} partition={false} persona="tidy" />
      <Desk p={[PD.x - 2, 0, PD.z - 1]} ry={Math.PI} partition={false} persona="plant" />
      <Desk p={[PD.x - 4, 0, PD.z - 1]} ry={Math.PI} partition={false} persona="empty" />
      <Desk p={[PD.x, 0, 1]} persona="boss" />
      <Desk p={[PD.x - 2, 0, 1]} persona="tidy" saver />
      <Desk p={[PD.x - 4, 0, 1]} persona="empty" />
      <Desk p={[PD.x, 0, 0]} ry={Math.PI} partition={false} persona="messy" />
      <Desk p={[PD.x - 2, 0, 0]} ry={Math.PI} partition={false} persona="empty" />
      <Desk p={[PD.x - 4, 0, 0]} ry={Math.PI} partition={false} persona="plant" />
      <Hit id="whiteboard" position={[L.WHITEBOARD.x, 0.1, 7.9]} rotation={[0, Math.PI, 0]}>
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
      <Model id="potted_plant_02" pick={POTTED} position={[-7.4, 0, 7.4]} />
      <Model id="potted_plant_02" pick={POTTED} position={[7.4, 0, -3.4]} />
      <Model id="metal_trash_can" pick={['metal_trash_can', 'metal_trash_can_lid']} position={[-4.5, 0, 2.5]} scale={0.5} />
      <Model id="metal_trash_can" pick={['metal_trash_can', 'metal_trash_can_lid']} position={[2.5, 0, 2.5]} scale={0.5} />
      <NocWall lockdown={lockdown} />
      {[-6, 6].map((x) => <Box key={x} p={[x, L.CEILING / 2, 2.5]} s={[0.5, L.CEILING, 0.5]} m={pillarMat} cast />)}
      {/* l'occhio di Teo: telecamere che ti seguono */}
      {mode !== 'title' && (
        <>
          <TeoCam p={[7.7, 2.95, 7.7]} />
          <TeoCam p={[-13.6, 2.95, 10.6]} />
          <TeoCam p={[-0.8, 2.95, -3.75]} />
        </>
      )}

      {/* UFFICIO DI ADA (cap. 1) */}
      <AdaDesk m={m} />
      <FilingCabinet p={[-13, 0, -3.62]} />
      <Plant p={[-8.7, 0, 1.4]} s={1.1} m={m} />
      <pointLight position={[-11, 2.9, -1]} color="#ffe2b8" intensity={lockdown ? 0.3 : 0.7} distance={7} decay={1.6} />

      {/* Parete dell'ufficio di Ada: la foto del gatto e il calendario fermo all'ultimo mese */}
      <Hit id="adaPhoto" position={[-12.3, 1.62, -3.915]}>
        <mesh material={m.black}><boxGeometry args={[0.46, 0.38, 0.025]} /></mesh>
        <mesh position={[0, 0, 0.014]}><planeGeometry args={[0.42, 0.34]} /><meshStandardMaterial map={catPhoto} roughness={0.6} /></mesh>
      </Hit>
      <Hit id="adaCalendar" position={[-10.6, 1.5, -3.92]}>
        <mesh><planeGeometry args={[0.42, 0.6]} /><meshStandardMaterial map={calendar} roughness={0.9} /></mesh>
      </Hit>

      {/* SALA RIUNIONI (cap. 4) */}
      <CustomModel name="meetingtable" position={[-9.5, 0, -8]} />
      {[-10.3, -9.5, -8.7].map((x) => <Chair key={`a${x}`} p={[x, 0, -8.75]} ry={0.05 * (x + 9.5)} />)}
      {[-10.3, -9.5, -8.7].map((x) => <Chair key={`b${x}`} p={[x, 0, -7.25]} ry={Math.PI + 0.08 * (x + 9.5)} />)}
      <Hit id="meetingTv" position={[0, 0, 0]}>
      <CustomModel
        name="tv"
        position={[-9.5, 0, -11.92]}
        tweak={(o) => {
          const mm = o as THREE.Mesh
          if (mm.isMesh && o.name === 'TvScreen') {
            tvTex.flipY = false
            mm.material = new THREE.MeshStandardMaterial({ map: tvTex, emissiveMap: tvTex, emissive: '#ffffff', emissiveIntensity: 0.35 })
          }
        }}
      />
      </Hit>

      {/* SALA SERVER (cap. 2) e LOCALE TECNICO (cap. 3) */}
      <ServerRoom m={m} />

      {/* UFFICIO DI TEO (cap. 5) */}
      <Desk p={[11, 0, -1]} ry={Math.PI / 2} persona="boss" saver />
      <Plant p={[13.4, 0, -3.4]} s={1.1} m={m} />

      {/* CUCINETTA: la macchina del caffè è guasta (per questo, nel prologo, esci a cercarne un'altra) */}
      <Hit id="coffee" position={[L.KITCHEN.x, 0, L.KITCHEN.z]} rotation={[0, -Math.PI / 2, 0]}>
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
      <Box p={[13.8, 1.95, L.KITCHEN.z]} s={[0.34, 0.05, 2.4]} m={m.metal} />
      <Box p={[13.8, 2.3, L.KITCHEN.z]} s={[0.34, 0.66, 2.4]} m={cabinetMat} cast />
      {[-0.8, 0, 0.8].map((dz) => <Box key={dz} p={[13.625, 2.3, L.KITCHEN.z + dz]} s={[0.01, 0.6, 0.76]} m={cabinetDoor} />)}
      <group position={[10.6, 0, 5.4]}>
        <mesh position={[0, 0.74, 0]} castShadow><cylinderGeometry args={[0.4, 0.4, 0.03, 28]} /><meshStandardMaterial color="#d9d3c5" roughness={0.5} /></mesh>
        <mesh position={[0, 0.37, 0]} material={m.metal}><cylinderGeometry args={[0.03, 0.03, 0.72, 10]} /></mesh>
        <mesh position={[0, 0.01, 0]} material={m.metal}><cylinderGeometry args={[0.24, 0.24, 0.02, 20]} /></mesh>
        <Chair p={[-0.65, 0, 0.1]} ry={-Math.PI / 2 - 0.3} />
        <Chair p={[0.62, 0, -0.15]} ry={Math.PI / 2 + 0.2} />
        <Mug position={[0.1, 0.755, 0.08]} />
      </group>
      <mesh position={[13.75, 1.92, L.KITCHEN.z]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[0.12, 2.2]} /><meshStandardMaterial color="#fff1d6" emissive="#ffe2b0" emissiveIntensity={1.2} /></mesh>
      <pointLight position={[13.2, 1.8, L.KITCHEN.z]} color="#ffd9a0" intensity={1.1} distance={5} decay={1.5} />
      <Hit id="cooler" position={[13.6, 0, 7.55]}>
        <CustomModel name="cooler" rotation={[0, -Math.PI / 2, 0]} />
      </Hit>
      <Model id="metal_trash_can" pick={['metal_trash_can', 'metal_trash_can_lid', 'metal_trash_can_handle_left', 'metal_trash_can_handle_right']} position={[13.6, 0, 2.6]} scale={0.5} />

      {/* ARCHIVIO: bacheca, cassettiere, stampante, lo scatolone di Ada mai ritirato */}
      <Hit id="board" position={[L.BOARD.x, 0, L.BOARD.z]}>
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
      {[-13.45, -12.95, -12.45, -11.95].map((x, i) => <FilingCabinet key={x} p={[x, 0, 2.36]} open={i === 2} />)}
      {/* scaffale di faldoni sotto la finestra ovest dell'archivio */}
      <Shelf p={[-13.72, 0, 7.05]} ry={Math.PI / 2} />
      <Hit id="copier" position={[-9, 0, 7.5]} rotation={[0, Math.PI, 0]}>
        <CustomModel name="copier" />
      </Hit>
      <Hit id="adaBox" position={[L.ADA_BOX.x, 0, L.ADA_BOX.z]} rotation={[0, 0.25, 0]}>
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
      <Plant p={[-13.3, 0, 3.15]} s={1.1} m={m} />
      <Hit id="lightSwitch" position={L.LIGHT_SWITCH} rotation={[0, -Math.PI / 2, 0]}>
        <mesh><boxGeometry args={[0.09, 0.13, 0.015]} /><meshStandardMaterial color="#e8e4da" roughness={0.6} /></mesh>
        <mesh position={[0, archiveDark ? -0.015 : 0.015, 0.012]} rotation={[archiveDark ? 0.25 : -0.25, 0, 0]}><boxGeometry args={[0.03, 0.045, 0.012]} /><meshStandardMaterial color="#d8d3c6" /></mesh>
        <mesh position={[0, -0.05, 0.009]}><planeGeometry args={[0.012, 0.006]} /><meshStandardMaterial color="#E8823A" emissive="#E8823A" emissiveIntensity={1.5} /></mesh>
      </Hit>
      <pointLight position={[-11, 2.9, 5]} color="#fff1d6" intensity={archiveDark ? 0 : 2.2} distance={8} decay={1.4} />

      {/* CORRIDOIO: ascensori spenti, scale a ovest, uscita a est */}
      {[-1.2, 1.2].map((x) => (
        <group key={x} position={[x, 0, 10.92]} rotation={[0, Math.PI, 0]}>
          <Box p={[0, 1.15, 0]} s={[1.3, 2.3, 0.04]} m={m.metal} />
          <Box p={[-0.27, 1.05, 0.025]} s={[0.52, 2.1, 0.02]} m={m.steel} />
          <Box p={[0.27, 1.05, 0.025]} s={[0.52, 2.1, 0.02]} m={m.steel} />
          <Box p={[0, 2.42, 0.025]} s={[0.4, 0.14, 0.02]} m={m.black} />
        </group>
      ))}
      <Box p={[0, 1.2, 10.9]} s={[0.14, 0.26, 0.04]} m={m.steel} />
      <Model id="wall_clock" position={[0, 2.75, 10.92]} rotation={[0, Math.PI, 0]} scale={1.2} />
      <Label lines={['LEVEL', 'B2']} p={[3.1, 1.9, 10.92]} r={[0, Math.PI, 0]} w={1.0} h={1.0} opts={{ w: 512, h: 512, color: '#d8d2c4', font: '900 210px Big Shoulders Display', lineHeight: 0.92 }} />
      <Label lines={['HALDEN NETCARE']} p={[-8, 2.55, 8.085]} w={4.2} h={0.55} opts={{ w: 1536, h: 200, color: '#d8d2c4', font: '900 170px Big Shoulders Display', align: 'center' }} />
      <Label lines={['BETTER CONNECTIONS, A BRIGHTER TOMORROW.']} p={[-8, 2.15, 8.085]} w={4.2} h={0.2} opts={{ w: 2048, h: 100, color: '#E8823A', font: '700 80px Big Shoulders Display', align: 'center' }} />
      <Hit id="display" position={[-12.4, 2.0, 10.92]} rotation={[0, Math.PI, 0]}>
        <Box p={[0, 0, -0.03]} s={[1.1, 0.46, 0.04]} m={m.black} />
        <mesh><planeGeometry args={[1, 0.38]} /><meshStandardMaterial ref={disp} map={display} emissiveMap={display} emissive="#ffffff" /></mesh>
      </Hit>
      <Model id="fire_alarm" position={[-13.92, 1.5, 7.7]} rotation={[0, Math.PI / 2, 0]} scale={1.5} />
      <group position={[13.92, 2.75, 9.5]} rotation={[0, -Math.PI / 2, 0]}>
        <Box p={[0, 0, -0.02]} s={[0.62, 0.22, 0.04]} m={m.black} />
        <mesh><planeGeometry args={[0.58, 0.18]} /><meshStandardMaterial map={exitTex} emissiveMap={exitTex} emissive="#ffffff" emissiveIntensity={1.4} /></mesh>
      </group>
      <CustomModel name="coatrack" position={[12.9, 0, 10.4]} rotation={[0, -2.2, 0]} />
      <pointLight position={[0, 2.9, 9.5]} color="#ffd9a0" intensity={lockdown ? 0.5 : 1.8} distance={14} decay={1.4} />

      {/* luci d'emergenza sui muri */}
      {([[-7.92, 2.9, 3, 1], [7.92, 2.9, 3, 1], [0, 2.95, 8.08, 0], [-11, 2.95, -3.92, 0], [6.5, 2.95, -11.92, 0]] as [number, number, number, number][]).map(([x, y, z, side], i) => (
        <group key={i} position={[x, y, z]}>
          <Box p={[0, 0, 0]} s={side ? [0.14, 0.1, 0.35] : [0.35, 0.1, 0.14]} m={emergMat} />
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
const TARGET_POINT = L.TARGET_POINT
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
      <fog attach="fog" args={['#0a0e15', 12, 34]} />
      <ambientLight color="#3a4a66" intensity={lockdown ? 0.45 : 0.62} />
      <hemisphereLight args={['#6f7f99', '#2a241e', 0.5]} />
      {/* luci di cortesia notturne dal controsoffitto: sempre presenti, cambiano solo intensità */}
      <pointLight position={[-1, 3.0, 2.5]} color="#ffe9c8" intensity={lockdown ? 0.15 : 0.9} distance={9} decay={1.6} />
      <pointLight position={[4.5, 3.0, 4.5]} color="#ffe9c8" intensity={lockdown ? 0.1 : 0.6} distance={8} decay={1.6} />
      {/* la luce resta sempre nella scena (aggiungere/togliere luci ricompila tutti i materiali = scatto) */}
      <directionalLight position={[-24, 10, 8]} color="#a9bfe8" intensity={moon} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.03} shadow-camera-left={-17} shadow-camera-right={17} shadow-camera-top={17} shadow-camera-bottom={-17} />
      <Building mode={mode} />
      <Player mode={mode} />
      <PrologueDirector mode={mode} />
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
  const high = useGame((s) => s.settings.quality !== 'low')
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
        <Canvas
          shadows
          // risoluzione fissa (mai variabile: i cambi di risoluzione facevano sfarfallare le luci)
          dpr={high ? Math.min(1.5, window.devicePixelRatio || 1) : 1}
          camera={{ fov: 70, near: 0.1, far: 60, position: TITLE_POS.toArray() }}
          gl={{ antialias: !high, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => (gl.toneMapping = high ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping)}
          key={high ? 'hq' : 'lq'}
        >
          <Suspense fallback={null}>
            <Scene mode={mode} />
          </Suspense>
          {stats && <Stats />}
          {/* resa alta: ombre di contatto morbide (occlusione ambientale), bagliore di luci e schermi, bordi lisci */}
          {high && (
            <EffectComposer multisampling={0} disableNormalPass>
              <N8AO halfRes aoRadius={0.9} intensity={2.2} distanceFalloff={0.6} quality="medium" color="#05070a" />
              <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.85} luminanceSmoothing={0.2} />
              <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              <SMAA />
            </EffectComposer>
          )}
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
