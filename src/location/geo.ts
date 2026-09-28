import { BIOME_CACHE_TTL_MS, MAP_CELL_SCALE } from '../config/balance'
import type { BiomeId } from '../model/types'

export interface GeoPosition {
  lat: number
  lng: number
  accuracy: number
}

const biomeCache = new Map<string, { biome: BiomeId; at: number }>()

export function cellKeyForLatLng(lat: number, lng: number): string {
  const latCell = Math.floor(lat * MAP_CELL_SCALE)
  const lngCell = Math.floor(lng * MAP_CELL_SCALE)
  return `${latCell},${lngCell}`
}

export function offsetLatLng(lat: number, lng: number, metersEast: number, metersNorth: number): { lat: number; lng: number } {
  const dLat = metersNorth / 111_320
  const dLng = metersEast / (111_320 * Math.cos((lat * Math.PI) / 180))
  return { lat: lat + dLat, lng: lng + dLng }
}

export function requestPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation unavailable'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  })
}

function biomeFromOsmTags(tags: Record<string, string>): BiomeId | null {
  if (tags.natural === 'water' || tags.waterway || tags.coastline || tags.natural === 'beach') {
    return 'coast_water'
  }
  if (tags.landuse === 'forest' || tags.natural === 'wood' || tags.leisure === 'park') {
    return 'forest_park'
  }
  if (tags.landuse === 'grass' || tags.natural === 'grassland' || tags.landuse === 'meadow') {
    return 'grassland'
  }
  if (tags.place === 'city' || tags.place === 'town' || tags.building || tags.amenity) {
    return 'urban'
  }
  return null
}

export async function detectBiomeNear(lat: number, lng: number): Promise<BiomeId> {
  const key = cellKeyForLatLng(lat, lng)
  const cached = biomeCache.get(key)
  if (cached && Date.now() - cached.at < BIOME_CACHE_TTL_MS) {
    return cached.biome
  }

  try {
    const delta = 0.004
    const query = `
      [out:json][timeout:10];
      (
        node["natural"](${lat - delta},${lng - delta},${lat + delta},${lng + delta});
        way["natural"](${lat - delta},${lng - delta},${lat + delta},${lng + delta});
        node["landuse"](${lat - delta},${lng - delta},${lat + delta},${lng + delta});
        way["leisure"="park"](${lat - delta},${lng - delta},${lat + delta},${lng + delta});
      );
      out tags 12;
    `
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    if (!res.ok) throw new Error('Overpass failed')
    const data = (await res.json()) as { elements: { tags?: Record<string, string> }[] }
    const counts: Partial<Record<BiomeId, number>> = {}
    for (const el of data.elements) {
      if (!el.tags) continue
      const b = biomeFromOsmTags(el.tags)
      if (b) counts[b] = (counts[b] ?? 0) + 1
    }
    let best: BiomeId = 'mixed_neighborhood'
    let bestCount = 0
    for (const [biome, count] of Object.entries(counts) as [BiomeId, number][]) {
      if (count > bestCount) {
        bestCount = count
        best = biome
      }
    }
    biomeCache.set(key, { biome: best, at: Date.now() })
    return best
  } catch {
    return 'mixed_neighborhood'
  }
}

export async function coarsePlaceLabel(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    if (!res.ok) return 'Nearby region'
    const data = (await res.json()) as { address?: { city?: string; town?: string; county?: string; state?: string } }
    const a = data.address
    return a?.city ?? a?.town ?? a?.county ?? a?.state ?? 'Nearby region'
  } catch {
    return 'Nearby region'
  }
}

export const BIOME_LABELS: Record<BiomeId, string> = {
  forest_park: 'Forest / park',
  coast_water: 'Coast / water',
  urban: 'Urban',
  grassland: 'Grassland',
  mixed_neighborhood: 'Mixed neighborhood',
}
