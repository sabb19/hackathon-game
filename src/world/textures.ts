import * as THREE from 'three'

// Texture generate a runtime: niente asset esterni per la demo.

export function concreteTexture(base = '#5d6064', repeat = 2) {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  g.fillStyle = base
  g.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 2600; i++) {
    const v = Math.random() * 40 - 20
    g.fillStyle = `rgba(${128 + v},${128 + v},${130 + v},0.06)`
    const r = Math.random() * 18 + 2
    g.beginPath()
    g.arc(Math.random() * 512, Math.random() * 512, r, 0, Math.PI * 2)
    g.fill()
  }
  // fori dei casseri, tipici del cemento a vista
  g.fillStyle = 'rgba(0,0,0,0.25)'
  for (let x = 64; x < 512; x += 128) for (let y = 64; y < 512; y += 128) {
    g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill()
  }
  g.strokeStyle = 'rgba(0,0,0,0.12)'
  g.lineWidth = 2
  g.strokeRect(0, 0, 512, 512)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

interface TextOpts {
  w?: number
  h?: number
  bg?: string
  color?: string
  font?: string
  align?: CanvasTextAlign
  lineHeight?: number
  pad?: number
}

export function textTexture(lines: string[], o: TextOpts = {}) {
  const { w = 512, h = 256, bg = 'transparent', color = '#E8DFC9', font = '600 64px Big Shoulders Display, sans-serif', align = 'left', lineHeight = 1.05, pad = 24 } = o
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  if (bg !== 'transparent') {
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
  }
  g.fillStyle = color
  g.font = font
  g.textAlign = align
  g.textBaseline = 'top'
  const size = parseInt(font.match(/(\d+)px/)?.[1] ?? '32', 10)
  const x = align === 'center' ? w / 2 : align === 'right' ? w - pad : pad
  lines.forEach((l, i) => g.fillText(l, x, pad + i * size * lineHeight))
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat: [number, number] = [1, 1], srgb = true) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(...repeat)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

// Moquette a quadrotte 50x50 cm, posate a verso alterno (come negli uffici veri). 1 ripetizione = 2x2 quadrotte.
export function carpetTexture(rx: number, ry: number) {
  return canvasTex(512, 512, (g) => {
    for (let ty = 0; ty < 2; ty++)
      for (let tx = 0; tx < 2; tx++) {
        const x0 = tx * 256, y0 = ty * 256
        g.fillStyle = (tx + ty) % 2 ? '#3d434b' : '#41474f'
        g.fillRect(x0, y0, 256, 256)
        // fibra: righe sottili alternate in orizzontale/verticale
        g.globalAlpha = 0.18
        for (let i = 0; i < 256; i += 3) {
          g.fillStyle = Math.random() > 0.5 ? '#2c3137' : '#575e67'
          if ((tx + ty) % 2) g.fillRect(x0, y0 + i, 256, 1)
          else g.fillRect(x0 + i, y0, 1, 256)
        }
        g.globalAlpha = 1
        for (let i = 0; i < 900; i++) {
          g.fillStyle = `rgba(${rnd(20, 90)},${rnd(25, 95)},${rnd(30, 105)},0.35)`
          g.fillRect(x0 + rnd(0, 256), y0 + rnd(0, 256), 2, 2)
        }
        g.strokeStyle = 'rgba(0,0,0,0.35)'
        g.lineWidth = 2
        g.strokeRect(x0 + 1, y0 + 1, 254, 254)
      }
  }, [rx, ry])
}

// Intonaco tinteggiato: grigio caldo con leggere irregolarità.
export function plasterTexture(rx: number, ry: number) {
  return canvasTex(512, 512, (g) => {
    g.fillStyle = '#8b8780'
    g.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 3000; i++) {
      const v = rnd(-14, 14)
      g.fillStyle = `rgba(${139 + v},${135 + v},${128 + v},0.08)`
      g.beginPath()
      g.arc(rnd(0, 512), rnd(0, 512), rnd(2, 22), 0, Math.PI * 2)
      g.fill()
    }
  }, [rx, ry])
}

// Controsoffitto a pannelli 60x60 cm con profili metallici. 1 ripetizione = 1 pannello.
export function ceilingTexture(rx: number, ry: number) {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = '#9a9a96'
    g.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 2500; i++) {
      g.fillStyle = `rgba(60,60,58,${rnd(0.05, 0.18)})`
      g.fillRect(rnd(0, 256), rnd(0, 256), 1.5, 1.5)
    }
    g.fillStyle = '#c9c9c4'
    g.fillRect(0, 0, 256, 6)
    g.fillRect(0, 0, 6, 256)
    g.fillStyle = 'rgba(0,0,0,0.25)'
    g.fillRect(0, 6, 256, 2)
    g.fillRect(6, 0, 2, 256)
  }, [rx, ry])
}

// Città notturna oltre le finestre: palazzi in controluce con finestre accese, cielo con foschia arancione.
export function cityTexture() {
  return canvasTex(2048, 512, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 512)
    sky.addColorStop(0, '#0b1424')
    sky.addColorStop(0.6, '#1c2a40')
    sky.addColorStop(1, '#3a3442')
    g.fillStyle = sky
    g.fillRect(0, 0, 2048, 512)
    for (let layer = 0; layer < 3; layer++) {
      let x = 0
      const base = 512
      const dark = ['#141b26', '#0f141c', '#0a0e14'][layer]
      while (x < 2048) {
        const w = rnd(60, 180) * (1 - layer * 0.15)
        const h = rnd(120, 360) * (0.6 + layer * 0.25)
        g.fillStyle = dark
        g.fillRect(x, base - h, w, h)
        for (let wy = base - h + 12; wy < base - 10; wy += 14)
          for (let wx = x + 8; wx < x + w - 8; wx += 12)
            if (Math.random() < 0.12 - layer * 0.02) {
              g.fillStyle = Math.random() > 0.3 ? 'rgba(255,214,150,0.85)' : 'rgba(170,200,255,0.7)'
              g.fillRect(wx, wy, 5, 7)
            }
        x += w + rnd(4, 30)
      }
    }
  }, [1, 1])
}


// Bacheca di sughero con avvisi appuntati. Leggibile da vicino: è un oggetto, non un'interfaccia.
export function noticeBoardTexture() {
  return canvasTex(1024, 768, (g) => {
    g.fillStyle = '#a87b52'
    g.fillRect(0, 0, 1024, 768)
    for (let i = 0; i < 6000; i++) {
      g.fillStyle = `rgba(${rnd(60, 120)},${rnd(40, 80)},${rnd(20, 50)},0.25)`
      g.fillRect(rnd(0, 1024), rnd(0, 768), 2, 2)
    }
    const note = (x: number, y: number, w: number, h: number, rot: number, bg: string, lines: [string, string][], pin = '#b4442e') => {
      g.save()
      g.translate(x + w / 2, y + h / 2)
      g.rotate(rot)
      g.fillStyle = 'rgba(0,0,0,0.25)'
      g.fillRect(-w / 2 + 5, -h / 2 + 6, w, h)
      g.fillStyle = bg
      g.fillRect(-w / 2, -h / 2, w, h)
      let yy = -h / 2 + 18
      for (const [font, text] of lines) {
        g.font = font
        g.fillStyle = '#1a1b1d'
        const size = parseInt(font.match(/(\d+)px/)?.[1] ?? '20', 10)
        g.fillText(text, -w / 2 + 16, yy + size)
        yy += size * 1.25
      }
      g.fillStyle = pin
      g.beginPath()
      g.arc(0, -h / 2 + 8, 9, 0, Math.PI * 2)
      g.fill()
      g.restore()
    }
    note(40, 40, 400, 330, -0.03, '#f2efe6', [
      ['800 34px "Big Shoulders Display"', 'TURNI DI NOTTE'],
      ['500 24px "Inter Tight"', 'lun  Bruno → malattia'],
      ['500 24px "Inter Tight"', 'mar  Bruno → malattia'],
      ['500 24px "Inter Tight"', 'mer  NUOVO TECNICO'],
      ['500 24px "Inter Tight"', 'gio  NUOVO TECNICO'],
      ['500 24px "Inter Tight"', 'ven  NUOVO TECNICO'],
      ['700 30px Caveat', 'benvenuto/a! — Teo'],
    ])
    note(500, 50, 470, 250, 0.04, '#fff4b0', [
      ['800 32px "Big Shoulders Display"', 'AVVISO IT'],
      ['500 23px "Inter Tight"', 'Le password NON si scrivono'],
      ['500 23px "Inter Tight"', 'sui post-it. Né sotto la tastiera.'],
      ['500 23px "Inter Tight"', 'Né sul retro del badge.'],
      ['700 28px Caveat', 'questo vale anche per te, Teo — A.'],
    ], '#2b4a6b')
    note(60, 430, 420, 290, 0.05, '#e3ecf2', [
      ['800 30px "Big Shoulders Display"', 'DISMISSIONE MATERIALE'],
      ['500 22px "Inter Tight"', 'SANDBOX-7 (esercitazioni)'],
      ['500 22px "Inter Tight"', 'stato: DISMESSO — 03/2023'],
      ['500 22px "Inter Tight"', 'responsabile: A. Ferri'],
      ['700 28px Caveat', 'ritiro rimandato… — A.F.'],
    ], '#3d5a3a')
    note(540, 360, 420, 360, -0.04, '#f2efe6', [
      ['800 32px "Big Shoulders Display"', 'PIZZA DEL VENERDÌ'],
      ['500 23px "Inter Tight"', 'Margherita ........ Bruno, Teo'],
      ['500 23px "Inter Tight"', 'Diavola ............ Ada'],
      ['500 23px "Inter Tight"', 'Quattro formaggi ... ?'],
      ['700 28px Caveat', 'chi ha preso la mia tazza?'],
    ])
  })
}

// Laminato effetto rovere: venature lunghe e chiare, leggero rumore (piani delle scrivanie)
let woodCache: THREE.CanvasTexture | null = null
export function woodTexture() {
  if (woodCache) return woodCache
  woodCache = canvasTex(1024, 512, (g) => {
    g.fillStyle = '#b8946a'
    g.fillRect(0, 0, 1024, 512)
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 140; i++) {
      const y = rnd() * 512
      const a = 0.04 + rnd() * 0.09
      g.strokeStyle = rnd() > 0.5 ? `rgba(120,86,52,${a})` : `rgba(226,198,160,${a})`
      g.lineWidth = 1 + rnd() * 3
      g.beginPath()
      g.moveTo(0, y)
      for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x * 0.004 + i) * 6 + (rnd() - 0.5) * 3)
      g.stroke()
    }
    for (let i = 0; i < 6000; i++) {
      g.fillStyle = `rgba(90,60,30,${rnd() * 0.05})`
      g.fillRect(rnd() * 1024, rnd() * 512, 2, 1)
    }
  }, [1, 1])
  return woodCache
}
