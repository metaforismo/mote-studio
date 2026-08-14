import {
  COLORS,
  DEFAULT_CONFIG,
  MOTION_IDS,
  SURFACE_IDS,
  normalizeHexColor,
  normalizeSurface,
  type MoteConfig,
  type SurfaceOverrides,
} from './presets.js'
import { EYE_IDS } from './eyes.js'
import {
  AVATAR_STATE_IDS,
  avatarStateById,
  normalizeFaceRig,
  type FaceRigOverrides,
} from './face-rig.js'
import { SHAPE_IDS } from './shapes.js'

export type MoteOverrides = Omit<Partial<MoteConfig>, 'face' | 'surface'> & {
  face?: FaceRigOverrides
  surface?: SurfaceOverrides
}

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
  const state = overrides.state ?? pick(AVATAR_STATE_IDS, random)
  const stateDefinition = avatarStateById(state)
  return {
    shapeId: overrides.shapeId ?? pick(SHAPE_IDS, random),
    eyeStyle:
      overrides.eyeStyle ??
      pick(
        stateDefinition.eyePool.length ? stateDefinition.eyePool : EYE_IDS,
        random,
      ),
    color:
      overrides.color === undefined
        ? pick(COLORS, random).value
        : normalizeHexColor(overrides.color),
    motion: overrides.motion ?? pick(MOTION_IDS, random),
    state,
    face: normalizeFaceRig({ ...stateDefinition.rig, ...overrides.face }),
    surface: normalizeSurface(
      overrides.surface ?? {
        ...DEFAULT_CONFIG.surface,
        id: pick(SURFACE_IDS, random),
      },
    ),
    autoMorph: overrides.autoMorph ?? DEFAULT_CONFIG.autoMorph,
    autoEyes: overrides.autoEyes ?? DEFAULT_CONFIG.autoEyes,
  }
}
