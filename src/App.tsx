import { Suspense, lazy } from 'react'
import { useGame } from './store/game'
import TitleScreen from './screens/TitleScreen'
import Intro from './screens/Intro'
import DemoEnd from './screens/DemoEnd'
import Hud from './ui/Hud'
import PauseMenu from './ui/PauseMenu'
import Phone from './ui/Phone'
import { GameNotebook } from './ui/Notebook'
import { NoteModal, Toast } from './ui/Overlays'
import { useGlobalKeys } from './ui/useGlobalKeys'
import Desktop from './os/Desktop'
import Loading from './ui/Loading'
import Notification from './ui/Notification'
import VideoCall, { TimeSkip } from './ui/VideoCall'

const World = lazy(() => import('./world/World'))

export default function App() {
  const screen = useGame((s) => s.screen)
  const view = useGame((s) => s.view)
  const paused = useGame((s) => s.paused)
  const overlay = useGame((s) => s.phoneOpen || s.notebookOpen || !!s.call || !!s.timeSkip)
  const bigText = useGame((s) => s.settings.bigText)
  const inGame = screen === 'game'
  const callOrSkip = useGame((s) => !!s.call || !!s.timeSkip)
  useGlobalKeys()

  return (
    <div className={`relative h-full w-full overflow-clip ${bigText ? 'big-text' : ''}`}>
      <Suspense fallback={<div className="absolute inset-0 bg-ink" />}>
        <World mode={screen === 'title' ? 'title' : inGame && view === 'world' && !paused && !overlay ? 'play' : 'idle'} />
      </Suspense>

      {screen === 'title' && <TitleScreen />}
      {screen === 'intro' && <Intro />}
      {inGame && view === 'world' && <Hud />}
      {inGame && view === 'desktop' && <Desktop />}
      {inGame && !callOrSkip && <Phone />}
      {inGame && <Notification />}
      {inGame && <GameNotebook />}
      {inGame && <VideoCall />}
      {inGame && <TimeSkip />}
      {inGame && paused && <PauseMenu />}
      {screen === 'demoEnd' && <DemoEnd />}

      <Loading />
      <NoteModal />
      <Toast />
    </div>
  )
}
