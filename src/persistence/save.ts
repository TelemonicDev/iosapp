import { INITIAL_CAPTURE_CHARGES, SAVE_VERSION } from '../config/balance'
import type { JournalState, SaveGame } from '../model/types'

const STORAGE_KEY = 'location_creature_save_v1'

export function emptyJournal(): JournalState {
  return {
    archetypesSeen: [],
    biomesVisited: [],
    mutationsLogged: 0,
    capturesTotal: 0,
  }
}

export function createEmptySave(): SaveGame {
  return {
    version: SAVE_VERSION,
    profile: null,
    creatures: [],
    journal: emptyJournal(),
    captureCharges: INITIAL_CAPTURE_CHARGES,
    lastChargeRefillAt: Date.now(),
    activeEncounters: [],
    lastLookCellKey: null,
    lastLookWindowId: null,
  }
}

export function loadSave(): SaveGame {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptySave()
    const parsed = JSON.parse(raw) as SaveGame
    if (parsed.version !== SAVE_VERSION) return createEmptySave()
    return parsed
  } catch {
    return createEmptySave()
  }
}

export function persistSave(save: SaveGame): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(save))
}
