import { captureRateForGenome } from '../src/model/creatureGen'
import { encounterWindowId, generateEncounters, homeRangeCenter } from '../src/model/encounters'

const c = homeRangeCenter()
const w = encounterWindowId()
const enc = generateEncounters({
  cellKey: 'test',
  windowId: w,
  biome: 'mixed_neighborhood',
  placeLabel: 'Home',
  centerLat: c.lat,
  centerLng: c.lng,
  biasArchetype: 'quadruped',
})

if (enc.length !== 4) throw new Error('expected 4 encounters')
if (new Set(enc.map((e) => e.seed)).size !== 4) throw new Error('seeds not unique')

const enc2 = generateEncounters({
  cellKey: 'test',
  windowId: w,
  biome: 'mixed_neighborhood',
  placeLabel: 'Home',
  centerLat: c.lat,
  centerLng: c.lng,
})
if (enc[0].id !== enc2[0].id) throw new Error('encounters not stable')

for (const e of enc) {
  const rate = captureRateForGenome(e.genome)
  if (rate < 0.35 || rate > 1) throw new Error('bad capture rate')
}

console.log('phase1 verify ok')
