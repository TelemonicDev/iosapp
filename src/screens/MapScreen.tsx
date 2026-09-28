import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Circle, CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { Map as LeafletMap } from 'leaflet'
import { CritterView } from '../components/CritterView'
import { BIOME_LABELS, type GeoPosition } from '../location/geo'
import { homeRangeCenter } from '../model/encounters'
import type { EncounterPreview } from '../model/types'
import { useGame } from '../state/GameState'
import { EncounterPanel } from './EncounterPanel'

export function MapScreen() {
  const { save, lookAround } = useGame()
  const mapRef = useRef<LeafletMap | null>(null)
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [position, setPosition] = useState<GeoPosition | null>(null)
  const [selected, setSelected] = useState<EncounterPreview | null>(null)
  const [following, setFollowing] = useState(true)
  const [now, setNow] = useState(() => Date.now())

  const active = useMemo(
    () => save.activeEncounters.filter((encounter) => !encounter.captured && encounter.expiresAt > now),
    [save.activeEncounters, now],
  )

  const player = position ?? centroid(active) ?? homeRangeCenter()
  const place = active[0]?.placeLabel ?? 'Nearby'
  const biomeId = active[0]?.biome ?? save.profile?.homeBiome
  const visibleSelection = selected && active.some((encounter) => encounter.id === selected.id) ? selected : null
  const [mapCenter] = useState<[number, number]>(() => {
    const seeded = save.activeEncounters.filter((encounter) => !encounter.captured && encounter.expiresAt > Date.now())
    const point = centroid(seeded) ?? homeRangeCenter()
    return [point.lat, point.lng]
  })

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15000)
    return () => window.clearInterval(id)
  }, [])

  if (!save.profile) return null

  async function scan(mode: 'gps' | 'home') {
    setLoading(true)
    setNote(null)
    const result = await lookAround(mode)
    if (result.position) {
      setPosition(result.position)
      setFollowing(true)
      mapRef.current?.flyTo([result.position.lat, result.position.lng], 16, { duration: 0.7 })
      setLoading(false)
      return
    }
    if (mode === 'gps' && result.error) {
      setNote('Location is off. These critters are on your home range.')
      if (active.length === 0) {
        await lookAround('home')
        const home = homeRangeCenter()
        setFollowing(true)
        mapRef.current?.flyTo([home.lat, home.lng], 16, { duration: 0.7 })
      }
      setLoading(false)
      return
    }
    if (mode === 'home') {
      setPosition(null)
      setFollowing(true)
      const home = homeRangeCenter()
      mapRef.current?.flyTo([home.lat, home.lng], 16, { duration: 0.7 })
    }
    if (result.error) setNote(result.error)
    setLoading(false)
  }

  function recenter() {
    setFollowing(true)
    mapRef.current?.flyTo([player.lat, player.lng], 16, { duration: 0.55 })
  }

  return (
    <div className="play-screen">
      <MapContainer
        ref={mapRef}
        className="play-map"
        center={mapCenter}
        zoom={16}
        minZoom={14}
        maxZoom={18}
        zoomControl={false}
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoot />
        <DragWatch onDrag={() => setFollowing(false)} />
        {position && (
          <Circle
            center={[position.lat, position.lng]}
            radius={Math.max(position.accuracy, 12)}
            pathOptions={{ color: '#7ad7ff', weight: 1, fillColor: '#4aa3ff', fillOpacity: 0.12 }}
          />
        )}
        <CircleMarker
          center={[player.lat, player.lng]}
          radius={8}
          pathOptions={{ color: '#f4fbff', weight: 3, fillColor: '#3aa0ff', fillOpacity: 1 }}
        />
        <PinLayer>
          {active.map((encounter) => (
            <CritterPin
              key={encounter.id}
              encounter={encounter}
              selected={visibleSelection?.id === encounter.id}
              onSelect={() => setSelected(encounter)}
            />
          ))}
        </PinLayer>
      </MapContainer>

      <div className="play-shade play-shade-top" />
      <header className="play-hud">
        <div className="hud-chip hud-place">
          <span className="hud-kicker">{biomeId ? BIOME_LABELS[biomeId] : 'Explore'}</span>
          <strong>{place}</strong>
          <span className="hud-meta">{loading ? 'Scanning…' : `${active.length} nearby`}</span>
        </div>
        <div className="hud-chip hud-charges" aria-label={`${save.captureCharges} capture charges`}>
          <span className="hud-kicker">Charges</span>
          <strong>{save.captureCharges}</strong>
        </div>
      </header>

      {note && (
        <p className="play-note" role="status">
          {note}
        </p>
      )}

      {active.length === 0 && !loading && (
        <p className="play-empty">No critters in this area yet.</p>
      )}

      <div className="play-dock">
        {!following && (
          <button type="button" className="dock-side" onClick={recenter}>
            Recenter
          </button>
        )}
        <button type="button" className="scan-btn" disabled={loading} onClick={() => scan('gps')}>
          {loading ? 'Scanning…' : 'Look around'}
        </button>
        <button type="button" className="dock-side" disabled={loading} onClick={() => scan('home')}>
          Home
        </button>
      </div>

      {visibleSelection && (
        <EncounterPanel
          encounter={visibleSelection}
          onClose={() => setSelected(null)}
          onCaptured={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function centroid(encounters: EncounterPreview[]): { lat: number; lng: number } | null {
  if (encounters.length === 0) return null
  const lat = encounters.reduce((sum, encounter) => sum + encounter.lat, 0) / encounters.length
  const lng = encounters.reduce((sum, encounter) => sum + encounter.lng, 0) / encounters.length
  return { lat, lng }
}

function MapBoot() {
  const map = useMap()
  useEffect(() => {
    const id = window.requestAnimationFrame(() => map.invalidateSize())
    return () => window.cancelAnimationFrame(id)
  }, [map])
  return null
}

function DragWatch({ onDrag }: { onDrag: () => void }) {
  useMapEvents({ dragstart: onDrag })
  return null
}

function PinLayer({ children }: { children: ReactNode }) {
  const map = useMap()
  const [host, setHost] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const layer = document.createElement('div')
    layer.className = 'map-pin-layer'
    map.getContainer().appendChild(layer)
    const frame = window.requestAnimationFrame(() => setHost(layer))
    return () => {
      window.cancelAnimationFrame(frame)
      layer.remove()
    }
  }, [map])

  if (!host) return null
  return createPortal(children, host)
}

function CritterPin({
  encounter,
  selected,
  onSelect,
}: {
  encounter: EncounterPreview
  selected: boolean
  onSelect: () => void
}) {
  const map = useMap()
  const [, setFrame] = useState(0)
  useMapEvents({
    move: () => setFrame((frame) => frame + 1),
    zoom: () => setFrame((frame) => frame + 1),
  })
  const point = map.latLngToContainerPoint([encounter.lat, encounter.lng])
  const form = encounter.genome.bodyArchetype.replace(/_/g, ' ')

  return (
    <button
      type="button"
      className={selected ? 'map-critter is-selected' : 'map-critter'}
      style={{ transform: `translate(${point.x}px, ${point.y}px)` }}
      onClick={onSelect}
      aria-label={`${form} critter`}
    >
      <CritterView genome={encounter.genome} size={58} />
    </button>
  )
}
