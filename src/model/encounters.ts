import {
  ENCOUNTER_OFFSET_METERS,
  ENCOUNTERS_PER_LOOK,
  ENCOUNTER_WINDOW_MS,
} from '../config/balance'
import { offsetLatLng } from '../location/geo'
import { hashSeed, mulberry32 } from '../util/rng'
import { captureRateForGenome, generateGenome } from './creatureGen'
import type { BiomeId, BodyArchetype, EncounterPreview } from './types'

export function encounterWindowId(now = Date.now()): number {
  return Math.floor(now / ENCOUNTER_WINDOW_MS)
}

const REASONS: Record<BiomeId, string[]> = {
  forest_park: ['Shade and leaf litter drew this wanderer.', 'Park trails often host quiet visitors.'],
  coast_water: ['Moist air and open sky attracted this individual.', 'Water-adjacent paths shift encounter pools.'],
  urban: ['Built edges create niche habitats.', 'Urban green pockets host adaptable types.'],
  grassland: ['Open ground suits grazing silhouettes.', 'Wind-swept fields change daily sightings.'],
  mixed_neighborhood: ['A common local mix—easy to find near home.', 'Neighborhood variety keeps discovery accessible.'],
}

export function generateEncounters(options: {
  cellKey: string
  windowId: number
  biome: BiomeId
  placeLabel: string
  centerLat: number
  centerLng: number
  biasArchetype?: BodyArchetype
}): EncounterPreview[] {
  const expiresAt = (options.windowId + 1) * ENCOUNTER_WINDOW_MS
  const reasons = REASONS[options.biome]
  const list: EncounterPreview[] = []

  for (let i = 0; i < ENCOUNTERS_PER_LOOK; i++) {
    const seed = hashSeed([options.cellKey, options.windowId, i, options.biome])
    const rng = mulberry32(seed)
    const angle = rng() * Math.PI * 2
    const dist = ENCOUNTER_OFFSET_METERS * (0.5 + rng())
    const offset = offsetLatLng(
      options.centerLat,
      options.centerLng,
      Math.cos(angle) * dist,
      Math.sin(angle) * dist,
    )
    const genome = generateGenome(seed, options.biome, {
      biasArchetype: i === 0 ? options.biasArchetype : undefined,
    })
    list.push({
      id: `enc-${seed.toString(16)}`,
      seed,
      genome,
      biome: options.biome,
      placeLabel: options.placeLabel,
      reason: reasons[i % reasons.length]!,
      expiresAt,
      captureRate: captureRateForGenome(genome),
      lat: offset.lat,
      lng: offset.lng,
      captured: false,
    })
  }

  return list
}

export function homeRangeCenter(): { lat: number; lng: number } {
  return { lat: 40.7128, lng: -74.006 }
}
