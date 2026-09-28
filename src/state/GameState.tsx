import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { CHARGE_REFILL_MS, MAX_CAPTURE_CHARGES } from '../config/balance'
import {
  cellKeyForLatLng,
  coarsePlaceLabel,
  detectBiomeNear,
  requestPosition,
  type GeoPosition,
} from '../location/geo'
import { creatureIdFromSeed, rollMutation } from '../model/creatureGen'
import { encounterWindowId, generateEncounters, homeRangeCenter } from '../model/encounters'
import type {
  BodyArchetype,
  BiomeId,
  Creature,
  EncounterPreview,
  PlayerProfile,
  SaveGame,
} from '../model/types'
import { createEmptySave, loadSave, persistSave } from '../persistence/save'

type GameAction =
  | { type: 'HYDRATE'; save: SaveGame }
  | { type: 'CREATE_PROFILE'; displayName: string; starterArchetype: BodyArchetype; locationExplained: boolean }
  | { type: 'SET_HOME_BIOME'; biome: BiomeId }
  | { type: 'SET_ENCOUNTERS'; encounters: EncounterPreview[]; cellKey: string; windowId: number }
  | { type: 'MARK_ENCOUNTER_CAPTURED'; encounterId: string }
  | { type: 'ADD_CREATURE'; creature: Creature }
  | { type: 'TOGGLE_FAVORITE'; creatureId: string }
  | { type: 'TICK_CHARGES' }
  | { type: 'SPEND_CHARGE' }

function mergeJournal(save: SaveGame, creature: Creature): SaveGame {
  const j = save.journal
  const archetypesSeen = j.archetypesSeen.includes(creature.genome.bodyArchetype)
    ? j.archetypesSeen
    : [...j.archetypesSeen, creature.genome.bodyArchetype]
  const biomesVisited = j.biomesVisited.includes(creature.origin.biome)
    ? j.biomesVisited
    : [...j.biomesVisited, creature.origin.biome]
  return {
    ...save,
    journal: {
      archetypesSeen,
      biomesVisited,
      mutationsLogged: j.mutationsLogged + (creature.mutation !== 'none' ? 1 : 0),
      capturesTotal: j.capturesTotal + 1,
    },
  }
}

function applyChargeTick(save: SaveGame, now: number): SaveGame {
  if (save.captureCharges >= MAX_CAPTURE_CHARGES) {
    return { ...save, lastChargeRefillAt: now }
  }
  const elapsed = now - save.lastChargeRefillAt
  if (elapsed < CHARGE_REFILL_MS) return save
  const gained = Math.floor(elapsed / CHARGE_REFILL_MS)
  const newCharges = Math.min(MAX_CAPTURE_CHARGES, save.captureCharges + gained)
  const remainder = elapsed % CHARGE_REFILL_MS
  return {
    ...save,
    captureCharges: newCharges,
    lastChargeRefillAt: now - remainder,
  }
}

function reducer(state: SaveGame, action: GameAction): SaveGame {
  switch (action.type) {
    case 'HYDRATE':
      return applyChargeTick(action.save, Date.now())
    case 'CREATE_PROFILE': {
      const profile: PlayerProfile = {
        id: crypto.randomUUID(),
        displayName: action.displayName.trim() || 'Explorer',
        starterArchetype: action.starterArchetype,
        onboardingComplete: true,
        locationExplained: action.locationExplained,
        homeBiome: 'mixed_neighborhood',
      }
      const center = homeRangeCenter()
      const windowId = encounterWindowId()
      const cellKey = `home-${profile.id}`
      const intro = generateEncounters({
        cellKey,
        windowId,
        biome: profile.homeBiome,
        placeLabel: 'Home range',
        centerLat: center.lat,
        centerLng: center.lng,
        biasArchetype: profile.starterArchetype,
      })
      return {
        ...state,
        profile,
        activeEncounters: intro,
        lastLookCellKey: cellKey,
        lastLookWindowId: windowId,
      }
    }
    case 'SET_HOME_BIOME':
      if (!state.profile) return state
      return { ...state, profile: { ...state.profile, homeBiome: action.biome } }
    case 'SET_ENCOUNTERS':
      return {
        ...state,
        activeEncounters: action.encounters,
        lastLookCellKey: action.cellKey,
        lastLookWindowId: action.windowId,
      }
    case 'MARK_ENCOUNTER_CAPTURED':
      return {
        ...state,
        activeEncounters: state.activeEncounters.map((e) =>
          e.id === action.encounterId ? { ...e, captured: true } : e,
        ),
      }
    case 'ADD_CREATURE':
      return mergeJournal({ ...state, creatures: [...state.creatures, action.creature] }, action.creature)
    case 'TOGGLE_FAVORITE':
      return {
        ...state,
        creatures: state.creatures.map((c) =>
          c.id === action.creatureId ? { ...c, favorite: !c.favorite } : c,
        ),
      }
    case 'TICK_CHARGES':
      return applyChargeTick(state, Date.now())
    case 'SPEND_CHARGE':
      if (state.captureCharges <= 0) return state
      return { ...state, captureCharges: state.captureCharges - 1 }
    default:
      return state
  }
}

interface GameContextValue {
  save: SaveGame
  createProfile: (displayName: string, starterArchetype: BodyArchetype, locationExplained: boolean) => void
  setHomeBiome: (biome: BiomeId) => void
  lookAround: (mode: 'gps' | 'home') => Promise<{ error?: string; position?: GeoPosition }>
  attemptCapture: (encounterId: string) => { ok: boolean; message: string; creature?: Creature }
  toggleFavorite: (creatureId: string) => void
  msUntilNextCharge: number
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [save, dispatch] = useReducer(reducer, createEmptySave(), (s) => applyChargeTick(loadSave() ?? s, Date.now()))

  useEffect(() => {
    dispatch({ type: 'HYDRATE', save: loadSave() })
  }, [])

  useEffect(() => {
    persistSave(save)
  }, [save])

  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: 'TICK_CHARGES' }), 1000)
    return () => window.clearInterval(id)
  }, [])

  const msUntilNextCharge = useMemo(() => {
    if (save.captureCharges >= MAX_CAPTURE_CHARGES) return 0
    const elapsed = Date.now() - save.lastChargeRefillAt
    return Math.max(0, CHARGE_REFILL_MS - elapsed)
  }, [save.captureCharges, save.lastChargeRefillAt])

  const createProfile = useCallback(
    (displayName: string, starterArchetype: BodyArchetype, locationExplained: boolean) => {
      dispatch({ type: 'CREATE_PROFILE', displayName, starterArchetype, locationExplained })
    },
    [],
  )

  const setHomeBiome = useCallback((biome: BiomeId) => {
    dispatch({ type: 'SET_HOME_BIOME', biome })
  }, [])

  const lookAround = useCallback(
    async (mode: 'gps' | 'home') => {
      if (!save.profile) return { error: 'No profile' }
      const windowId = encounterWindowId()
      let centerLat: number
      let centerLng: number
      let biome: BiomeId
      let placeLabel: string
      let cellKey: string
      let position: GeoPosition | undefined

      if (mode === 'gps') {
        try {
          position = await requestPosition()
          centerLat = position.lat
          centerLng = position.lng
          cellKey = cellKeyForLatLng(centerLat, centerLng)
          biome = await detectBiomeNear(centerLat, centerLng)
          placeLabel = await coarsePlaceLabel(centerLat, centerLng)
        } catch {
          return { error: 'Location unavailable. Use home range or try again on foot in a safe public area.' }
        }
      } else {
        const center = homeRangeCenter()
        centerLat = center.lat
        centerLng = center.lng
        biome = save.profile.homeBiome
        placeLabel = 'Home range'
        cellKey = `home-${save.profile.id}-${biome}`
      }

      if (save.lastLookCellKey === cellKey && save.lastLookWindowId === windowId && save.activeEncounters.length) {
        return { position }
      }

      const encounters = generateEncounters({
        cellKey,
        windowId,
        biome,
        placeLabel,
        centerLat,
        centerLng,
        biasArchetype: save.creatures.length === 0 ? save.profile.starterArchetype : undefined,
      })
      dispatch({ type: 'SET_ENCOUNTERS', encounters, cellKey, windowId })
      return { position }
    },
    [save.profile, save.lastLookCellKey, save.lastLookWindowId, save.activeEncounters.length, save.creatures.length],
  )

  const attemptCapture = useCallback(
    (encounterId: string): { ok: boolean; message: string; creature?: Creature } => {
      const encounter = save.activeEncounters.find((e) => e.id === encounterId)
      if (!encounter) return { ok: false, message: 'Encounter not found.' }
      if (encounter.captured) return { ok: false, message: 'Already captured from this sighting.' }
      if (Date.now() > encounter.expiresAt) return { ok: false, message: 'This encounter expired. Look around again.' }
      if (save.captureCharges <= 0) return { ok: false, message: 'No capture charges. Wait for a refill.' }

      dispatch({ type: 'SPEND_CHARGE' })
      const roll = Math.random()
      if (roll > encounter.captureRate) {
        return { ok: false, message: 'It slipped away. The encounter is still here—try again.' }
      }

      const mutation = rollMutation(encounter.seed)
      let genome = encounter.genome
      if (mutation === 'cosmetic') {
        genome = {
          ...genome,
          palette: {
            ...genome.palette,
            accent: '#ffe066',
          },
          rarityScore: genome.rarityScore + 1,
        }
      }
      if (mutation === 'trait') {
        genome = {
          ...genome,
          passiveTrait: `${genome.passiveTrait} (mutated)`,
          rarityScore: genome.rarityScore + 2,
        }
      }

      const creature: Creature = {
        id: creatureIdFromSeed(encounter.seed),
        displaySeed: encounter.seed,
        genome,
        level: 1,
        favorite: false,
        mutation,
        origin: {
          biome: encounter.biome,
          placeLabel: encounter.placeLabel,
          discoveredAt: Date.now(),
        },
        generation: 0,
      }

      dispatch({ type: 'MARK_ENCOUNTER_CAPTURED', encounterId })
      dispatch({ type: 'ADD_CREATURE', creature })
      return { ok: true, message: 'Captured!', creature }
    },
    [save.activeEncounters, save.captureCharges],
  )

  const toggleFavorite = useCallback((creatureId: string) => {
    dispatch({ type: 'TOGGLE_FAVORITE', creatureId })
  }, [])

  const value: GameContextValue = {
    save,
    createProfile,
    setHomeBiome,
    lookAround,
    attemptCapture,
    toggleFavorite,
    msUntilNextCharge,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
