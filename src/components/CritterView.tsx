import { useId, type ReactNode } from 'react'
import { rarityFromScore } from '../model/creatureGen'
import {
  colorsFromPalette,
  lookFromGenome,
  mixHex,
  shadeHex,
  type CritterColors,
  type CritterLook,
} from '../model/critterLook'
import type { AppendageId, BodyArchetype, Genome, MutationKind, PatternId } from '../model/types'
import { mulberry32 } from '../util/rng'

interface CritterViewProps {
  genome: Genome
  mutation?: MutationKind
  size?: number
  className?: string
}

type FaceKind = 'profile' | 'front' | 'snake' | 'spirit' | 'bug'

interface FaceAnchor {
  cx: number
  cy: number
  r: number
  kind: FaceKind
}

interface Portrait {
  back: ReactNode
  shapes: (fill: string) => ReactNode
  details: ReactNode
  face: FaceAnchor
  clip: 'path' | 'mask'
}

export function CritterView({ genome, mutation = 'none', size = 120, className }: CritterViewProps) {
  const id = useId().replace(/:/g, '')
  const look = lookFromGenome(genome)
  const colors = colorsFromPalette(genome.palette)
  const rarity = rarityFromScore(genome.rarityScore)
  const portrait = buildPortrait(genome.bodyArchetype, genome.appendage, look, colors)
  const fill = `url(#${id}-body)`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      className={`critter-svg critter-${rarity}${className ? ` ${className}` : ''}`}
      style={{
        animationDuration: `${(2.7 + look.build * 1.3).toFixed(2)}s`,
        animationDelay: `${(-look.motif * 2.2).toFixed(2)}s`,
      }}
      role="img"
      aria-label={`${genome.bodyArchetype} critter`}
    >
      <defs>
        <radialGradient id={`${id}-stage`} cx="50%" cy="40%" r="64%">
          <stop offset="0%" stopColor={mixHex(colors.primary, '#ffffff', 0.28)} />
          <stop offset="62%" stopColor={shadeHex(colors.primary, -0.22)} />
          <stop offset="100%" stopColor={shadeHex(colors.secondary, -0.48)} />
        </radialGradient>
        <linearGradient id={`${id}-body`} x1="12%" y1="0%" x2="88%" y2="100%">
          <stop offset="0%" stopColor={colors.light} />
          <stop offset="46%" stopColor={colors.primary} />
          <stop offset="100%" stopColor={colors.secondary} />
        </linearGradient>
        <filter id={`${id}-ink`} x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
          <feMorphology in="SourceAlpha" operator="dilate" radius="1.45" result="dilate" />
          <feFlood floodColor={colors.ink} result="flood" />
          <feComposite in="flood" in2="dilate" operator="in" result="outline" />
          <feMerge>
            <feMergeNode in="outline" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {portrait.clip === 'path' ? (
          <clipPath id={`${id}-clip`}>{portrait.shapes('#000')}</clipPath>
        ) : (
          <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="160">
            <rect width="160" height="160" fill="black" />
            {portrait.shapes('#fff')}
          </mask>
        )}
      </defs>

      <circle cx="80" cy="80" r="76" fill={`url(#${id}-stage)`} />
      {rarity !== 'common' && (
        <circle
          cx="80"
          cy="80"
          r="73"
          fill="none"
          stroke={rarity === 'rare' ? colors.accent : shadeHex(colors.light, 0.2)}
          strokeWidth={rarity === 'rare' ? 2.2 : 1.25}
          opacity="0.85"
        />
      )}

      <ellipse cx="82" cy="146" rx={36 + look.build * 12} ry="6.5" fill="#041018" opacity="0.28" />
      <g filter={`url(#${id}-ink)`} transform={`rotate(${look.tilt.toFixed(2)} 80 96)`}>
        {portrait.back}
        {portrait.shapes(fill)}
        <g
          clipPath={portrait.clip === 'path' ? `url(#${id}-clip)` : undefined}
          mask={portrait.clip === 'mask' ? `url(#${id}-mask)` : undefined}
        >
          <Markings pattern={genome.pattern} accent={colors.accent} look={look} />
        </g>
        {portrait.details}
        <Face anchor={portrait.face} look={look} colors={colors} />
        {genome.appendage === 'horns' && (
          <Horns
            cx={portrait.face.cx + (portrait.face.kind === 'profile' ? 6 : 0)}
            cy={portrait.face.cy}
            r={portrait.face.r}
            color={colors.accent}
            tall={0.4 + look.head * 0.9}
          />
        )}
        {mutation === 'trait' && (
          <Sigil cx={portrait.face.cx} cy={portrait.face.cy - portrait.face.r * 0.72} color={colors.accent} />
        )}
      </g>
      {mutation === 'cosmetic' && <Sparkles seed={look.seed} color={colors.accent} />}
    </svg>
  )
}

function buildPortrait(archetype: BodyArchetype, appendage: AppendageId, look: CritterLook, colors: CritterColors): Portrait {
  if (archetype === 'biped') return bipedPortrait(look, appendage, colors)
  if (archetype === 'serpentine') return serpentPortrait(look, appendage, colors)
  if (archetype === 'floating') return floatPortrait(look, appendage, colors)
  if (archetype === 'armored') return armoredPortrait(look, appendage, colors)
  return quadrupedPortrait(look, appendage, colors)
}

function quadrupedPortrait(look: CritterLook, appendage: AppendageId, colors: CritterColors): Portrait {
  const headR = 22 + look.head * 6
  const head = { x: 56, y: 68 - look.head * 3, r: headR }
  const snoutRx = 13 + look.snout * 6
  const snout = { x: head.x - headR * 0.78, y: head.y + headR * 0.34, rx: snoutRx, ry: 8 + look.snout * 2 }
  const body = { x: 102, y: 104, rx: 34 + look.build * 8, ry: 22 + look.build * 7 }
  const chest = { x: 74, y: 96, rx: 18 + look.build * 4, ry: 16 + look.build * 3 }
  const wingFill = mixHex(colors.accent, colors.light, 0.25)

  return {
    clip: 'path',
    back:
      appendage === 'wings' ? (
        <Wings y={92} reach={34 + look.limb * 16} fill={wingFill} vein={shadeHex(colors.accent, -0.25)} />
      ) : null,
    shapes: (fill) => (
      <g fill={fill}>
        {appendage === 'tail_fan' ? (
          <TailFan x={body.x + body.rx * 0.45} y={body.y - 6} />
        ) : (
          <path
            d={`M ${body.x + body.rx * 0.55} ${body.y - 6}
              Q ${body.x + body.rx + 16} ${body.y + 8}
                ${body.x + body.rx + 2} ${body.y - 26 - look.motif * 16}`}
            fill="none"
            stroke={fill}
            strokeWidth={8 + look.build * 3}
            strokeLinecap="round"
          />
        )}
        <Leg x={118} y0={108} y1={144} w={8 + look.limb * 2} lean={4} fill={fill} />
        <ellipse cx={body.x} cy={body.y} rx={body.rx} ry={body.ry} />
        <ellipse cx={chest.x} cy={chest.y} rx={chest.rx} ry={chest.ry} />
        <Leg x={70} y0={102} y1={146} w={9 + look.limb * 2} lean={-2} fill={fill} />
        <ellipse cx={head.x + 8} cy={head.y - head.r * 0.72} rx={head.r * 0.28} ry={head.r * (look.ear === 1 ? 0.34 : 0.46)} />
        <circle cx={head.x} cy={head.y} r={head.r} />
        <ellipse cx={snout.x} cy={snout.y} rx={snout.rx} ry={snout.ry} />
        <SideEar cx={head.x + 2} cy={head.y - head.r * 0.55} r={head.r} ear={look.ear} fluff={look.fluff} />
        {look.fluff > 0.55 && <circle cx={head.x + head.r * 0.15} cy={head.y + head.r * 0.45} r={7 + look.fluff * 4} />}
      </g>
    ),
    details: (
      <>
        <ellipse cx={body.x - 4} cy={body.y + 6} rx={body.rx * 0.55} ry={body.ry * 0.42} fill={colors.belly} />
        <ellipse cx={snout.x - snout.rx * 0.15} cy={snout.y + 1} rx={snout.rx * 0.72} ry={snout.ry * 0.62} fill={colors.belly} />
        <circle cx={snout.x - snout.rx * 0.72} cy={snout.y - 1} r={3.1} fill={colors.ink} />
      </>
    ),
    face: { cx: head.x - 2, cy: head.y - 2, r: head.r, kind: 'profile' },
  }
}

function bipedPortrait(look: CritterLook, appendage: AppendageId, colors: CritterColors): Portrait {
  const headR = 30 + look.head * 5
  const headY = 58
  const bodyRx = 17 + look.build * 7
  const bodyY = 112
  const arm = 10 + look.limb * 16
  return {
    clip: 'path',
    back: (
      <>
        {appendage === 'wings' && (
          <Wings y={100} reach={36 + look.limb * 14} fill={mixHex(colors.accent, colors.light, 0.3)} vein={shadeHex(colors.accent, -0.2)} />
        )}
        {appendage === 'tail_fan' ? (
          <TailFan x={80} y={128} />
        ) : (
          <path
            d={`M 96 ${bodyY} Q 124 ${bodyY - 8} 118 ${bodyY - 28 - look.motif * 12}`}
            fill="none"
            stroke={colors.secondary}
            strokeWidth="7"
            strokeLinecap="round"
          />
        )}
      </>
    ),
    shapes: (fill) => (
      <g fill={fill}>
        <path d={mitten(80 - bodyRx, 102, -1, arm)} />
        <path d={mitten(80 + bodyRx, 102, 1, arm)} />
        <ellipse cx={66} cy={146} rx={9} ry={6} />
        <ellipse cx={94} cy={146} rx={9} ry={6} />
        <path d={`M 70 118 C 62 132, 60 142, 66 146 C 72 144, 74 132, 76 120 Z`} />
        <path d={`M 90 118 C 98 132, 102 142, 94 146 C 88 144, 86 132, 84 120 Z`} />
        <ellipse cx="80" cy={bodyY} rx={bodyRx} ry={20 + look.build * 5} />
        <ellipse cx="80" cy={headY + headR * 0.78} rx={11 + look.fluff * 3} ry="9" />
        <circle cx="80" cy={headY} r={headR} />
        <FrontEars cx={80} cy={headY} r={headR} ear={look.ear} fluff={look.fluff} />
        {look.snout > 0.45 && (
          <ellipse cx="80" cy={headY + headR * 0.42} rx={10 + look.snout * 6} ry={7 + look.snout * 2} />
        )}
      </g>
    ),
    details: (
      <>
        <ellipse cx="80" cy={bodyY + 2} rx={bodyRx * 0.62} ry="11" fill={colors.belly} />
        <FrontEarInners cx={80} cy={headY} r={headR} ear={look.ear} fill={mixHex(colors.accent, colors.belly, 0.4)} />
      </>
    ),
    face: { cx: 80, cy: headY + 1, r: headR, kind: 'front' },
  }
}

function serpentPortrait(look: CritterLook, appendage: AppendageId, colors: CritterColors): Portrait {
  const width = 15 + look.build * 8
  const sway = 18 + look.motif * 20
  const pts = [
    { x: 92 + (look.snout - 0.5) * 16, y: 46 + look.head * 4 },
    { x: 64 - sway * 0.15, y: 72 },
    { x: 112, y: 96 + look.limb * 6 },
    { x: 62 + look.build * 8, y: 120 },
    { x: 108, y: 144 },
  ]
  const d = smoothPath(pts)
  const head = pts[0]!
  const headR = width * 0.82
  return {
    clip: 'mask',
    back:
      appendage === 'wings' ? (
        <Wings y={86} reach={30 + look.limb * 12} fill={mixHex(colors.accent, colors.light, 0.2)} vein={shadeHex(colors.accent, -0.25)} />
      ) : null,
    shapes: (fill) => (
      <g fill={fill}>
        {look.fluff > 0.6 && (
          <path
            d={`M ${head.x - headR * 1.7} ${head.y + headR * 0.2}
              Q ${head.x} ${head.y - headR * 1.7} ${head.x + headR * 1.7} ${head.y + headR * 0.2}
              Q ${head.x} ${head.y + headR * 0.9} ${head.x - headR * 1.7} ${head.y + headR * 0.2} Z`}
          />
        )}
        {appendage === 'tail_fan' &&
          pts.slice(1, 4).map((p, i) => <ellipse key={i} cx={p.x} cy={p.y - width * 0.55} rx="3.4" ry={7 + look.limb * 2} />)}
        <path d={d} fill="none" stroke={fill} strokeWidth={width} strokeLinecap="round" />
        <ellipse cx={head.x - headR * 0.55} cy={head.y + headR * 0.15} rx={headR * 0.85} ry={headR * 0.48} />
        <circle cx={head.x} cy={head.y} r={headR} />
      </g>
    ),
    details: (
      <>
        <path d={d} fill="none" stroke={colors.belly} strokeWidth={width * 0.28} strokeLinecap="round" />
        <circle cx={head.x - headR * 1.15} cy={head.y + headR * 0.12} r={2.4} fill={colors.ink} />
      </>
    ),
    face: { cx: head.x - headR * 0.12, cy: head.y - 1, r: headR, kind: 'snake' },
  }
}

function floatPortrait(look: CritterLook, appendage: AppendageId, colors: CritterColors): Portrait {
  const rx = 36 + look.build * 10
  const ry = 28 + look.build * 6
  const cy = 70
  const count = 4 + Math.floor(look.motif * 2)
  const bells = bellPath(80, cy, rx, ry)
  return {
    clip: 'path',
    back: (
      <g fill="none" strokeLinecap="round">
        {Array.from({ length: count }, (_, i) => {
          const t = i / (count - 1)
          const x = 80 - rx * 0.62 + t * rx * 1.24
          const len = 26 + ((look.limb * 0.7 + i * 0.19) % 1) * 28
          const sway = (i % 2 === 0 ? -1 : 1) * (7 + look.snout * 8)
          return (
            <path
              key={i}
              d={`M ${x} ${cy + ry * 0.35} Q ${x + sway} ${cy + ry + len * 0.45} ${x + sway * 0.35} ${cy + len + 8}`}
              stroke={mixHex(colors.accent, colors.secondary, 0.35)}
              strokeWidth={2.4 + (i % 2)}
              opacity="0.9"
            />
          )
        })}
        {appendage === 'tail_fan' && (
          <g fill={mixHex(colors.accent, colors.light, 0.3)}>
            <TailFan x={80} y={cy + 10} />
          </g>
        )}
      </g>
    ),
    shapes: (fill) => (
      <g fill={fill}>
        {appendage === 'wings' && (
          <Wings y={cy - 4} reach={34 + look.limb * 14} fill={mixHex(colors.light, colors.accent, 0.45)} vein={shadeHex(colors.accent, -0.2)} />
        )}
        <path d={bells} />
        {look.fluff > 0.48 && (
          <path
            d={`M ${80 - rx * 0.28} ${cy - ry * 0.72}
              Q 80 ${cy - ry - 18 - look.fluff * 12} ${80 + rx * 0.28} ${cy - ry * 0.72}
              Q 80 ${cy - ry * 0.2} ${80 - rx * 0.28} ${cy - ry * 0.72} Z`}
          />
        )}
      </g>
    ),
    details: (
      <ellipse
        cx="80"
        cy={cy + 4}
        rx={rx * 0.42}
        ry={ry * 0.38}
        fill={mixHex(colors.belly, '#ffffff', 0.2)}
        opacity="0.9"
      />
    ),
    face: { cx: 80, cy: cy - 2, r: Math.min(rx, ry) * 0.62, kind: 'spirit' },
  }
}

function armoredPortrait(look: CritterLook, appendage: AppendageId, colors: CritterColors): Portrait {
  const rx = 48 + look.build * 6
  const ry = 34 + look.build * 5
  const y = 82
  const headR = 15 + look.head * 2
  return {
    clip: 'path',
    back:
      appendage === 'wings' ? (
        <Wings y={y} reach={32 + look.limb * 8} fill={mixHex(colors.accent, colors.secondary, 0.2)} vein={colors.ink} />
      ) : appendage === 'tail_fan' ? (
        <TailFan x={80} y={y + ry * 0.35} />
      ) : null,
    shapes: (fill) => (
      <g fill={fill}>
        {[-1, 1].map((side) =>
          [0, 1, 2].map((i) => (
            <ellipse
              key={`${side}-${i}`}
              cx={80 + side * (18 + i * 12)}
              cy={y + 18 + i * 8}
              rx={7}
              ry={4.5}
              transform={`rotate(${side * (18 + i * 8)} ${80 + side * (18 + i * 12)} ${y + 18 + i * 8})`}
            />
          )),
        )}
        <circle cx="80" cy={128} r={headR} />
        <path
          d={`M ${80 - rx} ${y + 6}
            C ${80 - rx} ${y - ry}, ${80 - rx * 0.15} ${y - ry - 4}, 80 ${y - ry + 2}
            C ${80 + rx * 0.15} ${y - ry - 4}, ${80 + rx} ${y - ry}, ${80 + rx} ${y + 6}
            C ${80 + rx} ${y + ry * 0.85}, 80 ${y + ry}, ${80 - rx} ${y + 6} Z`}
        />
      </g>
    ),
    details: (
      <>
        <path
          d={`M 80 ${y - ry + 8} L 80 ${y + ry * 0.55}`}
          stroke={shadeHex(colors.secondary, -0.35)}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M ${80 - rx * 0.55} ${y - 4} Q 80 ${y - ry * 0.45} ${80 + rx * 0.55} ${y - 4}`}
          stroke={shadeHex(colors.secondary, -0.2)}
          strokeWidth="2.2"
          fill="none"
        />
        <ellipse cx={80 - 14} cy={y - 12} rx="12" ry="6" fill="#fff" opacity="0.2" />
      </>
    ),
    face: { cx: 80, cy: 130, r: headR, kind: 'bug' },
  }
}

function Leg({ x, y0, y1, w, lean, fill }: { x: number; y0: number; y1: number; w: number; lean: number; fill: string }) {
  const pawX = x + lean
  return (
    <g fill={fill}>
      <path
        d={`M ${x - w * 0.35} ${y0}
          C ${x - w} ${(y0 + y1) / 2}, ${pawX - w * 0.8} ${y1 - 8}, ${pawX - w * 0.2} ${y1}
          C ${pawX + w * 0.55} ${y1 + 3}, ${pawX + w * 0.9} ${y1 - 1}, ${x + w * 0.45} ${y0 + 4}
          C ${x + w * 0.2} ${(y0 + y1) / 2}, ${x + w * 0.15} ${y0 + 6}, ${x - w * 0.35} ${y0} Z`}
      />
      <ellipse cx={pawX + 1} cy={y1 + 1} rx={w * 0.85} ry={w * 0.42} />
    </g>
  )
}

function SideEar({ cx, cy, r, ear, fluff }: { cx: number; cy: number; r: number; ear: CritterLook['ear']; fluff: number }) {
  const h = (ear === 2 ? 0.35 : ear === 1 ? 0.7 : ear === 3 ? 1.25 : 1) * (1 + fluff * 0.12)
  if (ear === 1) return <circle cx={cx} cy={cy - r * 0.35} r={r * 0.42} />
  if (ear === 2) {
    return <ellipse cx={cx - r * 0.1} cy={cy + r * 0.15} rx={r * 0.22} ry={r * 0.48} transform={`rotate(-24 ${cx} ${cy})`} />
  }
  return <path d={`M ${cx - r * 0.05} ${cy + r * 0.15} L ${cx + r * 0.08} ${cy - r * h} L ${cx + r * 0.42} ${cy + r * 0.2} Z`} />
}

function FrontEars({ cx, cy, r, ear, fluff }: { cx: number; cy: number; r: number; ear: CritterLook['ear']; fluff: number }) {
  const h = ear === 3 ? 1.35 : 1.1
  if (ear === 1) {
    return (
      <g>
        <circle cx={cx - r * 0.62} cy={cy - r * 0.58} r={r * (0.34 + fluff * 0.06)} />
        <circle cx={cx + r * 0.62} cy={cy - r * 0.58} r={r * (0.34 + fluff * 0.06)} />
      </g>
    )
  }
  if (ear === 2) {
    return (
      <g>
        <ellipse cx={cx - r * 0.9} cy={cy} rx={r * 0.2} ry={r * 0.42} transform={`rotate(-30 ${cx - r * 0.9} ${cy})`} />
        <ellipse cx={cx + r * 0.9} cy={cy} rx={r * 0.2} ry={r * 0.42} transform={`rotate(30 ${cx + r * 0.9} ${cy})`} />
      </g>
    )
  }
  return (
    <g>
      <path d={`M ${cx - r * 0.45} ${cy - r * 0.25} L ${cx - r * 0.72} ${cy - r * h} L ${cx - r * 0.05} ${cy - r * 0.48} Z`} />
      <path d={`M ${cx + r * 0.45} ${cy - r * 0.25} L ${cx + r * 0.72} ${cy - r * h} L ${cx + r * 0.05} ${cy - r * 0.48} Z`} />
    </g>
  )
}

function FrontEarInners({ cx, cy, r, ear, fill }: { cx: number; cy: number; r: number; ear: CritterLook['ear']; fill: string }) {
  if (ear === 2) return null
  if (ear === 1) {
    return (
      <g fill={fill}>
        <circle cx={cx - r * 0.62} cy={cy - r * 0.58} r={r * 0.16} />
        <circle cx={cx + r * 0.62} cy={cy - r * 0.58} r={r * 0.16} />
      </g>
    )
  }
  return (
    <g fill={fill}>
      <path d={`M ${cx - r * 0.38} ${cy - r * 0.32} L ${cx - r * 0.58} ${cy - r * 0.92} L ${cx - r * 0.16} ${cy - r * 0.48} Z`} />
      <path d={`M ${cx + r * 0.38} ${cy - r * 0.32} L ${cx + r * 0.58} ${cy - r * 0.92} L ${cx + r * 0.16} ${cy - r * 0.48} Z`} />
    </g>
  )
}

function Wings({ y, reach, fill, vein }: { y: number; reach: number; fill: string; vein: string }) {
  const left = `M 80 ${y} C ${80 - reach} ${y - 28}, ${80 - reach - 8} ${y + 6}, 74 ${y + 18} C ${80 - reach * 0.35} ${y + 4}, 66 ${y + 2}, 80 ${y}`
  const right = `M 80 ${y} C ${80 + reach} ${y - 28}, ${80 + reach + 8} ${y + 6}, 86 ${y + 18} C ${80 + reach * 0.35} ${y + 4}, 94 ${y + 2}, 80 ${y}`
  return (
    <g opacity="0.95">
      <path d={left} fill={fill} />
      <path d={right} fill={fill} />
      <path d={`M 80 ${y} Q ${80 - reach * 0.65} ${y - 8} ${80 - reach * 0.8} ${y + 8}`} fill="none" stroke={vein} strokeWidth="1.2" opacity="0.55" />
      <path d={`M 80 ${y} Q ${80 + reach * 0.65} ${y - 8} ${80 + reach * 0.8} ${y + 8}`} fill="none" stroke={vein} strokeWidth="1.2" opacity="0.55" />
    </g>
  )
}

function TailFan({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {[-36, -14, 8, 28].map((rot, i) => (
        <ellipse key={rot} cx={x + 16} cy={y} rx={5.5} ry={13 - i * 0.4} transform={`rotate(${rot} ${x} ${y})`} />
      ))}
    </g>
  )
}

function Horns({ cx, cy, r, color, tall }: { cx: number; cy: number; r: number; color: string; tall: number }) {
  const h = 10 + tall * 16
  return (
    <g fill="none" stroke={color} strokeWidth="3.6" strokeLinecap="round">
      <path d={`M ${cx - r * 0.22} ${cy - r * 0.72} Q ${cx - r * 0.7} ${cy - r - h} ${cx - r * 0.02} ${cy - r * 0.95}`} />
      <path d={`M ${cx + r * 0.34} ${cy - r * 0.62} Q ${cx + r * 0.9} ${cy - r - h * 0.8} ${cx + r * 0.2} ${cy - r * 0.9}`} />
    </g>
  )
}

function Face({ anchor, look, colors }: { anchor: FaceAnchor; look: CritterLook; colors: CritterColors }) {
  const { cx, cy, r, kind } = anchor
  const sly = look.eye === 1 || kind === 'snake' || kind === 'bug'
  const eyeR = r * (kind === 'profile' ? 0.34 : kind === 'spirit' ? 0.3 : sly ? 0.2 : 0.26)
  return (
    <g>
      {kind === 'front' && look.motif > 0.6 && (
        <path
          d={`M ${cx - r * 0.95} ${cy} Q ${cx} ${cy - r * 0.5} ${cx + r * 0.95} ${cy} L ${cx + r * 0.7} ${cy + r * 0.28} Q ${cx} ${cy + r * 0.08} ${cx - r * 0.7} ${cy + r * 0.28} Z`}
          fill={colors.accent}
        />
      )}
      {kind === 'profile' && look.motif > 0.62 && (
        <ellipse cx={cx - r * 0.05} cy={cy - r * 0.02} rx={r * 0.55} ry={r * 0.38} fill={colors.accent} opacity="0.9" />
      )}
      {kind === 'spirit' && <circle cx={cx} cy={cy} r={r * 0.72} fill={colors.accent} opacity="0.14" />}
      {kind === 'profile' ? (
        <Eye x={cx - r * 0.12} y={cy - r * 0.12} eyeR={eyeR} sly={sly} iris={colors.iris} ink={colors.ink} glow={colors.accent} spirit={false} />
      ) : (
        <EyePair cx={cx} cy={cy - r * (kind === 'bug' ? 0.05 : 0.08)} gap={r * (kind === 'bug' ? 0.48 : 0.36)} eyeR={eyeR} sly={sly} colors={colors} spirit={kind === 'spirit'} />
      )}
      {look.blush && kind !== 'bug' && kind !== 'snake' && (
        <ellipse
          cx={kind === 'profile' ? cx + r * 0.22 : cx - r * 0.48}
          cy={cy + r * 0.22}
          rx={r * 0.16}
          ry={r * 0.09}
          fill={colors.accent}
          opacity="0.4"
        />
      )}
      {kind === 'profile' && (
        <path
          d={`M ${cx - r * 0.55} ${cy + r * 0.48} Q ${cx - r * 0.2} ${cy + r * 0.62} ${cx + r * 0.05} ${cy + r * 0.46}`}
          fill="none"
          stroke={colors.ink}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      )}
      {kind === 'snake' && look.snout > 0.4 && (
        <path
          d={`M ${cx - r * 0.7} ${cy + r * 0.35} l -2 7 l -3.2 3.4 m 3.2 -3.4 l 3.2 3.4`}
          fill="none"
          stroke={colors.accent}
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      )}
      {kind === 'front' && (
        <>
          <ellipse cx={cx} cy={cy + r * 0.34} rx={r * 0.1} ry={r * 0.07} fill={colors.ink} />
          <path
            d={`M ${cx - r * 0.16} ${cy + r * 0.48} Q ${cx} ${cy + r * 0.6} ${cx + r * 0.16} ${cy + r * 0.48}`}
            fill="none"
            stroke={colors.ink}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )}
      {kind === 'bug' && (
        <path
          d={`M ${cx - r * 0.2} ${cy + r * 0.28} L ${cx - r * 0.05} ${cy + r * 0.55} M ${cx + r * 0.2} ${cy + r * 0.28} L ${cx + r * 0.05} ${cy + r * 0.55}`}
          stroke={colors.ink}
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
      )}
      {kind === 'spirit' && (
        <path
          d={`M ${cx - r * 0.12} ${cy + r * 0.22} Q ${cx} ${cy + r * 0.36} ${cx + r * 0.12} ${cy + r * 0.22}`}
          fill="none"
          stroke={colors.ink}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      )}
    </g>
  )
}

function EyePair({
  cx,
  cy,
  gap,
  eyeR,
  sly,
  colors,
  spirit,
}: {
  cx: number
  cy: number
  gap: number
  eyeR: number
  sly: boolean
  colors: CritterColors
  spirit: boolean
}) {
  return (
    <g>
      {[-1, 1].map((side) => (
        <Eye
          key={side}
          x={cx + side * gap}
          y={cy}
          eyeR={eyeR}
          sly={sly}
          iris={colors.iris}
          ink={colors.ink}
          glow={colors.accent}
          spirit={spirit}
        />
      ))}
    </g>
  )
}

function Eye({
  x,
  y,
  eyeR,
  sly,
  iris,
  ink,
  glow,
  spirit,
}: {
  x: number
  y: number
  eyeR: number
  sly: boolean
  iris: string
  ink: string
  glow: string
  spirit: boolean
}) {
  return (
    <g>
      {spirit && <circle cx={x} cy={y} r={eyeR * 1.55} fill={glow} opacity="0.28" />}
      {sly ? (
        <ellipse cx={x} cy={y} rx={eyeR * 0.85} ry={eyeR * 1.15} fill="#f4f8ff" />
      ) : (
        <circle cx={x} cy={y} r={eyeR} fill="#f4f8ff" />
      )}
      {sly ? (
        <ellipse cx={x} cy={y + eyeR * 0.08} rx={eyeR * 0.2} ry={eyeR * 0.62} fill={ink} />
      ) : (
        <>
          <circle cx={x + eyeR * 0.08} cy={y + eyeR * 0.1} r={eyeR * 0.52} fill={iris} />
          <circle cx={x + eyeR * 0.1} cy={y + eyeR * 0.12} r={eyeR * 0.26} fill={ink} />
        </>
      )}
      <circle cx={x - eyeR * 0.28} cy={y - eyeR * 0.32} r={Math.max(1, eyeR * 0.18)} fill="#fff" />
    </g>
  )
}

function Markings({ pattern, accent, look }: { pattern: PatternId; accent: string; look: CritterLook }) {
  if (pattern === 'striped') {
    return (
      <g transform={`rotate(${look.stripe.toFixed(1)} 80 90)`} opacity="0.55">
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x={-40 + i * 24} y={-20} width="9" height="220" rx="3" fill={accent} />
        ))}
      </g>
    )
  }
  if (pattern === 'spotted') {
    const rng = mulberry32(look.seed ^ 0x51ed)
    return (
      <g>
        {Array.from({ length: look.spotCount }, (_, i) => (
          <circle
            key={i}
            cx={36 + rng() * 96}
            cy={48 + rng() * 84}
            r={4 + rng() * 5}
            fill={accent}
            opacity={0.4 + rng() * 0.35}
          />
        ))}
      </g>
    )
  }
  if (pattern === 'gradient') {
    return <ellipse cx="64" cy="78" rx="42" ry="36" fill={accent} opacity="0.34" />
  }
  return null
}

function Sigil({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <path d="M0 -7 L5.5 0 L0 8 L-5.5 0 Z" fill={color} />
      <path d="M0 -3.2 L2.4 0 L0 3.6 L-2.4 0 Z" fill="#fff" opacity="0.7" />
    </g>
  )
}

function Sparkles({ seed, color }: { seed: number; color: string }) {
  const rng = mulberry32(seed ^ 0xa11e)
  return (
    <g fill={color}>
      {Array.from({ length: 4 }, (_, i) => {
        const x = 18 + rng() * 124
        const y = 18 + rng() * 118
        const s = 2.8 + rng() * 3
        return (
          <path
            key={i}
            d={`M ${x} ${y - s} L ${x + s * 0.28} ${y - s * 0.28} L ${x + s} ${y} L ${x + s * 0.28} ${y + s * 0.28} L ${x} ${y + s} L ${x - s * 0.28} ${y + s * 0.28} L ${x - s} ${y} L ${x - s * 0.28} ${y - s * 0.28} Z`}
          />
        )
      })}
    </g>
  )
}

function mitten(x: number, y: number, dir: number, drop: number): string {
  const x2 = x + dir * (16 + drop * 0.4)
  const y2 = y + 16 + drop * 0.55
  return `M ${x} ${y}
    C ${x + dir * 10} ${y + 8}, ${x2 - dir * 2} ${y2 - 12}, ${x2} ${y2}
    C ${x2 + dir * 6} ${y2 + 2}, ${x2 + dir * 5} ${y2 + 10}, ${x2 - dir * 2} ${y2 + 8}
    C ${x2 - dir * 8} ${y2 + 6}, ${x + dir * 4} ${y + 18}, ${x} ${y} Z`
}

function bellPath(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${cx - rx} ${cy + 4}
    C ${cx - rx} ${cy - ry}, ${cx - rx * 0.2} ${cy - ry - 8}, ${cx} ${cy - ry + 2}
    C ${cx + rx * 0.2} ${cy - ry - 8}, ${cx + rx} ${cy - ry}, ${cx + rx} ${cy + 4}
    Q ${cx + rx * 0.62} ${cy + ry * 0.15} ${cx + rx * 0.32} ${cy + ry * 0.62}
    Q ${cx} ${cy + ry * 0.2} ${cx - rx * 0.32} ${cy + ry * 0.62}
    Q ${cx - rx * 0.62} ${cy + ry * 0.15} ${cx - rx} ${cy + 4} Z`
}

function smoothPath(pts: Array<{ x: number; y: number }>): string {
  const first = pts[0]
  if (!first) return ''
  let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!
    const p1 = pts[i]!
    const p2 = pts[i + 1]!
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}
