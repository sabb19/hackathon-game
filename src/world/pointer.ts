// Separato da World.tsx così i menu non importano tutto Three.js.
export const lockPointer = () => {
  const c = document.querySelector('canvas')
  try {
    const r = c?.requestPointerLock() as unknown as Promise<void> | undefined
    r?.catch?.(() => {})
  } catch {
    /* il browser può rifiutare subito dopo un Esc: l'overlay "clicca per riprendere" copre il caso */
  }
}
