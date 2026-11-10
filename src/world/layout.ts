// Pianta del livello B2 (vedi docs/design.md §3). Unica fonte delle coordinate:
// muri, porte, inquadrature di ispezione e bersagli dell'obiettivo leggono tutti da qui.
// Assi: x da ovest (-14) a est (+14), z da nord (-12) a sud (+11). Soffitto a 3.2 m.

export type V3 = [number, number, number]
export const CEILING = 3.2

export interface Opening {
  from: number // distanza dall'estremo "a" del muro
  to: number
  type: 'door' | 'gap' | 'window'
}
export interface WallSeg {
  a: [number, number]
  b: [number, number]
  kind: 'plaster' | 'glass' | 'concrete'
  open?: Opening[]
}

// ---- muri (perimetro + divisori) ----
export const WALLS: WallSeg[] = [
  // perimetro
  { a: [-14, -12], b: [14, -12], kind: 'concrete' },
  { a: [14, -12], b: [14, 11], kind: 'plaster', open: [{ from: 20.6, to: 22.4, type: 'door' }] }, // uscita (z 8.6..10.4)
  { a: [14, 11], b: [-14, 11], kind: 'plaster', open: [
    { from: 2.85, to: 5.15, type: 'window' }, { from: 7.35, to: 9.65, type: 'window' },
    { from: 18.35, to: 20.65, type: 'window' }, { from: 22.85, to: 25.15, type: 'window' },
  ] },
  { a: [-14, 11], b: [-14, -12], kind: 'plaster', open: [
    { from: 0.6, to: 2.4, type: 'door' }, // scale (z 10.4..8.6)
    { from: 4.85, to: 7.15, type: 'window' }, // archivio
    { from: 10.85, to: 13.15, type: 'window' }, // ufficio di Ada
    { from: 16.85, to: 19.15, type: 'window' }, { from: 19.85, to: 22.15, type: 'window' }, // sala riunioni
  ] },
  // fila nord: sala riunioni | locale tecnico | sala server
  { a: [-14, -4], b: [-8, -4], kind: 'plaster' },
  { a: [-8, -4], b: [-5, -4], kind: 'glass', open: [{ from: 1.0, to: 2.0, type: 'door' }] }, // porta riunioni (x -7..-6)
  { a: [-5, -12], b: [-5, -4], kind: 'plaster' },
  { a: [-5, -4], b: [-1, -4], kind: 'plaster', open: [{ from: 1.5, to: 2.5, type: 'door' }] }, // porta locale tecnico (x -3.5..-2.5)
  { a: [-1, -12], b: [-1, -4], kind: 'plaster' },
  { a: [-1, -4], b: [8, -4], kind: 'glass', open: [{ from: 3.4, to: 4.6, type: 'door' }] }, // porta blindata server (x 2.4..3.6)
  { a: [8, -4], b: [14, -4], kind: 'plaster' },
  // ovest: ufficio di Ada (vetro) e archivio (varco)
  { a: [-8, -4], b: [-8, 2], kind: 'glass', open: [{ from: 2.4, to: 3.6, type: 'door' }] }, // porta Ada (z -1.6..-0.4)
  { a: [-14, 2], b: [-8, 2], kind: 'plaster' },
  { a: [-8, 2], b: [-8, 8], kind: 'plaster', open: [{ from: 2, to: 5, type: 'gap' }] }, // varco archivio (z 4..7)
  // est: ufficio di Teo (vetro) e cucinetta (varco)
  { a: [8, -4], b: [8, 2], kind: 'glass', open: [{ from: 2.4, to: 3.6, type: 'door' }] }, // porta Teo (z -1.6..-0.4)
  { a: [8, 2], b: [14, 2], kind: 'plaster' },
  { a: [8, 2], b: [8, 8], kind: 'plaster', open: [{ from: 2, to: 5, type: 'gap' }] }, // varco cucinetta
  // sud: open space ↔ corridoio
  { a: [-14, 8], b: [14, 8], kind: 'plaster', open: [{ from: 12, to: 16, type: 'gap' }] }, // varco centrale (x -2..2)
]

// ---- porte (chiuse finché la storia non le apre) ----
export type DoorId = 'stairs' | 'exit' | 'ada' | 'server' | 'tech' | 'meeting' | 'teo'
export interface DoorDef {
  id: DoorId
  pos: V3 // centro dell'apertura, a terra
  rotY: number // rotazione del battente (0 = muro lungo x)
  width: number
  kind: 'glass' | 'solid' | 'security'
  label: string
}
export const DOORS: DoorDef[] = [
  { id: 'stairs', pos: [-14, 0, 9.5], rotY: Math.PI / 2, width: 1.8, kind: 'solid', label: 'SCALE' },
  { id: 'exit', pos: [14, 0, 9.5], rotY: Math.PI / 2, width: 1.8, kind: 'solid', label: 'USCITA' },
  { id: 'ada', pos: [-8, 0, -1], rotY: Math.PI / 2, width: 1.2, kind: 'glass', label: 'A. FERRI' },
  { id: 'server', pos: [3, 0, -4], rotY: 0, width: 1.2, kind: 'security', label: 'SALA SERVER' },
  { id: 'tech', pos: [-3, 0, -4], rotY: 0, width: 1.0, kind: 'solid', label: 'LOCALE TECNICO' },
  { id: 'meeting', pos: [-6.5, 0, -4], rotY: 0, width: 1.0, kind: 'glass', label: 'SALA RIUNIONI' },
  { id: 'teo', pos: [8, 0, -1], rotY: Math.PI / 2, width: 1.2, kind: 'glass', label: 'T. MARCHI' },
]

// ---- posizioni chiave ----
export const PLAYER_DESK = { x: 1, z: 5 } // la tua postazione (prima fila, rivolta a nord)
export const START: V3 = [PLAYER_DESK.x, 1.6, PLAYER_DESK.z + 1.6]
export const TITLE_POS: V3 = [PLAYER_DESK.x + 0.55, 1.5, PLAYER_DESK.z + 1.0]
export const TITLE_LOOK: V3 = [PLAYER_DESK.x, 0.8, PLAYER_DESK.z + 0.1]

export const ADA_DESK = { x: -11.5, z: -1 } // rivolta a est (Ada sedeva con le finestre alle spalle)
export const RACK_B = { x: 3, z: -10.6 } // fila nord della sala server, rivolta a sud
export const CABINET = { x: -3, z: -11.4 } // armadio di SANDBOX-7 nel locale tecnico
export const KITCHEN = { x: 13.65, z: 5 }
export const BOARD = { x: -11, z: 2.08 } // bacheca nell'archivio
export const ADA_BOX = { x: -12.6, z: 3.1 }
export const WHITEBOARD = { x: -5, z: 7.92 }

// Verso dove si gira la camera nel lockdown (dalla porta delle scale verso le finestre del corridoio)
export const LOCK_YAW = -1.99

// Inquadrature di ispezione (da dove guardare, verso dove)
export const VIEWS: Record<string, { pos: V3; look: V3 }> = {
  postit: { pos: [PLAYER_DESK.x + 0.22, 1.2, PLAYER_DESK.z + 0.25], look: [PLAYER_DESK.x + 0.205, 1.195, PLAYER_DESK.z - 0.122] },
  computer: { pos: [PLAYER_DESK.x, 1.25, PLAYER_DESK.z + 0.55], look: [PLAYER_DESK.x, 1.08, PLAYER_DESK.z - 0.15] },
  door: { pos: [-13.25, 1.3, 8.45], look: [-13.9, 1.25, 8.45] },
  display: { pos: [-12.4, 2.0, 9.6], look: [-12.4, 2.0, 10.92] },
  adaDesk: { pos: [-12.75, 1.4, -1.7], look: [-12.08, 0.6, -1.715] },
  adaPhoto: { pos: [-11.8, 1.05, -0.75], look: [-11.2, 0.9, -0.75] },
  whiteboard: { pos: [WHITEBOARD.x, 1.6, 6.0], look: [WHITEBOARD.x, 1.55, 7.92] },
  rack: { pos: [RACK_B.x, 1.4, -9.4], look: [RACK_B.x, 1.2, -10.2] },
  cabinet: { pos: [CABINET.x - 0.1, 1.3, -10.0], look: [CABINET.x, 0.75, -11.2] },
  board: { pos: [BOARD.x, 1.5, 3.2], look: [BOARD.x, 1.5, BOARD.z] },
  coffee: { pos: [12.4, 1.5, 4.55], look: [13.6, 1.25, 4.55] },
  adaBox: { pos: [ADA_BOX.x, 1.25, ADA_BOX.z + 1.0], look: [ADA_BOX.x, 0.25, ADA_BOX.z] },
}

// Punto dove si posa l'indicatore/la luce guida per ogni bersaglio
export const TARGET_POINT: Record<string, V3> = {
  computer: [PLAYER_DESK.x, 1.15, PLAYER_DESK.z - 0.15],
  door: [-13.9, 1.4, 8.45],
  adaDesk: [ADA_DESK.x, 1.1, ADA_DESK.z],
  rack: [RACK_B.x, 1.6, -10.2],
  cabinet: [CABINET.x, 1.2, -11.1],
}

// Finestre (per serrande, veneziane, vetri): centro e orientamento
export const WINDOWS: { x: number; z: number; rotY: number }[] = [
  { x: 10, z: 11, rotY: 0 }, { x: 5.5, z: 11, rotY: 0 }, { x: -5.5, z: 11, rotY: 0 }, { x: -10, z: 11, rotY: 0 },
  { x: -14, z: 5, rotY: Math.PI / 2 }, { x: -14, z: -1, rotY: Math.PI / 2 }, { x: -14, z: -7, rotY: Math.PI / 2 }, { x: -14, z: -10, rotY: Math.PI / 2 },
]
export const WINDOW_SILL = 0.8
export const WINDOW_HEAD = 2.9

// Collisioni fisse dell'arredo (min x, max x, min z, max z)
export const FURNITURE: [number, number, number, number][] = [
  [-4.05, 2.05, 3.5, 5.5], // banco A
  [-4.05, 2.05, -0.5, 1.5], // banco B
  [-11.98, -11.02, -2, 0], // scrivania di Ada
  [-10.7, -8.3, -8.6, -7.4], // tavolo riunioni
  [0.5, 7.5, -11.1, -10.1], // fila rack nord
  [0.5, 7.5, -6.9, -5.9], // fila rack sud
  [-3.55, -2.45, -11.8, -11.0], // armadio SANDBOX-7
  [13.3, 14, 3.6, 7.0], // cucinetta + frigo
  [13.2, 14, 7.2, 7.9], // distributore
  [-9.4, -8.6, 7.1, 7.9], // stampante
  [-13.8, -11.4, 2.05, 2.7], // cassettiere archivio
  [10.5, 11.5, -2, 0], // scrivania di Teo
  [13.0, 14, -9, -7], // condizionatore della sala server
  [-5, -4.3, -8.5, -6.5], // cassettiere del locale tecnico
  [-13.5, -12.5, -4, -3.3], // cassettiera di Ada
]
