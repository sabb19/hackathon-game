import { useGLTF, useTexture, RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGame } from '../store/game'

type V3 = [number, number, number]

// ---------- modelli glTF (Poly Haven, CC0) ----------
// `pick`: tiene solo i nodi con questi nomi (alcuni file contengono più varianti affiancate) e li ricentra.
export function Model({ id, pick, position, rotation, scale = 1, tweak, deps = [] }: { id: string; pick?: string[]; position?: V3; rotation?: V3; scale?: number; tweak?: (o: THREE.Object3D) => void; deps?: unknown[] }) {
  const { scene } = useGLTF(`/assets/models/${id}/${id}.gltf`)
  const obj = useMemo(() => {
    const root = scene.clone(true)
    if (pick) {
      root.children.filter((c) => !pick.includes(c.name)).forEach((c) => root.remove(c))
      const b = new THREE.Box3().setFromObject(root)
      const c = b.getCenter(new THREE.Vector3())
      root.position.set(-c.x, 0, -c.z)
    }
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
      }
      tweak?.(o)
    })
    const g = new THREE.Group()
    g.add(root)
    return g
  }, [scene, pick?.join('|'), ...deps])
  return <primitive object={obj} position={position} rotation={rotation} scale={scale} />
}

export const MODEL_IDS = [
  'metal_office_desk', 'desk_lamp_arm_01', 'potted_plant_02', 'pachira_aquatica_01', 'drawer_cabinet', 'wall_clock',
  'office_notepads', 'stationery_supplies', 'binder_notebook', 'standing_picture_frame_01', 'mounted_fluorescent_lights',
  'metal_trash_can', 'steel_frame_shelves_03', 'modern_arm_chair_01', 'fire_alarm', 'security_camera_01',
]
MODEL_IDS.forEach((id) => useGLTF.preload(`/assets/models/${id}/${id}.gltf`))

// ---------- materiali PBR con texture reali ----------
export function usePBR(name: string, rx: number, ry: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  const t = useTexture({
    map: `/assets/textures/${name}/diff.jpg`,
    normalMap: `/assets/textures/${name}/nor.jpg`,
    roughnessMap: `/assets/textures/${name}/rough.jpg`,
  })
  return useMemo(() => {
    const clone = (tx: THREE.Texture, srgb: boolean) => {
      const c = tx.clone()
      c.wrapS = c.wrapT = THREE.RepeatWrapping
      c.repeat.set(rx, ry)
      c.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
      c.anisotropy = 8
      c.needsUpdate = true
      return c
    }
    return new THREE.MeshStandardMaterial({
      map: clone(t.map, true),
      normalMap: clone(t.normalMap, false),
      roughnessMap: clone(t.roughnessMap, false),
      ...extra,
    })
  }, [t, rx, ry])
}

// ---------- schermo CRT: disegna il vero stato di RELAY ----------
function drawScreen(c: HTMLCanvasElement, s: { lockdown: boolean; loggedIn: boolean; username: string; t: number; desktop: boolean }) {
  const g = c.getContext('2d')!
  const W = c.width
  const H = c.height
  const bg = s.lockdown ? ['#2b1a10', '#140b06'] : ['#173049', '#0b1520']
  const grd = g.createRadialGradient(W / 2, H * 0.45, 20, W / 2, H / 2, W * 0.75)
  grd.addColorStop(0, bg[0])
  grd.addColorStop(1, bg[1])
  g.fillStyle = grd
  g.fillRect(0, 0, W, H)
  const ink = s.lockdown ? '#ffb070' : '#cfe3f5'
  g.fillStyle = ink
  if (!s.loggedIn) {
    // schermata di accesso
    g.fillStyle = '#d9cfb4'
    g.fillRect(W * 0.22, H * 0.26, W * 0.56, H * 0.46)
    g.fillStyle = '#2b3f57'
    g.fillRect(W * 0.22, H * 0.26, W * 0.56, H * 0.07)
    g.fillStyle = '#1c1f24'
    g.font = `600 ${H * 0.07}px Big Shoulders Display, sans-serif`
    g.fillText('RELAY·OS', W * 0.27, H * 0.43)
    g.font = `500 ${H * 0.035}px "JetBrains Mono", monospace`
    g.fillText('utente  ________', W * 0.27, H * 0.52)
    g.fillText('password ________', W * 0.27, H * 0.58)
    if (Math.floor(s.t * 2) % 2) g.fillRect(W * 0.47, H * 0.5, W * 0.012, H * 0.03)
  } else {
    // desktop: icone, finestra, barra delle applicazioni
    for (let i = 0; i < 4; i++) {
      g.fillStyle = '#d9cfb4'
      g.fillRect(W * 0.04, H * (0.06 + i * 0.14), W * 0.06, H * 0.08)
    }
    g.fillStyle = '#d9cfb4'
    g.fillRect(W * 0.22, H * 0.14, W * 0.5, H * 0.52)
    g.fillStyle = '#2b3f57'
    g.fillRect(W * 0.22, H * 0.14, W * 0.5, H * 0.05)
    g.fillStyle = '#0f1822'
    g.fillRect(W * 0.235, H * 0.21, W * 0.47, H * 0.43)
    g.strokeStyle = '#E8DFC9'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(W * 0.3, H * 0.35)
    g.lineTo(W * 0.45, H * 0.45)
    g.lineTo(W * 0.62, H * 0.35)
    g.stroke()
    g.fillStyle = '#efe1a0'
    g.fillRect(W * 0.78, H * 0.06, W * 0.18, H * 0.16)
    g.fillStyle = '#cfc4a6'
    g.fillRect(0, H * 0.92, W, H * 0.08)
    g.fillStyle = '#1c1f24'
    g.font = `600 ${H * 0.04}px Big Shoulders Display, sans-serif`
    g.fillText('RELAY', W * 0.02, H * 0.975)
  }
  if (s.lockdown) {
    const on = Math.floor(s.t * 1.5) % 2 === 0
    g.fillStyle = on ? '#E8823A' : '#7a3d18'
    g.fillRect(0, 0, W, H * 0.07)
    g.fillStyle = '#140b06'
    g.font = `700 ${H * 0.05}px "JetBrains Mono", monospace`
    g.fillText('! LOCKDOWN — PIANO SIGILLATO', W * 0.03, H * 0.055)
  }
}

function curvedPlane(w: number, h: number, bulge: number) {
  const geo = new THREE.PlaneGeometry(w, h, 24, 18)
  const p = geo.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (w / 2)
    const y = p.getY(i) / (h / 2)
    p.setZ(i, bulge * (1 - 0.5 * (x * x + y * y)))
  }
  geo.computeVertexNormals()
  return geo
}

const BEIGE = new THREE.MeshStandardMaterial({ color: '#cdbf9c', roughness: 0.55 })
const BEIGE_DARK = new THREE.MeshStandardMaterial({ color: '#a89a78', roughness: 0.6 })
const DARK = new THREE.MeshStandardMaterial({ color: '#16181b', roughness: 0.5 })
const KEY = new THREE.MeshStandardMaterial({ color: '#ddd2b6', roughness: 0.5 })
const RACK_UNIT = new THREE.MeshStandardMaterial({ color: '#2a2e33', roughness: 0.4, metalness: 0.6 })

// ---------- monitor CRT anni '90, costruito con forme corrette ----------
// Guscio frontale estruso con l'apertura dello schermo, retro rastremato, schermo bombato incassato.
function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  s.moveTo(-w / 2 + r, -h / 2)
  s.lineTo(w / 2 - r, -h / 2)
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
  s.lineTo(w / 2, h / 2 - r)
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
  s.lineTo(-w / 2 + r, h / 2)
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
  s.lineTo(-w / 2, -h / 2 + r)
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
  return s
}

// scatola che si stringe verso il retro (il "tubo" del CRT)
function taperedBox(wf: number, hf: number, wb: number, hb: number, d: number) {
  const g = new THREE.BoxGeometry(1, 1, d, 1, 1, 1)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const front = p.getZ(i) > 0
    p.setX(i, p.getX(i) * (front ? wf : wb))
    p.setY(i, p.getY(i) * (front ? hf : hb) + (front ? 0 : 0.015))
  }
  g.computeVertexNormals()
  return g
}

const SHELL_W = 0.42
const SHELL_H = 0.38
const OPEN_W = 0.315
const OPEN_H = 0.24
export const CRT_FRONT_Z = 0.17 // faccia frontale del guscio, in coordinate locali

export function DetailedCrt({ live = false, dark = false }: { live?: boolean; dark?: boolean }) {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 384
    return c
  }, [])
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [canvas])
  const geo = useMemo(() => {
    const shape = roundedRect(SHELL_W, SHELL_H, 0.03)
    shape.holes.push(roundedRect(OPEN_W, OPEN_H, 0.018) as unknown as THREE.Path)
    const front = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3, curveSegments: 8 })
    const inner = new THREE.ExtrudeGeometry(roundedRect(OPEN_W + 0.01, OPEN_H + 0.01, 0.02), { depth: 0.03, bevelEnabled: false })
    return {
      front,
      inner,
      back: taperedBox(SHELL_W - 0.02, SHELL_H - 0.02, 0.27, 0.25, 0.3),
      screen: curvedPlane(OPEN_W, OPEN_H, 0.012),
    }
  }, [])
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const last = useRef(-1)
  const keyRef = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    if (!dark) return
    const g = canvas.getContext('2d')!
    g.fillStyle = '#0c0f12'
    g.fillRect(0, 0, canvas.width, canvas.height)
    tex.needsUpdate = true
  }, [dark])

  // tastiera: 70 tasti in un'unica istanza (1 sola chiamata di disegno)
  useEffect(() => {
    const m = keyRef.current
    if (!m) return
    const o = new THREE.Object3D()
    let i = 0
    for (let r = 0; r < 5; r++)
      for (let k = 0; k < 14; k++) {
        o.position.set(-0.195 + k * 0.03, 0.033 + r * 0.004, 0.37 + r * 0.028)
        o.rotation.set(-0.12, 0, 0)
        o.updateMatrix()
        m.setMatrixAt(i++, o.matrix)
      }
    m.instanceMatrix.needsUpdate = true
  }, [])

  useFrame(({ clock }) => {
    if (dark || !live) return
    const t = clock.elapsedTime
    const tick = Math.floor(t * 4)
    if (tick === last.current) return
    last.current = tick
    const p = useGame.getState().progress
    drawScreen(canvas, { lockdown: !!p?.flags.lockdown, loggedIn: !!p?.flags.loggedIn, username: p?.username ?? '', t, desktop: true })
    tex.needsUpdate = true
  })

  const cy = 0.29 // centro del guscio
  return (
    <group>
      {/* guscio frontale con apertura */}
      <mesh geometry={geo.front} position={[0, cy, CRT_FRONT_Z - 0.05]} material={BEIGE} castShadow />
      {/* bordo interno scuro attorno al vetro */}
      <mesh geometry={geo.inner} position={[0, cy, CRT_FRONT_Z - 0.06]} material={DARK} />
      {/* corpo posteriore rastremato + prese d'aria */}
      <mesh geometry={geo.back} position={[0, cy, CRT_FRONT_Z - 0.21]} material={BEIGE_DARK} castShadow />
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[-0.105 + i * 0.03, cy + 0.15, -0.08]} rotation={[0.06, 0, 0]} material={DARK}>
          <boxGeometry args={[0.012, 0.006, 0.14]} />
        </mesh>
      ))}
      {/* schermo bombato, incassato dietro la cornice */}
      <mesh geometry={geo.screen} position={[0, cy, CRT_FRONT_Z - 0.032]}>
        <meshStandardMaterial ref={mat} map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={dark ? 0 : 1.1} roughness={0.9} metalness={0} />
      </mesh>
      {/* fascia inferiore: marchio, manopole, LED, pulsante */}
      <mesh position={[-0.12, cy - 0.158, CRT_FRONT_Z + 0.009]} material={DARK}><boxGeometry args={[0.07, 0.012, 0.002]} /></mesh>
      {[0.07, 0.1].map((x) => (
        <mesh key={x} position={[x, cy - 0.158, CRT_FRONT_Z + 0.01]} rotation={[Math.PI / 2, 0, 0]} material={BEIGE_DARK}>
          <cylinderGeometry args={[0.008, 0.008, 0.012, 16]} />
        </mesh>
      ))}
      <mesh position={[0.15, cy - 0.158, CRT_FRONT_Z + 0.01]} material={BEIGE_DARK}><boxGeometry args={[0.028, 0.016, 0.01]} /></mesh>
      <mesh position={[0.178, cy - 0.158, CRT_FRONT_Z + 0.009]}>
        <boxGeometry args={[0.006, 0.006, 0.003]} />
        <meshStandardMaterial color="#6FBF8E" emissive="#6FBF8E" emissiveIntensity={dark ? 0.15 : 2.5} />
      </mesh>
      {/* piedistallo orientabile */}
      <mesh position={[0, 0.06, 0]} material={BEIGE_DARK}><cylinderGeometry args={[0.07, 0.11, 0.07, 32]} /></mesh>
      <mesh position={[0, 0.012, 0]} material={BEIGE}><cylinderGeometry args={[0.15, 0.155, 0.024, 40]} /></mesh>
      {/* tastiera */}
      <RoundedBox args={[0.46, 0.028, 0.17]} radius={0.008} smoothness={3} position={[0, 0.014, 0.42]} material={BEIGE} castShadow />
      <instancedMesh ref={keyRef} args={[undefined, undefined, 70]} material={KEY}>
        <boxGeometry args={[0.025, 0.012, 0.024]} />
      </instancedMesh>
      <mesh position={[0, 0.055, 0.512]} rotation={[-0.12, 0, 0]} material={KEY}><boxGeometry args={[0.17, 0.012, 0.024]} /></mesh>
      {/* mouse con cavo */}
      <RoundedBox args={[0.06, 0.03, 0.1]} radius={0.014} smoothness={3} position={[0.32, 0.015, 0.44]} material={BEIGE} />
      <mesh position={[0.32, 0.01, 0.31]} rotation={[Math.PI / 2, 0, 0]} material={DARK}><cylinderGeometry args={[0.002, 0.002, 0.16, 6]} /></mesh>
      {live && <pointLight position={[0, 0.3, 0.5]} color={useGame.getState().progress?.flags.lockdown ? '#E8823A' : '#7fb0e0'} intensity={0.9} distance={2.2} />}
    </group>
  )
}

// Rack server con unità, griglie, cavi colorati.
export function RackBody() {
  const units = useMemo(() => Array.from({ length: 14 }, (_, i) => i), [])
  const cableColors = ['#3d7bd0', '#e0c341', '#6FBF8E', '#d9644a', '#cfcfcf']
  return (
    <group>
      {/* telaio */}
      {[[-0.39, -0.37], [0.39, -0.37], [-0.39, 0.37], [0.39, 0.37]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.05, z]} material={DARK}><boxGeometry args={[0.05, 2.1, 0.05]} /></mesh>
      ))}
      <mesh position={[0, 2.08, 0]} material={DARK}><boxGeometry args={[0.85, 0.05, 0.8]} /></mesh>
      <mesh position={[0, 0.03, 0]} material={DARK}><boxGeometry args={[0.85, 0.06, 0.8]} /></mesh>
      <mesh position={[0, 1.05, -0.36]} material={DARK}><boxGeometry args={[0.75, 2, 0.02]} /></mesh>
      {/* unità */}
      {units.map((i) => (
        <group key={i} position={[0, 0.18 + i * 0.135, 0.33]}>
          <mesh material={i % 4 === 0 ? BEIGE_DARK : RACK_UNIT}>
            <boxGeometry args={[0.72, 0.12, 0.06]} />
          </mesh>
          {Array.from({ length: 10 }, (_, k) => <mesh key={k} position={[-0.3 + k * 0.035, 0, 0.031]} material={DARK}><boxGeometry args={[0.025, 0.07, 0.002]} /></mesh>)}
        </group>
      ))}
      {/* cavi di rete che scendono */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-0.3 + i * 0.07, 1.05, 0.38]} rotation={[0.04 * (i % 3), 0, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 1.0, 6]} />
          <meshStandardMaterial color={cableColors[i % cableColors.length]} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

// ---------- oggetti costruiti a mano (non presenti nelle librerie CC0) ----------
const FABRIC = new THREE.MeshStandardMaterial({ color: '#2b3442', roughness: 0.95 })
const CHROME = new THREE.MeshStandardMaterial({ color: '#9aa1a8', roughness: 0.25, metalness: 0.9 })
const BLACK_PLASTIC = new THREE.MeshStandardMaterial({ color: '#1a1c1f', roughness: 0.6 })

// Sedia da ufficio anni '90: base a 5 razze con ruote, pistone, seduta e schienale imbottiti.
export function OfficeChair({ position, rotation }: { position?: V3; rotation?: V3 }) {
  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <group key={i} rotation={[0, a, 0]}>
            <mesh position={[0.15, 0.07, 0]} rotation={[0, 0, 0.08]} material={BLACK_PLASTIC} castShadow><boxGeometry args={[0.3, 0.035, 0.05]} /></mesh>
            <mesh position={[0.29, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]} material={BLACK_PLASTIC}><cylinderGeometry args={[0.028, 0.028, 0.03, 12]} /></mesh>
          </group>
        )
      })}
      <mesh position={[0, 0.25, 0]} material={CHROME}><cylinderGeometry args={[0.025, 0.03, 0.34, 16]} /></mesh>
      <mesh position={[0, 0.1, 0]} material={BLACK_PLASTIC}><cylinderGeometry args={[0.045, 0.05, 0.08, 16]} /></mesh>
      <RoundedBox args={[0.5, 0.08, 0.48]} radius={0.035} smoothness={4} position={[0, 0.46, 0]} material={FABRIC} castShadow />
      <mesh position={[0, 0.41, 0]} material={BLACK_PLASTIC}><boxGeometry args={[0.3, 0.03, 0.3]} /></mesh>
      {/* supporto e schienale */}
      <mesh position={[0, 0.55, -0.24]} rotation={[-0.15, 0, 0]} material={BLACK_PLASTIC}><boxGeometry args={[0.06, 0.25, 0.03]} /></mesh>
      <RoundedBox args={[0.46, 0.5, 0.07]} radius={0.03} smoothness={4} position={[0, 0.88, -0.27]} rotation={[-0.12, 0, 0]} material={FABRIC} castShadow />
      {/* braccioli */}
      {[-0.27, 0.27].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.56, -0.02]} material={BLACK_PLASTIC}><boxGeometry args={[0.03, 0.18, 0.03]} /></mesh>
          <RoundedBox args={[0.06, 0.03, 0.26]} radius={0.012} smoothness={3} position={[x, 0.66, 0.0]} material={BLACK_PLASTIC} />
        </group>
      ))}
    </group>
  )
}

// Telefono fisso a tasti con cornetta e cavo a spirale.
export function DeskPhone({ position, rotation }: { position?: V3; rotation?: V3 }) {
  const keys = useMemo(() => {
    const out: V3[] = []
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) out.push([-0.035 + c * 0.035, 0.052 - r * 0.004, 0.0 + r * 0.03])
    return out
  }, [])
  const coil = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 160; i++) {
      const t = i / 160
      pts.push(new THREE.Vector3(-0.13 - t * 0.05 + Math.cos(t * 60) * 0.008, 0.02 + Math.sin(t * 60) * 0.008, -0.04 + t * 0.12))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.0025, 5)
  }, [])
  return (
    <group position={position} rotation={rotation}>
      {/* base inclinata */}
      <RoundedBox args={[0.2, 0.05, 0.2]} radius={0.015} smoothness={3} position={[0, 0.025, 0]} material={BEIGE} castShadow />
      <mesh position={[0, 0.045, 0.03]} rotation={[0.18, 0, 0]} material={BEIGE_DARK}><boxGeometry args={[0.14, 0.012, 0.13]} /></mesh>
      {keys.map((p, i) => <mesh key={i} position={[p[0], p[1] + 0.003, p[2] - 0.0]} rotation={[0.18, 0, 0]} material={KEY}><boxGeometry args={[0.026, 0.008, 0.02]} /></mesh>)}
      <mesh position={[0.075, 0.056, 0.08]} material={DARK}><boxGeometry args={[0.03, 0.004, 0.018]} /></mesh>
      {/* display */}
      <mesh position={[0, 0.06, -0.035]} rotation={[0.18 - Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, 0.02]} />
        <meshStandardMaterial color="#5c6b4a" emissive="#9fb37a" emissiveIntensity={0.25} />
      </mesh>
      {/* cornetta appoggiata */}
      <group position={[-0.13, 0.065, 0]}>
        <RoundedBox args={[0.05, 0.035, 0.22]} radius={0.016} smoothness={3} material={BEIGE} castShadow />
        <RoundedBox args={[0.06, 0.04, 0.06]} radius={0.018} smoothness={3} position={[0, -0.006, -0.09]} material={BEIGE} />
        <RoundedBox args={[0.06, 0.04, 0.06]} radius={0.018} smoothness={3} position={[0, -0.006, 0.09]} material={BEIGE} />
      </group>
      <mesh geometry={coil} material={BEIGE_DARK} />
    </group>
  )
}

// Tazza modellata in Blender, con fascia opzionale per la scritta.
export function Mug({ position, label }: { position?: V3; label?: THREE.Texture; color?: string }) {
  return (
    <group position={position}>
      <CustomModel name="mug" />
      {label && (
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.0425, 0.0425, 0.04, 40, 1, true, -0.9, 1.8]} />
          <meshStandardMaterial map={label} transparent />
        </mesh>
      )}
    </group>
  )
}

// ---------- postazione modellata in Blender (public/assets/models/custom/workstation.glb, tools/blender/pc3.py) ----------
// Lo schermo ("Screen") riceve una texture viva con lo stato di RELAY.
useGLTF.preload('/assets/models/custom/workstation.glb')
export function CrtModel({ live = false, dark = false, saver = false }: { live?: boolean; dark?: boolean; saver?: boolean }) {
  const { scene } = useGLTF('/assets/models/custom/workstation.glb')
  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 640
    c.height = 360 // monitor 16:9
    const g = c.getContext('2d')!
    if (dark) {
      g.fillStyle = '#0c0f12'
      g.fillRect(0, 0, c.width, c.height)
    }
    if (saver) {
      // screensaver aziendale lasciato acceso da qualcuno
      g.fillStyle = '#06101c'
      g.fillRect(0, 0, c.width, c.height)
      g.fillStyle = 'rgba(232,226,210,0.55)'
      g.font = '900 54px "Big Shoulders Display"'
      g.fillText('HALDEN NETCARE', 70 + Math.random() * 200, 120 + Math.random() * 150)
    }
    return c
  }, [dark, saver])
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    t.flipY = false // UV in convenzione glTF
    return t
  }, [canvas])
  const obj = useMemo(() => {
    const root = scene.clone(true)
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = true
      m.receiveShadow = true
      if (m.name.startsWith('Screen')) m.material = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: saver ? 0.7 : dark ? 0 : 1.1, roughness: 0.9 })
      // in standby il LED è arancione e fioco
      if (dark && m.name.startsWith('LED')) m.material = new THREE.MeshStandardMaterial({ color: '#E8823A', emissive: '#E8823A', emissiveIntensity: 0.9 })
    })
    return root
  }, [scene, tex, dark, saver])
  const last = useRef(-1)
  useFrame(({ clock }) => {
    if (dark || !live) return
    const t = clock.elapsedTime
    const tick = Math.floor(t * 4)
    if (tick === last.current) return
    last.current = tick
    const p = useGame.getState().progress
    drawScreen(canvas, { lockdown: !!p?.flags.lockdown, loggedIn: !!p?.flags.loggedIn, username: p?.username ?? '', t, desktop: true })
    tex.needsUpdate = true
  })
  return (
    <group>
      <primitive object={obj} />
    </group>
  )
}

// Modelli fatti da noi in Blender (GLB in public/assets/models/custom/).
for (const n of ['phone', 'chair', 'rack', 'cabinet', 'mug', 'door', 'shutter', 'cooler', 'whiteboard', 'coatrack', 'partition', 'railing', 'stairs', 'deadplant', 'nameplate', 'smartphone', 'copier', 'kitchen', 'meetingtable', 'tv', 'board', 'adabox', 'pizzabox', 'papercup', 'headphones', 'powerstrip', 'stickies']) useGLTF.preload(`/assets/models/custom/${n}.glb`)
export function CustomModel({ name, position, rotation, scale = 1, tweak, deps = [] }: { name: string; position?: V3; rotation?: V3; scale?: number; tweak?: (o: THREE.Object3D) => void; deps?: unknown[] }) {
  const { scene } = useGLTF(`/assets/models/custom/${name}.glb`)
  const obj = useMemo(() => {
    const root = scene.clone(true)
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
        // il vetro esportato da Blender: trasparente senza scrivere la profondità
        const mm = m.material as THREE.MeshStandardMaterial
        if (mm?.transparent) mm.depthWrite = false
      }
      tweak?.(o)
    })
    return root
  }, [scene, ...deps])
  return <primitive object={obj} position={position} rotation={rotation} scale={scale} />
}
