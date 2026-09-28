import { useLayoutEffect, useRef } from 'react'
import { lookFromGenome } from '../model/critterLook'
import type { Genome, MutationKind } from '../model/types'
import { renderCritterPixels, SPRITE_SIZE } from './pixelCritter'
import { rarityFromScore } from '../model/creatureGen'

interface CritterViewProps {
  genome: Genome
  mutation?: MutationKind
  size?: number
  className?: string
}

export function CritterView({ genome, mutation = 'none', size = 120, className }: CritterViewProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const look = lookFromGenome(genome)
  const rarity = rarityFromScore(genome.rarityScore)

  const scale = Math.max(2, Math.round(size / SPRITE_SIZE))
  const display = SPRITE_SIZE * scale

  useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { pixels, palette } = renderCritterPixels(genome, mutation)
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1))
    canvas.width = display * dpr
    canvas.height = display * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, display, display)
    for (let y = 0; y < SPRITE_SIZE; y++) {
      for (let x = 0; x < SPRITE_SIZE; x++) {
        const id = pixels[y * SPRITE_SIZE + x] ?? 0
        if (id === 0) continue
        const hex = palette[id]
        if (!hex) continue
        ctx.fillStyle = hex
        ctx.fillRect(x * scale, y * scale, scale, scale)
      }
    }
  }, [genome, mutation, display, scale])

  return (
    <canvas
      ref={ref}
      className={`critter-pixel critter-${rarity}${className ? ` ${className}` : ''}`}
      style={{
        width: display,
        height: display,
        ['--bob' as string]: `${scale}px`,
        animationDuration: `${(1.5 + look.build * 0.7).toFixed(2)}s`,
        animationDelay: `${(-look.motif * 1.4).toFixed(2)}s`,
      }}
      role="img"
      aria-label={`${genome.bodyArchetype} critter`}
    />
  )
}
