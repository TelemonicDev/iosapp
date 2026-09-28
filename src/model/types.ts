export type BiomeId =
  | 'forest_park'
  | 'coast_water'
  | 'urban'
  | 'grassland'
  | 'mixed_neighborhood'

export type BodyArchetype =
  | 'quadruped'
  | 'biped'
  | 'serpentine'
  | 'floating'
  | 'armored'

export type Affinity = 'nature' | 'water' | 'earth' | 'light' | 'shadow' | 'neutral'

export type CombatRole = 'striker' | 'guardian' | 'support' | 'controller'

export type PatternId = 'solid' | 'striped' | 'spotted' | 'gradient'

export type AppendageId = 'none' | 'wings' | 'tail_fan' | 'horns'

export type MutationKind = 'none' | 'cosmetic' | 'trait'

export type RarityTier = 'common' | 'uncommon' | 'rare'

export interface Genome {
  bodyArchetype: BodyArchetype
  palette: { primary: string; secondary: string; accent: string }
  pattern: PatternId
  appendage: AppendageId
  primaryAffinity: Affinity
  secondaryAffinity: Affinity
  combatRole: CombatRole
  passiveTrait: string
  statTendencies: { power: number; resilience: number; speed: number }
  rarityScore: number
  /** Stable silhouette seed. Color mutations must not rewrite this. */
  visualSalt?: number
}

export interface CreatureOrigin {
  biome: BiomeId
  placeLabel: string
  discoveredAt: number
}

export interface Creature {
  id: string
  displaySeed: number
  genome: Genome
  level: number
  nickname?: string
  favorite: boolean
  mutation: MutationKind
  origin: CreatureOrigin
  generation: number
}

export interface EncounterPreview {
  id: string
  seed: number
  genome: Genome
  biome: BiomeId
  placeLabel: string
  reason: string
  expiresAt: number
  captureRate: number
  lat: number
  lng: number
  captured: boolean
}

export interface JournalState {
  archetypesSeen: BodyArchetype[]
  biomesVisited: BiomeId[]
  mutationsLogged: number
  capturesTotal: number
}

export interface PlayerProfile {
  id: string
  displayName: string
  starterArchetype: BodyArchetype
  onboardingComplete: boolean
  locationExplained: boolean
  homeBiome: BiomeId
}

export interface SaveGame {
  version: number
  profile: PlayerProfile | null
  creatures: Creature[]
  journal: JournalState
  captureCharges: number
  lastChargeRefillAt: number
  activeEncounters: EncounterPreview[]
  lastLookCellKey: string | null
  lastLookWindowId: number | null
}

export type TabId = 'map' | 'collection' | 'journal' | 'profile'
