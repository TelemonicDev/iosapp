import type { TabId } from '../model/types'

interface BottomNavProps {
  tab: TabId
  onChange: (tab: TabId) => void
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'map', label: 'Explore' },
  { id: 'collection', label: 'Collection' },
  { id: 'journal', label: 'Journal' },
  { id: 'profile', label: 'Profile' },
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
          {t.label}
        </button>
      ))}
    </nav>
  )
}
