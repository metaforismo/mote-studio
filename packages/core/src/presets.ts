import type { EyeId } from './eyes.js'
import {
  DEFAULT_FACE_RIG,
  type AvatarStateId,
  type FaceRigConfig,
} from './face-rig.js'
import type { ShapeId } from './shapes.js'

export const COLORS = [
  { name: 'Chalk', value: '#edece7' },
  { name: 'Cocoa', value: '#8b633d' },
  { name: 'Poppy', value: '#dc2944' },
  { name: 'Tangerine', value: '#f56a16' },
  { name: 'Marigold', value: '#ee9e18' },
  { name: 'Meadow', value: '#19ae7a' },
  { name: 'Lagoon', value: '#16a79d' },
  { name: 'Sky', value: '#2f8de3' },
  { name: 'Violet', value: '#7651d6' },
  { name: 'Berry', value: '#d72879' },
  { name: 'Silver', value: '#b9bab7' },
] as const

export const MOTION_IDS = ['calm', 'playful', 'kinetic'] as const
export type MotionLevel = (typeof MOTION_IDS)[number]

export const SURFACE_IDS = [
  'flat',
  'sphere',
  'cube',
  'cylinder',
  'capsule',
] as const
export type SurfaceId = (typeof SURFACE_IDS)[number]

export type SurfaceConfig = {
  id: SurfaceId
  depth: number
  rotateX: number
  rotateY: number
  rotateZ: number
}

export type SurfaceOverrides = {
  [Key in keyof SurfaceConfig]?: SurfaceConfig[Key] | undefined
}

export type MoteConfig = {
  shapeId: ShapeId
  eyeStyle: EyeId
  color: string
  motion: MotionLevel
  state: AvatarStateId
  face: FaceRigConfig
  surface: SurfaceConfig
  autoMorph: boolean
  autoEyes: boolean
}

export const DEFAULT_CONFIG: MoteConfig = {
  shapeId: 'blob',
  eyeStyle: 'neutral',
  color: '#f56a16',
  motion: 'playful',
  state: 'idle',
  face: DEFAULT_FACE_RIG,
  surface: {
    id: 'flat',
    depth: 0.56,
    rotateX: -12,
    rotateY: 18,
    rotateZ: 0,
  },
  autoMorph: true,
  autoEyes: false,
}

export const MOTION_LEVELS: Array<{
  id: MotionLevel
  label: string
  description: string
}> = [
  { id: 'calm', label: 'Calm', description: 'Slow, gentle drift' },
  { id: 'playful', label: 'Playful', description: 'Soft bounce and tilt' },
  { id: 'kinetic', label: 'Kinetic', description: 'Fast and expressive' },
]

export const SURFACES: Array<{
  id: SurfaceId
  label: string
  description: string
}> = [
  { id: 'flat', label: 'Soft flat', description: 'The original matte Mote' },
  {
    id: 'sphere',
    label: 'Sphere',
    description: 'Radial volume and a soft rim',
  },
  { id: 'cube', label: 'Cube', description: 'Three broad projected planes' },
  {
    id: 'cylinder',
    label: 'Cylinder',
    description: 'A curved horizontal light band',
  },
  {
    id: 'capsule',
    label: 'Capsule',
    description: 'Rounded ends and a long body highlight',
  },
]

export const normalizeSurface = (
  value: SurfaceOverrides | undefined,
): SurfaceConfig => ({
  id:
    value?.id && (SURFACE_IDS as readonly string[]).includes(value.id)
      ? value.id
      : DEFAULT_CONFIG.surface.id,
  depth: Math.max(0, Math.min(1, value?.depth ?? DEFAULT_CONFIG.surface.depth)),
  rotateX: Math.max(
    -70,
    Math.min(70, value?.rotateX ?? DEFAULT_CONFIG.surface.rotateX),
  ),
  rotateY: Math.max(
    -70,
    Math.min(70, value?.rotateY ?? DEFAULT_CONFIG.surface.rotateY),
  ),
  rotateZ: Math.max(
    -180,
    Math.min(180, value?.rotateZ ?? DEFAULT_CONFIG.surface.rotateZ),
  ),
})

export const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

export const normalizeHexColor = (hex: string): string => {
  const normalized = hex.trim().toLowerCase()
  if (!HEX_COLOR_PATTERN.test(normalized)) {
    throw new Error('Colors must use the #RRGGBB hexadecimal format')
  }
  return normalized
}

export const getEyeColor = (hex: string): string => {
  const value = normalizeHexColor(hex).slice(1)
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
  return luminance > 0.48 ? '#151612' : '#f4f2eb'
}
