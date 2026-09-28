import { CreatureView } from '../components/CreatureView'
import { BIOME_LABELS } from '../location/geo'
import { rarityFromScore } from '../model/creatureGen'
import type { Creature } from '../model/types'
import { useGame } from '../state/GameState'

interface CreatureDetailScreenProps {
  creature: Creature
  onBack: () => void
}

export function CreatureDetailScreen({ creature, onBack }: CreatureDetailScreenProps) {
  const { toggleFavorite } = useGame()
  const g = creature.genome
  const rarity = rarityFromScore(g.rarityScore)

  return (
    <div className="screen detail-screen">
      <button type="button" className="btn ghost back" onClick={onBack}>
        ← Collection
      </button>
      <div className="showcase">
        <CreatureView genome={g} mutation={creature.mutation} size={160} />
        <div>
          <p className="eyebrow">{g.bodyArchetype} · Gen {creature.generation}</p>
          <h1>{creature.nickname ?? 'Unnamed individual'}</h1>
          <p className="muted">
            {BIOME_LABELS[creature.origin.biome]} · {creature.origin.placeLabel}
          </p>
        </div>
      </div>
      <dl className="stat-grid">
        <div>
          <dt>Level</dt>
          <dd>{creature.level}</dd>
        </div>
        <div>
          <dt>Rarity</dt>
          <dd>{rarity}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{g.combatRole}</dd>
        </div>
        <div>
          <dt>Affinities</dt>
          <dd>
            {g.primaryAffinity} / {g.secondaryAffinity}
          </dd>
        </div>
        <div>
          <dt>Passive</dt>
          <dd>{g.passiveTrait}</dd>
        </div>
        <div>
          <dt>Mutation</dt>
          <dd>{creature.mutation === 'none' ? 'None' : creature.mutation}</dd>
        </div>
        <div>
          <dt>Pattern</dt>
          <dd>{g.pattern}</dd>
        </div>
        <div>
          <dt>Appendage</dt>
          <dd>{g.appendage}</dd>
        </div>
        <div>
          <dt>Tendencies</dt>
          <dd>
            PWR {g.statTendencies.power} · RES {g.statTendencies.resilience} · SPD {g.statTendencies.speed}
          </dd>
        </div>
      </dl>
      <button type="button" className="btn secondary" onClick={() => toggleFavorite(creature.id)}>
        {creature.favorite ? 'Unfavorite' : 'Favorite (protected from future trade)'}
      </button>
    </div>
  )
}
