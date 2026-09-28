import { BIOME_LABELS } from '../location/geo'
import { useGame } from '../state/GameState'

export function JournalScreen() {
  const { save } = useGame()
  const j = save.journal

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Journal</h1>
        <p className="muted">Discovery milestones on this device</p>
      </header>
      <section className="journal-block">
        <h2>Stats</h2>
        <p>Total captures: {j.capturesTotal}</p>
        <p>Mutations logged: {j.mutationsLogged}</p>
      </section>
      <section className="journal-block">
        <h2>Critter forms seen</h2>
        {j.archetypesSeen.length === 0 ? (
          <p className="muted">None yet.</p>
        ) : (
          <ul className="tag-list">
            {j.archetypesSeen.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="journal-block">
        <h2>Biomes visited</h2>
        {j.biomesVisited.length === 0 ? (
          <p className="muted">None yet.</p>
        ) : (
          <ul className="tag-list">
            {j.biomesVisited.map((b) => (
              <li key={b}>{BIOME_LABELS[b]}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
