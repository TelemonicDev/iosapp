import { lookFromGenome } from '../src/model/critterLook'
import { captureRateForGenome, generateGenome } from '../src/model/creatureGen'
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
  if (!/^#[0-9a-f]{6}$/.test(e.genome.palette.primary)) throw new Error('palette not hex')
}

const g = generateGenome(12345, 'forest_park', { forceArchetype: 'serpentine' })
const again = generateGenome(12345, 'forest_park', { forceArchetype: 'serpentine' })
if (g.bodyArchetype !== 'serpentine') throw new Error('force archetype failed')
if (JSON.stringify(g) !== JSON.stringify(again)) throw new Error('genome not stable')
const shifted = { ...g, palette: { ...g.palette, accent: '#ffffff' }, rarityScore: g.rarityScore + 3 }
if (JSON.stringify(lookFromGenome(g)) !== JSON.stringify(lookFromGenome(shifted))) {
  throw new Error('color mutation changed critter silhouette')
}

console.log('phase1 verify ok')
