import { useState } from 'react'
import type { BodyArchetype } from '../model/types'
import { useGame } from '../state/GameState'

const STARTERS: { id: BodyArchetype; label: string; hint: string }[] = [
  { id: 'quadruped', label: 'Quadruped', hint: 'Balanced ground explorer' },
  { id: 'biped', label: 'Biped', hint: 'Urban-friendly silhouette' },
  { id: 'floating', label: 'Floating', hint: 'Light and unusual' },
]

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
          Discover individually unique creatures tied to places you explore. Your collection stays on this device.
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
        <p className="section-label">Starter body archetype</p>
        <div className="chip-row">
          {STARTERS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`chip ${starter === s.id ? 'chip-active' : ''}`}
              onClick={() => setStarter(s.id)}
            >
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
        background. Exact coordinates are never saved on creatures.
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
