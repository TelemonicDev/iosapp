import 'leaflet/dist/leaflet.css'
import { useMemo, useState } from 'react'
import { Circle, MapContainer, Marker, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { CritterView } from '../components/CritterView'
import { BIOME_LABELS, type GeoPosition } from '../location/geo'
import type { BiomeId, EncounterPreview } from '../model/types'
import { useGame } from '../state/GameState'
import { EncounterPanel } from './EncounterPanel'
import { homeRangeCenter } from '../model/encounters'

const markerIcon = L.divIcon({
  className: 'encounter-marker',
  html: '<span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

export function MapScreen() {
  const { save, lookAround, setHomeBiome } = useGame()
  const [view, setView] = useState<'map' | 'list'>('list')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState<GeoPosition | null>(null)
  const [selected, setSelected] = useState<EncounterPreview | null>(null)

  const center = position ?? homeRangeCenter()
  const active = save.activeEncounters.filter((e) => !e.captured && Date.now() < e.expiresAt)

  const mapKey = useMemo(() => `${center.lat.toFixed(3)}-${center.lng.toFixed(3)}`, [center.lat, center.lng])

  async function doLook(mode: 'gps' | 'home') {
    setLoading(true)
    setError(null)
    const result = await lookAround(mode)
    setLoading(false)
    if (result.error) setError(result.error)
    if (result.position) setPosition(result.position)
  }

  if (!save.profile) return null

  return (
    <div className="screen map-screen">
      <header className="screen-header">
        <div>
          <h1>Explore</h1>
          <p className="muted">Nearby opportunities · stay aware of your surroundings</p>
        </div>
        <div className="toggle-row">
          <button type="button" className={view === 'list' ? 'tab active' : 'tab'} onClick={() => setView('list')}>
            List
          </button>
          <button type="button" className={view === 'map' ? 'tab active' : 'tab'} onClick={() => setView('map')}>
            Map
          </button>
        </div>
      </header>

      <div className="action-row">
        <button type="button" className="btn primary" disabled={loading} onClick={() => doLook('gps')}>
          {loading ? 'Looking…' : 'Look around (location)'}
        </button>
        <button type="button" className="btn secondary" disabled={loading} onClick={() => doLook('home')}>
          Refresh home range
        </button>
      </div>

      <label className="field inline">
        Home biome
        <select
          value={save.profile.homeBiome}
          onChange={(e) => setHomeBiome(e.target.value as BiomeId)}
        >
          {(Object.keys(BIOME_LABELS) as BiomeId[]).map((id) => (
            <option key={id} value={id}>
              {BIOME_LABELS[id]}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="banner warn">{error}</p>}

      {view === 'map' ? (
        <div className="map-wrap">
          <MapContainer key={mapKey} center={[center.lat, center.lng]} zoom={16} scrollWheelZoom={false} className="map">
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {position && (
              <>
                <Marker position={[position.lat, position.lng]} icon={markerIcon} />
                <Circle center={[position.lat, position.lng]} radius={position.accuracy} pathOptions={{ color: '#6cf', fillOpacity: 0.08 }} />
              </>
            )}
            {active.map((enc) => (
              <Marker
                key={enc.id}
                position={[enc.lat, enc.lng]}
                icon={markerIcon}
                eventHandlers={{ click: () => setSelected(enc) }}
              />
            ))}
          </MapContainer>
        </div>
      ) : (
        <ul className="encounter-list">
          {active.length === 0 && (
            <li className="empty">No critters nearby. Look around or refresh home range.</li>
          )}
          {active.map((enc) => (
            <li key={enc.id}>
              <button type="button" className="encounter-card" onClick={() => setSelected(enc)}>
                <CritterView genome={enc.genome} size={72} />
                <span className="encounter-copy">
                  <span className="encounter-title">{enc.genome.bodyArchetype.replace(/_/g, ' ')}</span>
                  <span className="muted">{enc.reason}</span>
                  <span className="tag">{Math.round(enc.captureRate * 100)}% capture</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <EncounterPanel encounter={selected} onClose={() => setSelected(null)} onCaptured={() => setSelected(null)} />
      )}
    </div>
  )
}
