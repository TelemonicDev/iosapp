import type { Genome, MutationKind } from '../model/types'
import { rarityFromScore } from '../model/creatureGen'

interface CreatureViewProps {
  genome: Genome
  mutation?: MutationKind
  size?: number
  className?: string
}

export function CreatureView({ genome, mutation = 'none', size = 120, className }: CreatureViewProps) {
  const { bodyArchetype, palette, pattern, appendage } = genome
  const glow = mutation !== 'none' ? 'drop-shadow(0 0 6px rgba(255,220,120,0.8))' : undefined
  const rarity = rarityFromScore(genome.rarityScore)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ filter: glow }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`grad-${palette.primary}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.primary} />
          <stop offset="100%" stopColor={palette.secondary} />
        </linearGradient>
        {pattern === 'striped' && (
          <pattern id="stripes" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
            <rect width="4" height="8" fill={palette.accent} opacity="0.35" />
          </pattern>
        )}
        {pattern === 'spotted' && (
          <pattern id="spots" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="2" fill={palette.accent} opacity="0.45" />
            <circle cx="9" cy="8" r="1.5" fill={palette.accent} opacity="0.35" />
          </pattern>
        )}
      </defs>

      {bodyArchetype === 'quadruped' && (
        <g>
          <ellipse cx="62" cy="58" rx="22" ry="14" fill={`url(#grad-${palette.primary})`} />
          <circle cx="38" cy="48" r="14" fill={palette.primary} />
          <rect x="48" y="62" width="6" height="14" rx="3" fill={palette.secondary} />
          <rect x="58" y="64" width="6" height="12" rx="3" fill={palette.secondary} />
          <rect x="68" y="62" width="6" height="14" rx="3" fill={palette.secondary} />
          <rect x="78" y="64" width="6" height="12" rx="3" fill={palette.secondary} />
        </g>
      )}

      {bodyArchetype === 'biped' && (
        <g>
          <ellipse cx="50" cy="55" rx="18" ry="24" fill={`url(#grad-${palette.primary})`} />
          <circle cx="50" cy="32" r="16" fill={palette.primary} />
          <rect x="42" y="72" width="7" height="18" rx="3" fill={palette.secondary} />
          <rect x="52" y="72" width="7" height="18" rx="3" fill={palette.secondary} />
        </g>
      )}

      {bodyArchetype === 'serpentine' && (
        <g>
          <path
            d="M20 60 Q35 30 50 45 T80 40 T90 55"
            fill="none"
            stroke={palette.primary}
            strokeWidth="14"
            strokeLinecap="round"
          />
          <circle cx="22" cy="58" r="12" fill={palette.primary} />
        </g>
      )}

      {bodyArchetype === 'floating' && (
        <g>
          <ellipse cx="50" cy="52" rx="24" ry="20" fill={`url(#grad-${palette.primary})`} />
          <circle cx="50" cy="38" r="12" fill={palette.primary} />
        </g>
      )}

      {bodyArchetype === 'armored' && (
        <g>
          <rect x="32" y="40" width="36" height="28" rx="8" fill={palette.primary} />
          <circle cx="50" cy="34" r="14" fill={palette.secondary} />
          <rect x="38" y="68" width="8" height="16" rx="3" fill={palette.secondary} />
          <rect x="54" y="68" width="8" height="16" rx="3" fill={palette.secondary} />
        </g>
      )}

      {pattern === 'striped' && (
        <rect x="10" y="20" width="80" height="70" fill="url(#stripes)" opacity="0.6" />
      )}
      {pattern === 'spotted' && (
        <rect x="10" y="20" width="80" height="70" fill="url(#spots)" opacity="0.5" />
      )}
      {pattern === 'gradient' && (
        <ellipse cx="50" cy="52" rx="28" ry="24" fill={palette.accent} opacity="0.15" />
      )}

      {appendage === 'wings' && (
        <>
          <ellipse cx="28" cy="48" rx="14" ry="8" fill={palette.accent} opacity="0.7" />
          <ellipse cx="72" cy="48" rx="14" ry="8" fill={palette.accent} opacity="0.7" />
        </>
      )}
      {appendage === 'horns' && (
        <>
          <path d="M42 28 L38 14 L46 26 Z" fill={palette.accent} />
          <path d="M58 28 L62 14 L54 26 Z" fill={palette.accent} />
        </>
      )}
      {appendage === 'tail_fan' && (
        <path d="M82 58 Q95 50 92 68 Q88 72 82 64 Z" fill={palette.accent} opacity="0.85" />
      )}

      {rarity !== 'common' && (
        <circle cx="88" cy="14" r="5" fill={rarity === 'rare' ? '#ffd700' : '#9cf'} opacity="0.9" />
      )}
    </svg>
  )
}
