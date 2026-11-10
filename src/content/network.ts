// Dati della rete di Halden Netcare usati da Laboratorio e Monitor.

export type DevKind = 'pc' | 'printer' | 'switch' | 'router' | 'server'

export interface LabDevice {
  id: string
  kind: DevKind
  label: string
  ip?: string
  net?: 1 | 2 // 192.168.1.x uffici · 192.168.2.x sala server
  x: number
  y: number
}

export const LAB_DEVICES: LabDevice[] = [
  { id: 'pc', kind: 'pc', label: 'Il tuo PC', ip: '192.168.1.15', net: 1, x: 110, y: 110 },
  { id: 'printer', kind: 'printer', label: 'Stampante uffici', ip: '192.168.1.30', net: 1, x: 110, y: 330 },
  { id: 'sw1', kind: 'switch', label: 'Switch uffici', x: 310, y: 220 },
  { id: 'router', kind: 'router', label: 'Router (il ponte)', x: 500, y: 220 },
  { id: 'sw2', kind: 'switch', label: 'Switch sala server', x: 690, y: 220 },
  { id: 'security', kind: 'server', label: 'SECURITY-01', ip: '192.168.2.10', net: 2, x: 860, y: 110 },
]

// Il collegamento router ↔ switch sala server esiste in software ma il cavo è staccato nel rack.
export const PHYSICAL_LINK = 'router|sw2'

// Dispositivi attivi visti dal Monitor (M2)
export interface SeenDevice {
  name: string
  ip: string
  mac: string
  where: string
}
export const SEEN: SeenDevice[] = [
  { name: 'WS-NOTTE', ip: '192.168.1.15', mac: '3C:52:82:1A:07:E4', where: 'Switch uffici · porta 3' },
  { name: 'PRINTER-UFF', ip: '192.168.1.30', mac: '9C:93:4E:01:5D:22', where: 'Switch uffici · porta 9' },
  { name: 'ROUTER-PT', ip: '192.168.1.1', mac: '00:1B:54:C2:88:10', where: 'Router di confine' },
  { name: 'SECURITY-01', ip: '192.168.2.10', mac: '00:25:B5:00:0A:31', where: 'Switch sala server · porta 1' },
  { name: 'BACKUP-NAS', ip: '192.168.2.20', mac: '00:11:32:7F:3E:90', where: 'Switch sala server · porta 2' },
  { name: 'PRINTER-2', ip: '192.168.2.77', mac: '00:0A:F7:5E:11:07', where: 'Switch sala server · porta 7' },
]

export interface InvRow {
  name: string
  ip: string
  mac: string
  note: string
}
export const INVENTORY: InvRow[] = [
  { name: 'WS-NOTTE', ip: '192.168.1.15', mac: '3C:52:82:1A:07:E4', note: 'Postazione del turno notturno. Il post-it NON è una procedura.' },
  { name: 'WS-BRUNO', ip: '192.168.1.16', mac: '3C:52:82:1A:09:B1', note: 'Commerciale. Spenta di notte.' },
  { name: 'PRINTER-UFF', ip: '192.168.1.30', mac: '9C:93:4E:01:5D:22', note: 'Inceppa il martedì. Solo il martedì.' },
  { name: 'PRINTER-2', ip: '192.168.1.40', mac: '9C:93:4E:22:B0:15', note: 'Corridoio piano 1. In riparazione dal 12/09.' },
  { name: 'ROUTER-PT', ip: '192.168.1.1', mac: '00:1B:54:C2:88:10', note: 'Router principale. (Ada voleva chiamarlo GANDALF.)' },
  { name: 'SECURITY-01', ip: '192.168.2.10', mac: '00:25:B5:00:0A:31', note: 'Gestisce allarmi, badge e lockdown.' },
  { name: 'BACKUP-NAS', ip: '192.168.2.20', mac: '00:11:32:7F:3E:90', note: 'Backup notturni ore 02:00.' },
  { name: 'SANDBOX-7', ip: '—', mac: '00:0A:F7:5E:11:07', note: 'DISMESSO 2023. Ambiente di esercitazione (A. Ferri).' },
]
