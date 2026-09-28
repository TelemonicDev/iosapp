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

  useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { pixels, palette } = renderCritterPixels(genome, mutation)
    const image = ctx.createImageData(SPRITE_SIZE, SPRITE_SIZE)
    for (let i = 0; i < pixels.length; i++) {
      const hex = palette[pixels[i] ?? 0]
      const offset = i * 4
      if (!hex || (pixels[i] ?? 0) === 0) {
        image.data[offset + 3] = 0
        continue
      }
      const n = Number.parseInt(hex.slice(1), 16)
      image.data[offset] = (n >> 16) & 255
      image.data[offset + 1] = (n >> 8) & 255
      image.data[offset + 2] = n & 255
      image.data[offset + 3] = 255
    }
    ctx.putImageData(image, 0, 0)
  }, [genome, mutation])

  return (
    <canvas
      ref={ref}
      width={SPRITE_SIZE}
      height={SPRITE_SIZE}
      className={`critter-pixel critter-${rarity}${className ? ` ${className}` : ''}`}
      style={{
        width: size,
        height: size,
        animationDuration: `${(1.5 + look.build * 0.7).toFixed(2)}s`,
        animationDelay: `${(-look.motif * 1.4).toFixed(2)}s`,
      }}
      role="img"
      aria-label={`${genome.bodyArchetype} critter`}
    />
  )
}
