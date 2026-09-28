import { useState } from 'react'
import { CritterView } from '../components/CritterView'
import { generateGenome } from '../model/creatureGen'
import type { BodyArchetype } from '../model/types'
import { useGame } from '../state/GameState'

const STARTERS: { id: BodyArchetype; label: string; hint: string; biome: 'grassland' | 'urban' | 'coast_water' }[] = [
  { id: 'quadruped', label: 'Quadruped', hint: 'Four-legged wanderer', biome: 'grassland' },
  { id: 'biped', label: 'Biped', hint: 'Upright and curious', biome: 'urban' },
  { id: 'floating', label: 'Floating', hint: 'Drifts just off the ground', biome: 'coast_water' },
]

const STARTER_PREVIEWS = Object.fromEntries(
  STARTERS.map((s, i) => [s.id, generateGenome(80 + i * 17, s.biome, { forceArchetype: s.id })]),
) as Record<BodyArchetype, ReturnType<typeof generateGenome>>

export function OnboardingScreen() {
  const { createProfile } = useGame()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [starter, setStarter] = useState<BodyArchetype>('quadruped')

  if (step === 0) {
    return (
      <div className="screen onboarding">
        <h1>Welcome, explorer</h1>
        <p className="lede">
          Discover individually unique critters tied to places you explore. Your collection stays on this device.
        </p>
        <label className="field">
          Display name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={24}
            autoComplete="nickname"
          />
        </label>
        <p className="section-label">Starter form</p>
        <div className="chip-row">
          {STARTERS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`chip ${starter === s.id ? 'chip-active' : ''}`}
              onClick={() => setStarter(s.id)}
            >
              <span className="chip-art">
                <CritterView genome={STARTER_PREVIEWS[s.id]} size={84} />
              </span>
              <strong>{s.label}</strong>
              <span>{s.hint}</span>
            </button>
          ))}
        </div>
        <button type="button" className="btn primary" onClick={() => setStep(1)}>
          Continue
        </button>
      </div>
    )
  }

  return (
    <div className="screen onboarding">
      <h1>Location (optional)</h1>
      <p className="lede">
        When you choose to look around, the app uses your position once to find nearby encounters. Nothing tracks in the
        background. Exact coordinates are never saved on critters.
      </p>
      <ul className="safety-list">
        <li>Walk only in safe public spaces.</li>
        <li>Do not play while driving.</li>
        <li>Home range works fully without location.</li>
      </ul>
      <button
        type="button"
        className="btn primary"
        onClick={() => createProfile(name, starter, true)}
      >
        Got it — start playing
      </button>
      <button type="button" className="btn ghost" onClick={() => createProfile(name, starter, false)}>
        Skip explanation
      </button>
    </div>
  )
}
