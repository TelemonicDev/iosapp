import { useState } from 'react'
import { BottomNav } from './components/BottomNav'
import type { TabId } from './model/types'
import { CollectionScreen } from './screens/CollectionScreen'
import { JournalScreen } from './screens/JournalScreen'
import { MapScreen } from './screens/MapScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { GameProvider, useGame } from './state/GameState'

function MainApp() {
  const { save } = useGame()
  const [tab, setTab] = useState<TabId>('map')

  if (!save.profile?.onboardingComplete) {
    return <OnboardingScreen />
  }

  return (
    <div className="app-shell">
      <main className={tab === 'map' ? 'app-main is-play' : 'app-main'}>
        {tab === 'map' && <MapScreen />}
        {tab === 'collection' && <CollectionScreen />}
        {tab === 'journal' && <JournalScreen />}
        {tab === 'profile' && <ProfileScreen />}
      </main>
      <BottomNav tab={tab} onChange={setTab} />
    </div>
  )
}

export default function App() {
  return (
    <GameProvider>
      <MainApp />
    </GameProvider>
  )
}
