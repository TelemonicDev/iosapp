import { useMemo, useState } from 'react'
import { CreatureView } from '../components/CreatureView'
import { rarityFromScore } from '../model/creatureGen'
import type { BodyArchetype, Creature } from '../model/types'
import { useGame } from '../state/GameState'
import { CreatureDetailScreen } from './CreatureDetailScreen'

type SortKey = 'recent' | 'rarity' | 'archetype'

export function CollectionScreen() {
  const { save } = useGame()
  const [sort, setSort] = useState<SortKey>('recent')
  const [filterArchetype, setFilterArchetype] = useState<BodyArchetype | 'all'>('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [selected, setSelected] = useState<Creature | null>(null)

  const sorted = useMemo(() => {
    let list = [...save.creatures]
    if (favoritesOnly) list = list.filter((c) => c.favorite)
    if (filterArchetype !== 'all') list = list.filter((c) => c.genome.bodyArchetype === filterArchetype)
    list.sort((a, b) => {
      if (sort === 'recent') return b.origin.discoveredAt - a.origin.discoveredAt
      if (sort === 'rarity') return b.genome.rarityScore - a.genome.rarityScore
      return a.genome.bodyArchetype.localeCompare(b.genome.bodyArchetype)
    })
    return list
  }, [save.creatures, sort, filterArchetype, favoritesOnly])

  if (selected) {
    return <CreatureDetailScreen creature={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Collection</h1>
        <p className="muted">{save.creatures.length} creatures</p>
      </header>
      <div className="filter-row">
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="recent">Recent</option>
          <option value="rarity">Rarity</option>
          <option value="archetype">Archetype</option>
        </select>
        <select value={filterArchetype} onChange={(e) => setFilterArchetype(e.target.value as BodyArchetype | 'all')}>
          <option value="all">All archetypes</option>
          <option value="quadruped">Quadruped</option>
          <option value="biped">Biped</option>
          <option value="serpentine">Serpentine</option>
          <option value="floating">Floating</option>
          <option value="armored">Armored</option>
        </select>
        <label className="check">
          <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
          Favorites
        </label>
      </div>
      <ul className="creature-grid">
        {sorted.length === 0 && <li className="empty">Capture encounters from the Explore tab.</li>}
        {sorted.map((c) => (
          <li key={c.id}>
            <button type="button" className="creature-card" onClick={() => setSelected(c)}>
              <CreatureView genome={c.genome} mutation={c.mutation} size={88} />
              <span>{c.genome.bodyArchetype}</span>
              <span className="muted">Lv {c.level} · {rarityFromScore(c.genome.rarityScore)}</span>
              {c.favorite && <span className="star">★</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
