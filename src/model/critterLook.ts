import { hashSeed, mulberry32 } from '../util/rng'
import type { BiomeId, Genome } from './types'

export interface CritterLook {
  seed: number
  build: number
  head: number
  ear: 0 | 1 | 2 | 3
  eye: 0 | 1 | 2
  fluff: number
  motif: number
  tilt: number
  stripe: number
  spotCount: number
  blush: boolean
  snout: number
  limb: number
}

export interface CritterColors {
  primary: string
  secondary: string
  accent: string
  light: string
  belly: string
  ink: string
  iris: string
}

const HUE_BANDS: Record<BiomeId, Array<[number, number]>> = {
  forest_park: [
    [78, 150],
    [18, 42],
  ],
  coast_water: [
    [168, 208],
    [198, 236],
  ],
  urban: [
    [248, 318],
    [186, 222],
  ],
  grassland: [
    [40, 80],
    [90, 128],
  ],
  mixed_neighborhood: [[0, 360]],
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360
  const sat = Math.max(0, Math.min(100, s)) / 100
  const lig = Math.max(0, Math.min(100, l)) / 100
  const a = sat * Math.min(lig, 1 - lig)
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12
    const color = lig - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(0)}${channel(8)}${channel(4)}`
}

function hexChannels(hex: string): [number, number, number] {
  const n = hex.replace('#', '')
  const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)]
}

export function shadeHex(hex: string, amount: number): string {
  const [r, g, b] = hexChannels(hex)
  const mix = (c: number) => {
    const next = amount >= 0 ? c + (255 - c) * amount : c * (1 + amount)
    return Math.max(0, Math.min(255, Math.round(next)))
  }
  const to = (c: number) => mix(c).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexChannels(a)
  const [br, bg, bb] = hexChannels(b)
  const m = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0')
  return `#${m(ar, br)}${m(ag, bg)}${m(ab, bb)}`
}

export function generatePalette(rng: () => number, biome: BiomeId): Genome['palette'] {
  const bands = HUE_BANDS[biome]
  const band = bands[Math.floor(rng() * bands.length)]!
  const hue = band[0] + rng() * (band[1] - band[0])
  const sat = 54 + rng() * 24
  const light = 46 + rng() * 12
  const pop = rng() > 0.74
  const accentHue = pop ? (hue + 150 + rng() * 36) % 360 : (hue + 24 + rng() * 42) % 360
  return {
    primary: hslToHex(hue, sat, light),
    secondary: hslToHex(hue, Math.min(84, sat + 8), Math.max(20, light - 18)),
    accent: hslToHex(accentHue, 64 + rng() * 20, 60 + rng() * 12),
  }
}

export function colorsFromPalette(palette: Genome['palette']): CritterColors {
  return {
    primary: palette.primary,
    secondary: palette.secondary,
    accent: palette.accent,
    light: shadeHex(palette.primary, 0.34),
    belly: mixHex(shadeHex(palette.primary, 0.62), '#fff3e4', 0.42),
    ink: shadeHex(palette.secondary, -0.55),
    iris: mixHex(palette.accent, shadeHex(palette.secondary, -0.35), 0.45),
  }
}

export function visualSeed(genome: Genome): number {
  if (typeof genome.visualSalt === 'number' && Number.isFinite(genome.visualSalt)) {
    return genome.visualSalt >>> 0
  }
  return hashSeed([
    genome.bodyArchetype,
    genome.pattern,
    genome.appendage,
    genome.primaryAffinity,
    genome.secondaryAffinity,
    genome.combatRole,
    genome.statTendencies.power,
    genome.statTendencies.resilience,
    genome.statTendencies.speed,
  ])
}

export function lookFromGenome(genome: Genome): CritterLook {
  const seed = visualSeed(genome)
  const rng = mulberry32(seed)
  return {
    seed,
    build: rng(),
    head: rng(),
    ear: Math.floor(rng() * 4) as CritterLook['ear'],
    eye: Math.floor(rng() * 3) as CritterLook['eye'],
    fluff: rng(),
    motif: rng(),
    tilt: (rng() - 0.5) * 7,
    stripe: rng() * 55 - 20,
    spotCount: 5 + Math.floor(rng() * 7),
    blush: rng() > 0.42,
    snout: rng(),
    limb: rng(),
  }
}
