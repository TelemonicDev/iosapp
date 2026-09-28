import { rarityFromScore } from '../model/creatureGen'
import { colorsFromPalette, lookFromGenome, mixHex, shadeHex, type CritterLook } from '../model/critterLook'
import type { AppendageId, BodyArchetype, Genome, MutationKind, PatternId } from '../model/types'
import { mulberry32 } from '../util/rng'

export const SPRITE_SIZE = 32

const EMPTY = 0
const BODY = 1
const SHADE = 2
const LITE = 3
const BELLY = 4
const ACCENT = 5
const BLUSH = 6
const WHITE = 7
const IRIS = 8
const PUPIL = 9
const INK = 10
const STAGE = 11
const RIM = 12
const SHADOW = 13
const SHINE = 14

const FILLED = new Set([BODY, SHADE, LITE, BELLY, ACCENT, BLUSH, WHITE, IRIS, PUPIL, INK, SHINE])

interface Anchor {
  kind: 'profile' | 'front' | 'snake' | 'spirit' | 'bug'
  x: number
  y: number
  r: number
  hornX: number
  hornY: number
}

class Pix {
  cells = new Uint8Array(SPRITE_SIZE * SPRITE_SIZE)

  get(x: number, y: number): number {
    const xi = Math.round(x)
    const yi = Math.round(y)
    if (xi < 0 || yi < 0 || xi >= SPRITE_SIZE || yi >= SPRITE_SIZE) return EMPTY
    return this.cells[yi * SPRITE_SIZE + xi] ?? EMPTY
  }

  set(x: number, y: number, color: number) {
    const xi = Math.round(x)
    const yi = Math.round(y)
    if (xi < 0 || yi < 0 || xi >= SPRITE_SIZE || yi >= SPRITE_SIZE || color === EMPTY) return
    this.cells[yi * SPRITE_SIZE + xi] = color
  }

  paint(x: number, y: number, color: number) {
    if (this.get(x, y) === EMPTY) return
    this.set(x, y, color)
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: number) {
    if (rx <= 0 || ry <= 0) return
    const x0 = Math.floor(cx - rx - 1)
    const x1 = Math.ceil(cx + rx + 1)
    const y0 = Math.floor(cy - ry - 1)
    const y1 = Math.ceil(cy + ry + 1)
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / rx
        const dy = (y + 0.5 - cy) / ry
        if (dx * dx + dy * dy <= 1) this.set(x, y, color)
      }
    }
  }

  tri(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, color: number) {
    const minX = Math.floor(Math.min(ax, bx, cx))
    const maxX = Math.ceil(Math.max(ax, bx, cx))
    const minY = Math.floor(Math.min(ay, by, cy))
    const maxY = Math.ceil(Math.max(ay, by, cy))
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (insideTri(x + 0.5, y + 0.5, ax, ay, bx, by, cx, cy)) this.set(x, y, color)
      }
    }
  }
}

function insideTri(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): boolean {
  const v0x = cx - ax
  const v0y = cy - ay
  const v1x = bx - ax
  const v1y = by - ay
  const v2x = px - ax
  const v2y = py - ay
  const dot00 = v0x * v0x + v0y * v0y
  const dot01 = v0x * v1x + v0y * v1y
  const dot02 = v0x * v2x + v0y * v2y
  const dot11 = v1x * v1x + v1y * v1y
  const dot12 = v1x * v2x + v1y * v2y
  const denom = dot00 * dot11 - dot01 * dot01
  if (denom === 0) return false
  const inv = 1 / denom
  const u = (dot11 * dot02 - dot01 * dot12) * inv
  const v = (dot00 * dot12 - dot01 * dot02) * inv
  return u >= -0.02 && v >= -0.02 && u + v <= 1.02
}

function band(t: number, steps: number): number {
  if (steps <= 1) return 0
  const n = Math.max(0, Math.min(0.999, t))
  return Math.min(steps - 1, Math.floor(n * steps))
}

function bodyish(v: number): boolean {
  return v === BODY || v === SHADE || v === LITE
}

export function renderCritterPixels(
  genome: Genome,
  mutation: MutationKind,
): { size: number; pixels: Uint8Array; palette: string[] } {
  const look = lookFromGenome(genome)
  const colors = colorsFromPalette(genome.palette)
  const pix = new Pix()
  const anchor = drawCreature(pix, genome.bodyArchetype, genome.appendage, look)
  rimLight(pix)
  applyPattern(pix, genome.pattern, look)
  if (genome.appendage === 'horns') horns(pix, anchor, look)
  outline(pix)
  drawFace(pix, anchor, look)
  shine(pix, anchor)
  if (mutation === 'trait') sigil(pix, anchor)

  const dx = look.tilt > 2.2 ? 1 : look.tilt < -2.2 ? -1 : 0
  const shifted = shiftX(pix.cells, dx)
  const rarity = rarityFromScore(genome.rarityScore)
  const pixels = composite(shifted, look, rarity, mutation)
  return { size: SPRITE_SIZE, pixels, palette: buildPalette(colors) }
}

function buildPalette(colors: ReturnType<typeof colorsFromPalette>): string[] {
  const palette = Array.from({ length: 15 }, () => '#000000')
  palette[BODY] = colors.primary
  palette[SHADE] = shadeHex(colors.secondary, -0.08)
  palette[LITE] = shadeHex(colors.light, 0.18)
  palette[BELLY] = mixHex(colors.belly, '#fff6ea', 0.35)
  palette[ACCENT] = colors.accent
  palette[BLUSH] = mixHex(colors.primary, '#ff8fab', 0.62)
  palette[WHITE] = '#fffdf8'
  palette[IRIS] = mixHex(colors.accent, '#2a211c', 0.28)
  palette[PUPIL] = '#2a211c'
  palette[INK] = mixHex('#2a211c', colors.secondary, 0.18)
  palette[STAGE] = mixHex(colors.light, '#fff7ec', 0.8)
  palette[RIM] = mixHex(colors.primary, '#f3e4cc', 0.35)
  palette[SHADOW] = mixHex(mixHex(colors.primary, '#c8b496', 0.55), '#2a211c', 0.18)
  palette[SHINE] = '#fffdf8'
  return palette
}

function drawCreature(pix: Pix, archetype: BodyArchetype, appendage: AppendageId, look: CritterLook): Anchor {
  if (archetype === 'biped') return biped(pix, appendage, look)
  if (archetype === 'serpentine') return serpent(pix, appendage, look)
  if (archetype === 'floating') return floater(pix, appendage, look)
  if (archetype === 'armored') return armored(pix, appendage, look)
  return quadruped(pix, appendage, look)
}

function quadruped(pix: Pix, appendage: AppendageId, look: CritterLook): Anchor {
  const chubby = band(look.build, 3)
  const hx = 11
  const hy = 14
  const hr = 5.6 + band(look.head, 3) * 0.55
  const bx = 19
  const by = 18
  const brx = 6.4 + chubby
  const bry = 4.6 + (chubby > 1 ? 1 : 0)

  if (appendage === 'wings') backWing(pix, 22, 13)
  if (appendage === 'tail_fan') tailFan(pix, 24, 16)
  else curlTail(pix, 24, 15, band(look.motif, 2))

  leg(pix, 20, 20, 26, 2)
  leg(pix, 14, 20, 25 + band(look.limb, 2), 2)
  pix.ellipse(bx, by, brx, bry, BODY)
  sideEar(pix, hx, hy, hr, look.ear)
  pix.ellipse(hx, hy, hr, hr * 0.96, BODY)
  const snoot = 2.3 + band(look.snout, 3) * 0.7
  pix.ellipse(hx - hr * 0.72, hy + 2.2, snoot, 2.05, BELLY)
  pix.ellipse(bx - 1, by + 2, brx * 0.48, bry * 0.42, BELLY)
  if (look.fluff > 0.58) pix.ellipse(hx + 1, hy + 3, 2.2, 1.8, BODY)
  innerEar(pix, hx + 0.4, hy - hr * 0.72, look.ear, 1)

  return { kind: 'profile', x: hx - 1, y: hy - 1, r: hr, hornX: hx + 1, hornY: hy - hr + 1 }
}

function biped(pix: Pix, appendage: AppendageId, look: CritterLook): Anchor {
  const chubby = band(look.build, 3)
  const hx = 16
  const hy = 12
  const hr = 6.6 + band(look.head, 3) * 0.45
  const by = 21
  const brx = 4.3 + chubby * 0.7

  if (appendage === 'wings') wingPair(pix, hx, 17, 3 + band(look.limb, 2))
  if (appendage === 'tail_fan') tailFan(pix, hx + 2, 22)
  else curlTail(pix, hx + 4, 20, 1)

  const reach = 3 + band(look.limb, 3)
  arm(pix, hx - brx - 0.2, 18, reach, -1)
  arm(pix, hx + brx + 0.2, 18, reach, 1)
  pix.ellipse(hx - 3.3, 26.2, 2.15, 1.45, BODY)
  pix.ellipse(hx + 3.3, 26.2, 2.15, 1.45, BODY)
  pix.set(hx - 4, 27, SHADE)
  pix.set(hx + 3, 27, SHADE)
  pix.ellipse(hx, by, brx, 3.8 + (chubby > 1 ? 0.6 : 0), BODY)
  frontEars(pix, hx, hy, hr, look.ear)
  pix.ellipse(hx, hy, hr, hr * 0.98, BODY)
  pix.ellipse(hx, by + 1.4, brx * 0.55, 2.1, BELLY)
  if (look.snout > 0.45) pix.ellipse(hx, hy + hr * 0.42, 2.4 + look.snout, 1.7, BELLY)
  if (look.fluff > 0.62) {
    pix.ellipse(hx - hr * 0.7, hy + 2, 1.7, 1.5, BODY)
    pix.ellipse(hx + hr * 0.7, hy + 2, 1.7, 1.5, BODY)
  }
  innerEar(pix, hx - hr * 0.55, hy - hr * 0.78, look.ear, -1)
  innerEar(pix, hx + hr * 0.55, hy - hr * 0.78, look.ear, 1)

  return { kind: 'front', x: hx, y: hy + 0.5, r: hr, hornX: hx, hornY: hy - hr + 1 }
}

function serpent(pix: Pix, appendage: AppendageId, look: CritterLook): Anchor {
  const chubby = band(look.build, 3)
  const radius = 2.15 + chubby * 0.28
  const head = { x: 18, y: 9 }
  const neck = { x: head.x + 1, y: head.y + 4 }
  const pts = [neck, { x: 11, y: 15 }, { x: 21, y: 20 }, { x: 14, y: 25 }]
  if (appendage === 'wings') wingPair(pix, 16, 15, 2)
  strokeChain(pix, [...pts].reverse(), radius, BODY)
  strokeChain(
    pix,
    pts.map((p) => ({ x: p.x + 0.4, y: p.y + 0.7 })),
    Math.max(1.15, radius * 0.42),
    BELLY,
  )
  const hr = 4.15
  if (look.fluff > 0.6) pix.ellipse(head.x, head.y - 1.5, hr * 0.7, 2.2, BODY)
  pix.ellipse(head.x, head.y, hr, hr * 0.95, BODY)
  pix.ellipse(head.x - 2.6, head.y + 1.3, 2.15 + band(look.snout, 2) * 0.35, 1.45, BELLY)
  if (look.snout > 0.4) tongue(pix, head.x - hr - 0.5, head.y + 2)
  if (appendage === 'tail_fan') tailFan(pix, pts[3]!.x, pts[3]!.y)
  return { kind: 'snake', x: head.x - 0.2, y: head.y, r: hr, hornX: head.x, hornY: head.y - hr + 1 }
}

function floater(pix: Pix, appendage: AppendageId, look: CritterLook): Anchor {
  const chubby = band(look.build, 3)
  const cx = 16
  const cy = 13
  const rx = 7.2 + chubby * 0.8
  const ry = 5.6 + (chubby > 1 ? 0.5 : 0)
  if (appendage === 'wings') wingPair(pix, cx, cy + 1, 4)
  if (appendage === 'tail_fan') tailFan(pix, cx - 1, cy + 4)
  pix.ellipse(cx, cy, rx, ry, BODY)
  if (look.fluff > 0.5) {
    pix.tri(cx - 2, cy - ry + 1, cx, cy - ry - 3.2, cx + 2, cy - ry + 1, BODY)
  }
  const count = 3 + (look.motif > 0.66 ? 1 : 0)
  const len = 6 + band(look.limb, 2)
  const span = 3
  for (let i = 0; i < count; i++) {
    const x = Math.round(cx - ((count - 1) * span) / 2 + i * span)
    tentacle(pix, x, cy + ry - 1, len - (i % 2), i % 2 === 0 ? -1 : 1)
  }
  pix.ellipse(cx, cy + 1, rx * 0.32, ry * 0.28, BELLY)
  return { kind: 'spirit', x: cx, y: cy - 0.5, r: Math.min(rx, ry), hornX: cx, hornY: cy - ry + 1 }
}

function armored(pix: Pix, appendage: AppendageId, look: CritterLook): Anchor {
  const chubby = band(look.build, 3)
  const cx = 16
  const cy = 14
  const rx = 9.2 + chubby * 0.5
  const ry = 6.4
  const hy = 23
  if (appendage === 'wings') wingPair(pix, cx, cy, 3)
  if (appendage === 'tail_fan') tailFan(pix, cx, cy + 4)
  pix.ellipse(cx, hy, 3.8 + look.head, 3.3, BODY)
  pix.ellipse(cx, cy, rx, ry, BODY)
  for (let i = 0; i < 3; i++) {
    bugLeg(pix, cx - 7, cy + 1 + i * 3, -1)
    bugLeg(pix, cx + 7, cy + 1 + i * 3, 1)
  }
  for (let y = Math.round(cy - ry + 2); y <= Math.round(cy + ry - 2); y++) {
    if (pix.get(cx, y) === BODY) pix.set(cx, y, SHADE)
  }
  for (let x = Math.round(cx - 4); x <= Math.round(cx + 4); x++) {
    if (pix.get(x, cy - 1) === BODY) pix.set(x, cy - 1, SHADE)
  }
  pix.ellipse(cx, hy + 1.5, 2.2, 1.3, BELLY)
  antenna(pix, cx - 2, cy - ry + 1, -1)
  antenna(pix, cx + 2, cy - ry + 1, 1)
  return { kind: 'bug', x: cx, y: hy - 0.2, r: 3.6, hornX: cx, hornY: cy - ry + 2 }
}

function sideEar(pix: Pix, hx: number, hy: number, hr: number, ear: CritterLook['ear']) {
  if (ear === 1) {
    pix.ellipse(hx + 1, hy - hr + 1.2, 2.7, 2.5, BODY)
    return
  }
  if (ear === 2) {
    pix.ellipse(hx + hr * 0.55, hy - 1, 1.8, 3.4, BODY)
    return
  }
  const tall = ear === 3 ? 5.5 : 3.6
  pix.tri(hx - 0.2, hy - hr * 0.2, hx + 0.2, hy - hr - tall, hx + hr * 0.55, hy - hr * 0.15, BODY)
}

function frontEars(pix: Pix, cx: number, cy: number, hr: number, ear: CritterLook['ear']) {
  if (ear === 1) {
    pix.ellipse(cx - hr * 0.62, cy - hr * 0.62, 2.5, 2.4, BODY)
    pix.ellipse(cx + hr * 0.62, cy - hr * 0.62, 2.5, 2.4, BODY)
    return
  }
  if (ear === 2) {
    pix.ellipse(cx - hr * 0.95, cy - 0.5, 1.7, 2.8, BODY)
    pix.ellipse(cx + hr * 0.95, cy - 0.5, 1.7, 2.8, BODY)
    return
  }
  const tall = ear === 3 ? hr * 0.95 : hr * 0.62
  pix.tri(cx - hr * 0.15, cy - hr * 0.35, cx - hr * 0.72, cy - hr * 0.15 - tall, cx - hr * 0.85, cy - hr * 0.05, BODY)
  pix.tri(cx + hr * 0.15, cy - hr * 0.35, cx + hr * 0.72, cy - hr * 0.15 - tall, cx + hr * 0.85, cy - hr * 0.05, BODY)
}

function innerEar(pix: Pix, x: number, y: number, ear: CritterLook['ear'], dir: number) {
  if (ear === 2) {
    pix.set(x, y + 1, ACCENT)
    pix.set(x + dir, y + 2, ACCENT)
    return
  }
  pix.set(x, y, ACCENT)
  pix.set(x + dir * 0.6, y + 1, ACCENT)
}

function leg(pix: Pix, x: number, y0: number, y1: number, w: number) {
  for (let y = y0; y <= y1; y++) {
    for (let i = 0; i < w; i++) pix.set(x + i, y, BODY)
  }
  pix.set(x - 1, y1, BODY)
  pix.set(x + w, y1, BODY)
  pix.set(x - 1, y1 + 1, BODY)
  pix.set(x + w, y1 + 1, BODY)
  for (let i = 0; i < w; i++) pix.set(x + i, y1 + 1, BODY)
  pix.set(x, y1 + 1, SHADE)
}

function arm(pix: Pix, x: number, y: number, len: number, dir: number) {
  for (let i = 0; i < len; i++) {
    pix.set(x + dir * Math.floor(i / 2), y + i, BODY)
    pix.set(x + dir * Math.floor(i / 2) + dir, y + i, BODY)
  }
  const hx = x + dir * Math.floor(len / 2)
  const hy = y + len
  pix.ellipse(hx, hy, 1.7, 1.45, BODY)
}

function curlTail(pix: Pix, x: number, y: number, lift: number) {
  pix.ellipse(x, y, 1.9, 1.45, BODY)
  pix.ellipse(x + 2, y - 2 - lift, 1.55, 1.35, BODY)
  pix.ellipse(x + 3, y - 4 - lift, 1.25, 1.15, BODY)
  pix.set(x + 3, y - 5 - lift, ACCENT)
}

function tailFan(pix: Pix, x: number, y: number) {
  pix.ellipse(x + 1, y - 3, 1.45, 2.3, BODY)
  pix.ellipse(x + 3.2, y - 1, 1.4, 2.1, BODY)
  pix.ellipse(x + 2.2, y + 2, 1.35, 1.9, BODY)
  pix.set(x + 1, y - 5, ACCENT)
  pix.set(x + 4, y - 2, ACCENT)
  pix.set(x + 3, y + 3, ACCENT)
}

function wingPair(pix: Pix, x: number, y: number, reach: number) {
  wing(pix, x, y, -1, reach)
  wing(pix, x, y, 1, reach)
}

function wing(pix: Pix, x: number, y: number, dir: number, reach: number) {
  const tip = 8 + reach
  pix.tri(x, y - 1, x + dir * tip, y - 6, x + dir * (tip - 2), y, ACCENT)
  pix.tri(x + dir * 2, y, x + dir * (tip - 1), y + 2, x + dir * (tip - 4), y + 6, ACCENT)
  pix.set(x + dir * (tip - 2), y - 5, LITE)
}

function backWing(pix: Pix, x: number, y: number) {
  pix.tri(x, y, x + 7, y - 8, x + 9, y - 1, ACCENT)
  pix.tri(x + 1, y, x + 8, y, x + 6, y + 4, ACCENT)
  pix.set(x + 6, y - 6, LITE)
}

function strokeChain(pix: Pix, pts: Array<{ x: number; y: number }>, radius: number, color: number) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!
    const b = pts[i + 1]!
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)))
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      pix.ellipse(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, radius, radius * 0.94, color)
    }
  }
}

function tentacle(pix: Pix, x: number, y: number, len: number, lean: number) {
  for (let i = 0; i < len; i++) {
    const sway = i > len - 3 ? lean : 0
    pix.set(x + sway, y + i, BODY)
    pix.set(x + 1 + sway, y + i, BODY)
  }
  pix.set(x + lean, y + len, ACCENT)
  pix.set(x + 1 + lean, y + len, ACCENT)
}

function bugLeg(pix: Pix, x: number, y: number, dir: number) {
  pix.set(x, y, BODY)
  pix.set(x + dir, y, BODY)
  pix.set(x + dir * 2, y + 1, BODY)
  pix.set(x + dir * 2, y + 2, BODY)
  pix.set(x + dir * 3, y + 2, ACCENT)
}

function antenna(pix: Pix, x: number, y: number, dir: number) {
  pix.set(x, y, BODY)
  pix.set(x + dir, y - 1, BODY)
  pix.set(x + dir, y - 2, ACCENT)
}

function horns(pix: Pix, anchor: Anchor, look: CritterLook) {
  const h = 3 + band(look.head, 3)
  const x = Math.round(anchor.hornX)
  const y = Math.round(anchor.hornY)
  spike(pix, x - 2, y, h, -1)
  spike(pix, x + 2, y, Math.max(2, h - 1), 1)
}

function spike(pix: Pix, x: number, y: number, h: number, dir: number) {
  for (let i = 0; i < h; i++) {
    const px = x + dir * Math.floor((i + 1) / 2)
    const py = y - i
    pix.set(px, py, ACCENT)
    pix.set(px + (dir > 0 ? 1 : 0), py, ACCENT)
  }
}

function rimLight(pix: Pix) {
  const next = pix.cells.slice()
  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      if (pix.get(x, y) !== BODY) continue
      const above = pix.get(x, y - 2)
      const below = pix.get(x, y + 2)
      if (!bodyish(above) && above !== BELLY && bodyish(below)) next[y * SPRITE_SIZE + x] = LITE
      else if (!bodyish(below) && below !== BELLY && (bodyish(above) || above === BELLY)) next[y * SPRITE_SIZE + x] = SHADE
    }
  }
  pix.cells = next
}

function applyPattern(pix: Pix, pattern: PatternId, look: CritterLook) {
  if (pattern === 'striped') {
    const phase = Math.round(look.stripe / 12)
    for (let y = 0; y < SPRITE_SIZE; y++) {
      for (let x = 0; x < SPRITE_SIZE; x++) {
        if (!bodyish(pix.get(x, y))) continue
        if ((x + phase) % 3 === 0) pix.set(x, y, ACCENT)
      }
    }
    return
  }
  if (pattern === 'spotted') {
    const rng = mulberry32(look.seed ^ 0x51ed)
    const count = 3 + Math.floor(look.spotCount / 3)
    for (let i = 0; i < count; i++) {
      const x = 4 + Math.floor(rng() * 24)
      const y = 6 + Math.floor(rng() * 18)
      if (!bodyish(pix.get(x, y))) continue
      pix.set(x, y, ACCENT)
      if (bodyish(pix.get(x + 1, y))) pix.set(x + 1, y, ACCENT)
      if (i % 2 === 0 && bodyish(pix.get(x, y + 1))) pix.set(x, y + 1, ACCENT)
    }
    return
  }
  if (pattern === 'gradient') {
    let minY = SPRITE_SIZE
    let maxY = 0
    for (let y = 0; y < SPRITE_SIZE; y++) {
      for (let x = 0; x < SPRITE_SIZE; x++) {
        if (!bodyish(pix.get(x, y))) continue
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }
    const span = Math.max(1, maxY - minY)
    for (let y = 0; y < SPRITE_SIZE; y++) {
      for (let x = 0; x < SPRITE_SIZE; x++) {
        if (!bodyish(pix.get(x, y))) continue
        const t = (y - minY) / span
        if (t < 0.34) pix.set(x, y, LITE)
        else if (t > 0.7) pix.set(x, y, SHADE)
      }
    }
  }
}

function outline(pix: Pix) {
  const marks: Array<[number, number]> = []
  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      if (pix.get(x, y) !== EMPTY) continue
      if (
        FILLED.has(pix.get(x - 1, y)) ||
        FILLED.has(pix.get(x + 1, y)) ||
        FILLED.has(pix.get(x, y - 1)) ||
        FILLED.has(pix.get(x, y + 1))
      ) {
        marks.push([x, y])
      }
    }
  }
  for (const [x, y] of marks) pix.set(x, y, INK)
}

function drawFace(pix: Pix, anchor: Anchor, look: CritterLook) {
  if (anchor.kind === 'profile') {
    const sly = look.eye === 1
    eye(pix, anchor.x - 1, anchor.y - 1, sly ? 'happy' : look.eye === 2 ? 'glossy' : 'round')
    pix.paint(anchor.x - anchor.r * 0.85, anchor.y + anchor.r * 0.45, ACCENT)
    smile(pix, anchor.x - 2, anchor.y + anchor.r * 0.55, 1)
    if (look.blush) blush(pix, anchor.x + 1, anchor.y + 2)
    if (look.snout > 0.55) {
      pix.paint(anchor.x - anchor.r - 1, anchor.y + 2, ACCENT)
    }
    return
  }
  if (anchor.kind === 'snake') {
    eye(pix, anchor.x - 2, anchor.y - 2, 'tiny')
    smile(pix, anchor.x - 1, anchor.y + 2, 0)
    return
  }
  const style = anchor.kind === 'bug' ? 'tiny' : look.eye === 1 ? 'happy' : look.eye === 2 ? 'glossy' : 'round'
  const gap = anchor.kind === 'bug' ? 3 : 5
  const ey = anchor.y - (anchor.kind === 'bug' ? 1 : 2)
  eye(pix, anchor.x - gap - 1, ey, style)
  eye(pix, anchor.x + gap - 2, ey, style)
  if (anchor.kind !== 'spirit') pix.paint(anchor.x, anchor.y + 2, ACCENT)
  smile(pix, anchor.x - 1, anchor.y + (anchor.kind === 'bug' ? 2 : 3), 0)
  if (look.blush && anchor.kind !== 'bug') {
    blush(pix, anchor.x - gap - 3, ey + 3)
    blush(pix, anchor.x + gap + 1, ey + 3)
  }
}

function eye(pix: Pix, x: number, y: number, style: 'round' | 'glossy' | 'happy' | 'slit' | 'tiny') {
  const xi = Math.round(x)
  const yi = Math.round(y)
  if (style === 'happy') {
    pix.paint(xi, yi, PUPIL)
    pix.paint(xi + 3, yi, PUPIL)
    pix.paint(xi + 1, yi + 1, PUPIL)
    pix.paint(xi + 2, yi + 1, PUPIL)
    return
  }
  if (style === 'slit') {
    pix.paint(xi, yi, WHITE)
    pix.paint(xi + 1, yi, WHITE)
    pix.paint(xi, yi + 1, IRIS)
    pix.paint(xi + 1, yi + 1, PUPIL)
    pix.paint(xi, yi + 2, WHITE)
    pix.paint(xi + 1, yi + 2, WHITE)
    return
  }
  if (style === 'tiny') {
    pix.paint(xi, yi, WHITE)
    pix.paint(xi + 1, yi, WHITE)
    pix.paint(xi, yi + 1, IRIS)
    pix.paint(xi + 1, yi + 1, PUPIL)
    pix.paint(xi, yi, SHINE)
    return
  }
  for (let dy = 0; dy < 4; dy++) {
    for (let dx = 0; dx < 4; dx++) pix.paint(xi + dx, yi + dy, WHITE)
  }
  if (style === 'glossy') {
    pix.paint(xi + 2, yi + 2, IRIS)
    pix.paint(xi + 2, yi + 1, PUPIL)
  } else {
    pix.paint(xi + 1, yi + 1, IRIS)
    pix.paint(xi + 2, yi + 1, IRIS)
    pix.paint(xi + 1, yi + 2, PUPIL)
    pix.paint(xi + 2, yi + 2, PUPIL)
  }
  pix.paint(xi + 1, yi + 1, SHINE)
}

function smile(pix: Pix, x: number, y: number, lean: number) {
  const xi = Math.round(x)
  const yi = Math.round(y)
  pix.paint(xi - 1, yi, PUPIL)
  pix.paint(xi, yi + 1, PUPIL)
  pix.paint(xi + 1 + lean, yi, PUPIL)
}

function blush(pix: Pix, x: number, y: number) {
  pix.paint(x, y, BLUSH)
  pix.paint(x + 1, y, BLUSH)
}

function tongue(pix: Pix, x: number, y: number) {
  const xi = Math.round(x)
  const yi = Math.round(y)
  if (pix.get(xi + 1, yi) === EMPTY && pix.get(xi + 2, yi) === EMPTY) return
  pix.set(xi, yi, ACCENT)
  pix.set(xi - 1, yi + 1, ACCENT)
  pix.set(xi - 2, yi + 2, ACCENT)
  pix.set(xi - 1, yi + 2, ACCENT)
}

function shine(pix: Pix, anchor: Anchor) {
  const x = Math.round(anchor.x - anchor.r * 0.35)
  const y = Math.round(anchor.y - anchor.r * 0.45)
  if (pix.get(x, y) === LITE || pix.get(x, y) === BODY) pix.set(x, y, SHINE)
}

function sigil(pix: Pix, anchor: Anchor) {
  let x = Math.round(anchor.hornX)
  let y = Math.round(anchor.hornY - anchor.r * 0.35)
  for (let i = 0; i < 4; i++) {
    if (pix.get(x, y) === EMPTY) break
    y -= 1
  }
  pix.set(x, y - 1, ACCENT)
  pix.set(x - 1, y, ACCENT)
  pix.set(x, y, SHINE)
  pix.set(x + 1, y, ACCENT)
  pix.set(x, y + 1, ACCENT)
}

function shiftX(cells: Uint8Array, dx: number): Uint8Array {
  if (dx === 0) return cells
  const next = new Uint8Array(cells.length)
  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      const v = cells[y * SPRITE_SIZE + x] ?? EMPTY
      const nx = x + dx
      if (v !== EMPTY && nx >= 0 && nx < SPRITE_SIZE) next[y * SPRITE_SIZE + nx] = v
    }
  }
  return next
}

function composite(critter: Uint8Array, look: CritterLook, rarity: ReturnType<typeof rarityFromScore>, mutation: MutationKind): Uint8Array {
  const out = new Uint8Array(SPRITE_SIZE * SPRITE_SIZE)
  const cx = 15.5
  const cy = 15.5
  const r = 13.6
  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      const d = Math.hypot(dx, dy)
      if (d > r) continue
      const rim = d > r - 1.15
      if (rim && rarity === 'rare') out[y * SPRITE_SIZE + x] = ACCENT
      else if (rim && rarity === 'uncommon' && (x + y) % 2 === 0) out[y * SPRITE_SIZE + x] = ACCENT
      else out[y * SPRITE_SIZE + x] = rim ? RIM : STAGE
    }
  }
  for (let y = 24; y <= 28; y++) {
    for (let x = 8; x <= 24; x++) {
      const dx = (x - 16) / 7
      const dy = (y - 26.5) / 1.7
      if (dx * dx + dy * dy > 1) continue
      const i = y * SPRITE_SIZE + x
      if (out[i] === STAGE) out[i] = SHADOW
    }
  }
  for (let i = 0; i < critter.length; i++) {
    if ((critter[i] ?? EMPTY) !== EMPTY) out[i] = critter[i]!
  }
  if (mutation === 'cosmetic') sparkles(out, look.seed)
  return out
}

function sparkles(pixels: Uint8Array, seed: number) {
  const rng = mulberry32(seed ^ 0xa11e)
  const spots = [
    [5, 6],
    [25, 5],
    [6, 24],
    [26, 23],
    [16, 3],
  ]
  for (let n = 0; n < 3; n++) {
    const spot = spots[Math.floor(rng() * spots.length)]!
    const x = spot[0] + Math.floor(rng() * 2)
    const y = spot[1]
    plus(pixels, x, y, n === 1 ? SHINE : ACCENT)
  }
}

function plus(pixels: Uint8Array, x: number, y: number, color: number) {
  const stamp = (px: number, py: number) => {
    if (px < 0 || py < 0 || px >= SPRITE_SIZE || py >= SPRITE_SIZE) return
    const i = py * SPRITE_SIZE + px
    const cur = pixels[i] ?? EMPTY
    if (cur === EMPTY || cur === STAGE || cur === RIM || cur === SHADOW) pixels[i] = color
  }
  stamp(x, y)
  stamp(x - 1, y)
  stamp(x + 1, y)
  stamp(x, y - 1)
  stamp(x, y + 1)
}
