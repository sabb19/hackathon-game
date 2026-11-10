import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Solo in sviluppo: accesso allo store dalla console per i test.
if (import.meta.env.DEV) import('./store/game').then((m) => ((window as unknown as Record<string, unknown>).__game = m.useGame))
