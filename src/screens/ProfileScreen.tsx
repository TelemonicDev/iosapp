import { MAX_CAPTURE_CHARGES } from '../config/balance'
import { BIOME_LABELS } from '../location/geo'
import { useGame } from '../state/GameState'

function formatMs(ms: number): string {
  const m = Math.ceil(ms / 60000)
  return `${m} min`
}

export function ProfileScreen() {
  const { save, msUntilNextCharge } = useGame()
  const p = save.profile
  if (!p) return null

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Profile</h1>
        <p className="muted">Local save · no account</p>
      </header>
      <div className="profile-card">
        <h2>{p.displayName}</h2>
        <p>Starter archetype: {p.starterArchetype}</p>
        <p>Home biome: {BIOME_LABELS[p.homeBiome]}</p>
        <p>Creatures: {save.creatures.length}</p>
        <p>Biomes in journal: {save.journal.biomesVisited.length}</p>
      </div>
      <section className="journal-block">
        <h2>Capture supplies</h2>
        <p>
          Charges: {save.captureCharges} (refill in{' '}
          {save.captureCharges >= MAX_CAPTURE_CHARGES ? 'full' : formatMs(msUntilNextCharge)})
        </p>
      </section>
      <p className="muted fine-print">Player id: {p.id.slice(0, 8)}…</p>
    </div>
  )
}
