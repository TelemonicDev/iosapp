import {
  BASE_CAPTURE_RATE,
  MUTATION_CHANCE,
  RARITY_CAPTURE_PENALTY,
} from '../config/balance'
import { mulberry32, pickWeighted } from '../util/rng'
import { generatePalette } from './critterLook'
import type {
  Affinity,
  BiomeId,
  BodyArchetype,
  CombatRole,
  Genome,
  MutationKind,
  PatternId,
  RarityTier,
} from './types'

const PASSIVE_TRAITS = [
  'Steady footing',
  'Keen senses',
  'Thick hide',
  'Quick reflexes',
  'Calm focus',
  'Resourceful',
  'Lucky spark',
]

const BIOME_ARCHETYPES: Record<BiomeId, { item: BodyArchetype; weight: number }[]> = {
  forest_park: [
    { item: 'quadruped', weight: 3 },
    { item: 'serpentine', weight: 2 },
    { item: 'biped', weight: 1 },
  ],
  coast_water: [
    { item: 'serpentine', weight: 2 },
    { item: 'floating', weight: 3 },
    { item: 'quadruped', weight: 1 },
  ],
  urban: [
    { item: 'biped', weight: 3 },
    { item: 'armored', weight: 2 },
    { item: 'quadruped', weight: 1 },
  ],
  grassland: [
    { item: 'quadruped', weight: 3 },
    { item: 'biped', weight: 2 },
    { item: 'armored', weight: 1 },
  ],
  mixed_neighborhood: [
    { item: 'quadruped', weight: 2 },
    { item: 'biped', weight: 2 },
    { item: 'floating', weight: 1 },
    { item: 'serpentine', weight: 1 },
  ],
}

const BIOME_AFFINITIES: Record<BiomeId, Affinity[]> = {
  forest_park: ['nature', 'earth'],
  coast_water: ['water', 'nature'],
  urban: ['shadow', 'neutral'],
  grassland: ['nature', 'light'],
  mixed_neighborhood: ['neutral', 'nature'],
}

const COMPATIBLE_APPENDAGES: Record<BodyArchetype, PatternId[]> = {
  quadruped: ['solid', 'striped', 'spotted'],
  biped: ['solid', 'gradient', 'striped'],
  serpentine: ['solid', 'gradient', 'spotted'],
  floating: ['gradient', 'solid'],
  armored: ['solid', 'striped'],
}

export function rarityFromScore(score: number): RarityTier {
  if (score >= 7) return 'rare'
  if (score >= 4) return 'uncommon'
  return 'common'
}

export function captureRateForGenome(genome: Genome): number {
  const tier = rarityFromScore(genome.rarityScore)
  const penalty = tier === 'rare' ? RARITY_CAPTURE_PENALTY * 2 : tier === 'uncommon' ? RARITY_CAPTURE_PENALTY : 0
  return Math.max(0.35, BASE_CAPTURE_RATE - penalty)
}

export function generateGenome(
  seed: number,
  biome: BiomeId,
  options?: { biasArchetype?: BodyArchetype; forceArchetype?: BodyArchetype },
): Genome {
  const rng = mulberry32(seed)
  let bodyArchetype = pickWeighted(rng, BIOME_ARCHETYPES[biome])
  if (options?.biasArchetype && rng() < 0.55) {
    bodyArchetype = options.biasArchetype
  }
  if (options?.forceArchetype) bodyArchetype = options.forceArchetype

  const patterns = COMPATIBLE_APPENDAGES[bodyArchetype]
  const pattern = patterns[Math.floor(rng() * patterns.length)]!
  const appendageRoll = rng()
  const appendage =
    bodyArchetype === 'floating' && appendageRoll > 0.4
      ? 'wings'
      : appendageRoll > 0.85
        ? 'horns'
        : appendageRoll > 0.65
          ? 'tail_fan'
          : 'none'

  const affinities = BIOME_AFFINITIES[biome]
  const primaryAffinity = affinities[Math.floor(rng() * affinities.length)]!
  let secondaryAffinity = pickWeighted(rng, [
    { item: 'nature' as Affinity, weight: 1 },
    { item: 'water' as Affinity, weight: 1 },
    { item: 'earth' as Affinity, weight: 1 },
    { item: 'light' as Affinity, weight: 1 },
    { item: 'shadow' as Affinity, weight: 1 },
    { item: 'neutral' as Affinity, weight: 2 },
  ])
  if (secondaryAffinity === primaryAffinity) {
    secondaryAffinity = 'neutral'
  }

  const roles: CombatRole[] = ['striker', 'guardian', 'support', 'controller']
  const combatRole = roles[Math.floor(rng() * roles.length)]!

  const palette = generatePalette(rng, biome)
  const passiveTrait = PASSIVE_TRAITS[Math.floor(rng() * PASSIVE_TRAITS.length)]!

  let rarityScore = 0
  if (appendage !== 'none') rarityScore += 1
  if (pattern !== 'solid') rarityScore += 1
  if (primaryAffinity !== secondaryAffinity) rarityScore += 1
  if (rng() > 0.7) rarityScore += 2
  if (bodyArchetype === 'floating' || bodyArchetype === 'armored') rarityScore += 1

  return {
    bodyArchetype,
    palette,
    pattern,
    appendage,
    primaryAffinity,
    secondaryAffinity,
    combatRole,
    passiveTrait,
    statTendencies: {
      power: Math.floor(rng() * 5) + 3,
      resilience: Math.floor(rng() * 5) + 3,
      speed: Math.floor(rng() * 5) + 3,
    },
    rarityScore,
    visualSalt: Math.floor(rng() * 0x7fffffff),
  }
}

export function rollMutation(seed: number): MutationKind {
  const rng = mulberry32(seed + 991)
  if (rng() > MUTATION_CHANCE) return 'none'
  return rng() > 0.5 ? 'cosmetic' : 'trait'
}

export function creatureIdFromSeed(seed: number): string {
  return `c-${seed.toString(16)}`
}
