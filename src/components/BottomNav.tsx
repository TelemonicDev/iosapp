import type { TabId } from '../model/types'

interface BottomNavProps {
  tab: TabId
  onChange: (tab: TabId) => void
}

const TABS: { id: TabId; label: string; glyph: string[] }[] = [
  {
    id: 'map',
    label: 'Explore',
    glyph: ['0011100', '0111110', '0111110', '0011100', '0001000', '0001000', '0001000'],
  },
  {
    id: 'collection',
    label: 'Collection',
    glyph: ['1010101', '1010101', '1111111', '0111110', '0011100', '0000000', '0000000'],
  },
  {
    id: 'journal',
    label: 'Journal',
    glyph: ['0111110', '0100010', '0101010', '0100010', '0111110', '0000000', '0000000'],
  },
  {
    id: 'profile',
    label: 'Profile',
    glyph: ['0011100', '0111110', '0101010', '0111110', '0011100', '0001000', '0011100'],
  },
]

export function BottomNav({ tab, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={tab === t.id ? 'nav-item active' : 'nav-item'}
          onClick={() => onChange(t.id)}
        >
          <NavGlyph rows={t.glyph} />
          {t.label}
        </button>
      ))}
    </nav>
  )
}

function NavGlyph({ rows }: { rows: string[] }) {
  const width = rows[0]?.length ?? 0
  return (
    <svg
      className="nav-glyph"
      viewBox={`0 0 ${width} ${rows.length}`}
      width="18"
      height="18"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rows.flatMap((row, y) =>
        [...row].map((cell, x) =>
          cell === '1' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null,
        ),
      )}
    </svg>
  )
}
