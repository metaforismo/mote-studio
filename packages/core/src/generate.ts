import {
  COLORS,
  DEFAULT_CONFIG,
  MOTION_IDS,
  normalizeHexColor,
  type MoteConfig,
} from './presets.js'
import { EYE_IDS } from './eyes.js'
import { SHAPE_IDS } from './shapes.js'

export type MoteOverrides = Partial<
  Pick<
    MoteConfig,
    'shapeId' | 'eyeStyle' | 'color' | 'motion' | 'autoMorph' | 'autoEyes'
  >
>

const hashSeed = (seed: string): number => {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const mulberry32 = (seed: number) => () => {
  let value = (seed += 0x6d2b79f5)
  value = Math.imul(value ^ (value >>> 15), value | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296
}

const pick = <T>(items: readonly T[], random: () => number): T => {
  const item = items[Math.floor(random() * items.length)]
  if (item === undefined)
    throw new Error('Cannot select from an empty preset list')
  return item
}

/** Generate the same Mote configuration for the same seed and overrides. */
export const generateMoteConfig = (
  seed: string,
  overrides: MoteOverrides = {},
): MoteConfig => {
  const normalizedSeed = seed.trim()
  if (!normalizedSeed) throw new Error('A non-empty seed is required')

  const random = mulberry32(hashSeed(normalizedSeed))
  return {
    shapeId: overrides.shapeId ?? pick(SHAPE_IDS, random),
    eyeStyle: overrides.eyeStyle ?? pick(EYE_IDS, random),
    color:
      overrides.color === undefined
        ? pick(COLORS, random).value
        : normalizeHexColor(overrides.color),
    motion: overrides.motion ?? pick(MOTION_IDS, random),
    autoMorph: overrides.autoMorph ?? DEFAULT_CONFIG.autoMorph,
    autoEyes: overrides.autoEyes ?? DEFAULT_CONFIG.autoEyes,
  }
}
