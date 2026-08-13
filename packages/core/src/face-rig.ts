import type { EyeId } from './eyes.js'

export const AVATAR_STATE_IDS = [
  'idle',
  'listening',
  'thinking',
  'searching',
  'excited',
  'curious',
  'playful',
  'sleeping',
] as const

export type AvatarStateId = (typeof AVATAR_STATE_IDS)[number]

export type FaceRigConfig = {
  /** Horizontal gaze in normalized -1...1 coordinates. */
  gazeX: number
  /** Vertical gaze in normalized -1...1 coordinates. */
  gazeY: number
  /** Virtual head rotation in degrees. */
  turn: number
  /** Distance between eye centroids, relative to the expression preset. */
  eyeSpacing: number
  /** Uniform scale applied to both eyes. */
  eyeScale: number
  /** Local eye rotation in degrees. */
  eyeRotation: number
  /** Vertical eye placement in SVG units. */
  eyeOffsetY: number
  /** Strength of the spherical depth compression. */
  perspective: number
}

export type FaceRigOverrides = {
  [Key in keyof FaceRigConfig]?: FaceRigConfig[Key] | undefined
}

export type AvatarStateDefinition = {
  id: AvatarStateId
  label: string
  description: string
  /** Curated A/B pair used by the one-shot eye performance. */
  eyePair: readonly [EyeId, EyeId]
  /** Duration of the A → B → A performance. */
  performanceMs: number
  eyePool: readonly EyeId[]
  cadenceMs: number
  rig: FaceRigConfig
}

export type EyeProjection = {
  depth: number
  opacity: number
  scaleX: number
  scaleY: number
  translateX: number
  translateY: number
  cssTransform: string
  svgTransform: string
}

export const DEFAULT_FACE_RIG: FaceRigConfig = {
  gazeX: 0,
  gazeY: 0,
  turn: 0,
  eyeSpacing: 1,
  eyeScale: 1,
  eyeRotation: 0,
  eyeOffsetY: 0,
  perspective: 1,
}

const state = (
  id: AvatarStateId,
  label: string,
  description: string,
  eyePair: readonly [EyeId, EyeId],
  eyePool: readonly EyeId[],
  cadenceMs: number,
  rig: Partial<FaceRigConfig> = {},
): AvatarStateDefinition => ({
  id,
  label,
  description,
  eyePair,
  performanceMs: 1350,
  eyePool,
  cadenceMs,
  rig: { ...DEFAULT_FACE_RIG, ...rig },
})

/**
 * States are data, not animation branches. Adding another state only requires
 * a label, a curated eye pair, an expression pool, a cadence and a target rig
 * pose.
 */
export const AVATAR_STATES: AvatarStateDefinition[] = [
  state(
    'idle',
    'Idle',
    'Available and quietly alive',
    ['neutral', 'soft'],
    ['neutral', 'soft', 'dots'],
    7600,
  ),
  state(
    'listening',
    'Listening',
    'Lifted toward the speaker',
    ['listening', 'attentive'],
    ['listening', 'attentive', 'neutral'],
    6200,
    { gazeX: 0.12, gazeY: -0.12, eyeRotation: 2, eyeOffsetY: -3 },
  ),
  state(
    'thinking',
    'Thinking',
    'Looking up and off-axis',
    ['thinking', 'suspicious'],
    ['thinking', 'suspicious', 'side-eye'],
    6900,
    { gazeX: 0.34, gazeY: -0.42, turn: -14, eyeRotation: -5 },
  ),
  state(
    'searching',
    'Searching',
    'Scanning across the virtual surface',
    ['searching', 'scanning'],
    ['searching', 'scanning', 'focused'],
    3900,
    { gazeX: 0.5, turn: 24, eyeSpacing: 1.08, perspective: 1.12 },
  ),
  state(
    'excited',
    'Excited',
    'Open, bright and emphatic',
    ['spark', 'joyful'],
    ['spark', 'wide', 'surprised', 'joyful'],
    3400,
    { eyeScale: 1.14, eyeSpacing: 1.08, eyeOffsetY: -4 },
  ),
  state(
    'curious',
    'Curious',
    'A gentle inquisitive turn',
    ['wonder', 'thinking'],
    ['wonder', 'thinking', 'attentive'],
    5700,
    { gazeY: -0.2, turn: 12, eyeSpacing: 1.04, eyeRotation: 3 },
  ),
  state(
    'playful',
    'Playful',
    'Asymmetric and ready to react',
    ['skeptical', 'joyful'],
    ['skeptical', 'joyful', 'side-eye', 'spark'],
    4100,
    { gazeX: -0.18, turn: -9, eyeRotation: -4, eyeScale: 1.05 },
  ),
  state(
    'sleeping',
    'Sleeping',
    'Low, still and nearly closed',
    ['closed', 'drowsy'],
    ['closed', 'drowsy', 'sleepy'],
    9800,
    { gazeY: 0.2, eyeScale: 0.9, eyeOffsetY: 7, perspective: 0.7 },
  ),
]

export const avatarStateById = (id: AvatarStateId): AvatarStateDefinition => {
  const definition = AVATAR_STATES.find((candidate) => candidate.id === id)
  if (!definition) throw new Error(`Unknown Mote state: ${id}`)
  return definition
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const tidy = (value: number) => Number(value.toFixed(4))

export const normalizeFaceRig = (
  rig: FaceRigOverrides = {},
): FaceRigConfig => ({
  gazeX: clamp(rig.gazeX ?? DEFAULT_FACE_RIG.gazeX, -1, 1),
  gazeY: clamp(rig.gazeY ?? DEFAULT_FACE_RIG.gazeY, -1, 1),
  turn: clamp(rig.turn ?? DEFAULT_FACE_RIG.turn, -100, 100),
  eyeSpacing: clamp(rig.eyeSpacing ?? DEFAULT_FACE_RIG.eyeSpacing, 0.55, 1.55),
  eyeScale: clamp(rig.eyeScale ?? DEFAULT_FACE_RIG.eyeScale, 0.45, 1.65),
  eyeRotation: clamp(rig.eyeRotation ?? DEFAULT_FACE_RIG.eyeRotation, -55, 55),
  eyeOffsetY: clamp(rig.eyeOffsetY ?? DEFAULT_FACE_RIG.eyeOffsetY, -34, 34),
  perspective: clamp(rig.perspective ?? DEFAULT_FACE_RIG.perspective, 0, 1.4),
})

const FACE_CENTER_X = 160
const FACE_RADIUS = 112

/**
 * Projects one 2D eye centroid onto a virtual sphere. The SVG remains fully
 * vector-based; the apparent 3D turn comes from longitude, depth compression
 * and occlusion rather than a raster or WebGL layer.
 */
export const projectEye = (
  center: { x: number; y: number },
  inputRig: Partial<FaceRigConfig>,
): EyeProjection => {
  const rig = normalizeFaceRig(inputRig)
  const spacedX = FACE_CENTER_X + (center.x - FACE_CENTER_X) * rig.eyeSpacing
  const baseLongitude = Math.asin(
    clamp((spacedX - FACE_CENTER_X) / FACE_RADIUS, -1, 1),
  )
  const longitude = baseLongitude + (rig.turn * Math.PI) / 180
  const depth = Math.cos(longitude)
  const rawPerspective =
    Math.max(depth, 0.02) / Math.max(Math.cos(baseLongitude), 0.02)
  const depthScale = 1 + (rawPerspective - 1) * rig.perspective
  const scaleX = clamp(depthScale * rig.eyeScale, 0.02, 2.4)
  const scaleY = rig.eyeScale
  const projectedX =
    FACE_CENTER_X + FACE_RADIUS * Math.sin(longitude) + rig.gazeX * 13.2
  const projectedY = center.y + rig.gazeY * 8.4 + rig.eyeOffsetY
  const translateX = projectedX - center.x
  const translateY = projectedY - center.y
  const opacity = depth > 0.02 ? 1 : 0

  return {
    depth: tidy(depth),
    opacity,
    scaleX: tidy(scaleX),
    scaleY: tidy(scaleY),
    translateX: tidy(translateX),
    translateY: tidy(translateY),
    cssTransform: `translate3d(${tidy(translateX)}px, ${tidy(translateY)}px, 0) rotate(${tidy(rig.eyeRotation)}deg) scale(${tidy(scaleX)}, ${tidy(scaleY)})`,
    svgTransform: `translate(${tidy(translateX)} ${tidy(translateY)}) rotate(${tidy(rig.eyeRotation)} ${tidy(center.x)} ${tidy(center.y)}) translate(${tidy(center.x)} ${tidy(center.y)}) scale(${tidy(scaleX)} ${tidy(scaleY)}) translate(${-tidy(center.x)} ${-tidy(center.y)})`,
  }
}
