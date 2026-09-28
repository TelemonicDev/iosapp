import { useState } from 'react'
import { CritterView } from '../components/CritterView'
import { rarityFromScore } from '../model/creatureGen'
import type { EncounterPreview } from '../model/types'
import { useGame } from '../state/GameState'

interface EncounterPanelProps {
  encounter: EncounterPreview
  onClose: () => void
  onCaptured?: () => void
}

export function EncounterPanel({ encounter, onClose, onCaptured }: EncounterPanelProps) {
  const { attemptCapture, save } = useGame()
  const [message, setMessage] = useState<string | null>(null)
  const rarity = rarityFromScore(encounter.genome.rarityScore)
  const expiresIn = Math.max(0, encounter.expiresAt - Date.now())
  const mins = Math.ceil(expiresIn / 60000)

  function handleCapture() {
    const result = attemptCapture(encounter.id)
    setMessage(result.message)
    if (result.ok) onCaptured?.()
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="panel encounter-panel">
        <button type="button" className="icon-btn close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="encounter-header">
          <CritterView genome={encounter.genome} size={148} />
          <div>
            <p className="eyebrow">{encounter.biome.replace(/_/g, ' ')}</p>
            <h2>Wild critter</h2>
            <p className="muted">{encounter.reason}</p>
          </div>
        </div>
        <dl className="stat-grid">
          <div>
            <dt>Role</dt>
            <dd>{encounter.genome.combatRole}</dd>
          </div>
          <div>
            <dt>Affinities</dt>
            <dd>
              {encounter.genome.primaryAffinity} / {encounter.genome.secondaryAffinity}
            </dd>
          </div>
          <div>
            <dt>Rarity</dt>
            <dd>{rarity}</dd>
          </div>
          <div>
            <dt>Capture chance</dt>
            <dd>{Math.round(encounter.captureRate * 100)}%</dd>
          </div>
          <div>
            <dt>Expires</dt>
            <dd>{mins} min</dd>
          </div>
          <div>
            <dt>Origin area</dt>
            <dd>{encounter.placeLabel}</dd>
          </div>
        </dl>
        {message && <p className={`banner ${message.startsWith('Captured') ? 'success' : 'warn'}`}>{message}</p>}
        <button
          type="button"
          className="btn primary"
          disabled={encounter.captured || save.captureCharges <= 0}
          onClick={handleCapture}
        >
          {encounter.captured ? 'Captured' : `Capture (1 charge · ${save.captureCharges} left)`}
        </button>
      </div>
    </div>
  )
}
