import { EYE_IDS, type EyeId } from './eyes.js'
import {
  AVATAR_STATE_IDS,
  avatarStateById,
  normalizeFaceRig,
  type FaceRigConfig,
} from './face-rig.js'
import { DEFAULT_CONFIG, normalizeSurface, type MoteConfig } from './presets.js'

export const STUDIO_DOCUMENT_VERSION = 1 as const

export const PLAYBACK_MODES = ['once', 'loop', 'pingPong'] as const
export type PlaybackMode = (typeof PLAYBACK_MODES)[number]

export const TRANSITION_STYLES = ['spring', 'smooth', 'snappy'] as const
export type TransitionStyle = (typeof TRANSITION_STYLES)[number]

export type EyeTransform = {
  scaleX: number
  scaleY: number
  offsetX: number
  offsetY: number
  rotation: number
}

export type EyePairTransform = {
  linked: boolean
  left: EyeTransform
  right: EyeTransform
}

export type MoteExpression = {
  id: string
  name: string
  eyeStyle: EyeId
  face: FaceRigConfig
  eyes: EyePairTransform
}

export type MoteAnimationStep = {
  id: string
  expressionId: string
  holdMs: number
  transitionMs: number
  transition: TransitionStyle
}

export type MoteAnimation = {
  id: string
  name: string
  description: string
  playbackMode: PlaybackMode
  blink: {
    enabled: boolean
    intervalMs: number
    varianceMs: number
  }
  steps: MoteAnimationStep[]
}

export type MoteBehaviorLibrary = {
  expressions: MoteExpression[]
  animations: MoteAnimation[]
}

export type MoteAvatarDocument = {
  id: string
  name: string
  config: MoteConfig
  /** Null means this avatar reads from the shared behavior library. */
  behavior: MoteBehaviorLibrary | null
}

export type MoteStudioDocument = {
  version: typeof STUDIO_DOCUMENT_VERSION
  activeAvatarId: string
  avatars: MoteAvatarDocument[]
  sharedBehavior: MoteBehaviorLibrary
}

export const DEFAULT_EYE_TRANSFORM: EyeTransform = {
  scaleX: 1,
  scaleY: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
}

export const DEFAULT_EYE_PAIR: EyePairTransform = {
  linked: true,
  left: DEFAULT_EYE_TRANSFORM,
  right: DEFAULT_EYE_TRANSFORM,
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const expressionFromState = (
  stateId: (typeof AVATAR_STATE_IDS)[number],
): MoteExpression => {
  const state = avatarStateById(stateId)
  return {
    id: `expression-${state.id}`,
    name: state.label,
    eyeStyle: state.eyePair[0],
    face: state.rig,
    eyes: clone(DEFAULT_EYE_PAIR),
  }
}

export const DEFAULT_EXPRESSIONS: MoteExpression[] =
  AVATAR_STATE_IDS.map(expressionFromState)

const step = (
  animationId: string,
  index: number,
  expressionId: string,
  holdMs: number,
  transitionMs: number,
  transition: TransitionStyle = 'spring',
): MoteAnimationStep => ({
  id: `${animationId}-step-${index + 1}`,
  expressionId,
  holdMs,
  transitionMs,
  transition,
})

export const DEFAULT_ANIMATIONS: MoteAnimation[] = [
  {
    id: 'animation-soft-scan',
    name: 'Soft scan',
    description: 'A restrained left-to-right look that returns to rest.',
    playbackMode: 'loop',
    blink: { enabled: true, intervalMs: 4200, varianceMs: 900 },
    steps: [
      step('animation-soft-scan', 0, 'expression-idle', 720, 360, 'smooth'),
      step(
        'animation-soft-scan',
        1,
        'expression-searching',
        540,
        420,
        'smooth',
      ),
      step('animation-soft-scan', 2, 'expression-doubtful', 420, 380, 'smooth'),
      step('animation-soft-scan', 3, 'expression-idle', 760, 440, 'spring'),
    ],
  },
  {
    id: 'animation-curious-turn',
    name: 'Curious turn',
    description: 'Spacing, scale, gaze, and turn move as one expression.',
    playbackMode: 'pingPong',
    blink: { enabled: true, intervalMs: 3600, varianceMs: 600 },
    steps: [
      step('animation-curious-turn', 0, 'expression-idle', 520, 320),
      step('animation-curious-turn', 1, 'expression-curious', 660, 440),
      step('animation-curious-turn', 2, 'expression-thinking', 580, 420),
    ],
  },
  {
    id: 'animation-listen-react',
    name: 'Listen and react',
    description: 'An attentive hold followed by a compact bright response.',
    playbackMode: 'once',
    blink: { enabled: false, intervalMs: 4400, varianceMs: 800 },
    steps: [
      step('animation-listen-react', 0, 'expression-idle', 360, 240, 'snappy'),
      step('animation-listen-react', 1, 'expression-listening', 860, 360),
      step(
        'animation-listen-react',
        2,
        'expression-excited',
        420,
        260,
        'snappy',
      ),
      step('animation-listen-react', 3, 'expression-idle', 500, 400),
    ],
  },
  {
    id: 'animation-sleep-loop',
    name: 'Sleep loop',
    description: 'A low, slow cycle with minimal eye travel.',
    playbackMode: 'loop',
    blink: { enabled: false, intervalMs: 6200, varianceMs: 900 },
    steps: [
      step('animation-sleep-loop', 0, 'expression-shy', 700, 520, 'smooth'),
      step(
        'animation-sleep-loop',
        1,
        'expression-sleeping',
        1400,
        640,
        'smooth',
      ),
    ],
  },
]

export const createDefaultBehavior = (): MoteBehaviorLibrary => ({
  expressions: clone(DEFAULT_EXPRESSIONS),
  animations: clone(DEFAULT_ANIMATIONS),
})

export const createStudioDocument = (
  config: MoteConfig = DEFAULT_CONFIG,
): MoteStudioDocument => ({
  version: STUDIO_DOCUMENT_VERSION,
  activeAvatarId: 'avatar-1',
  avatars: [
    {
      id: 'avatar-1',
      name: 'Mote 1',
      config: clone(config),
      behavior: null,
    },
  ],
  sharedBehavior: createDefaultBehavior(),
})

export const activeAvatar = (
  document: MoteStudioDocument,
): MoteAvatarDocument =>
  document.avatars.find((avatar) => avatar.id === document.activeAvatarId) ??
  document.avatars[0] ??
  createStudioDocument().avatars[0]!

export const behaviorForAvatar = (
  document: MoteStudioDocument,
  avatarId = document.activeAvatarId,
): MoteBehaviorLibrary =>
  document.avatars.find((avatar) => avatar.id === avatarId)?.behavior ??
  document.sharedBehavior

export const detachAvatarBehavior = (
  document: MoteStudioDocument,
  avatarId = document.activeAvatarId,
): MoteStudioDocument => ({
  ...document,
  avatars: document.avatars.map((avatar) =>
    avatar.id === avatarId && avatar.behavior === null
      ? { ...avatar, behavior: clone(document.sharedBehavior) }
      : avatar,
  ),
})

const nextId = (prefix: string, existingIds: string[]) => {
  let index = 1
  while (existingIds.includes(`${prefix}-${index}`)) index += 1
  return `${prefix}-${index}`
}

export const duplicateAvatar = (
  document: MoteStudioDocument,
  avatarId = document.activeAvatarId,
): MoteStudioDocument => {
  const source =
    document.avatars.find((avatar) => avatar.id === avatarId) ??
    activeAvatar(document)
  const id = nextId(
    'avatar',
    document.avatars.map((avatar) => avatar.id),
  )
  const duplicate: MoteAvatarDocument = {
    ...clone(source),
    id,
    name: `${source.name} copy`,
  }
  return {
    ...document,
    activeAvatarId: id,
    avatars: [...document.avatars, duplicate],
  }
}

export const createAvatar = (
  document: MoteStudioDocument,
): MoteStudioDocument => {
  const id = nextId(
    'avatar',
    document.avatars.map((avatar) => avatar.id),
  )
  return {
    ...document,
    activeAvatarId: id,
    avatars: [
      ...document.avatars,
      {
        id,
        name: `Mote ${document.avatars.length + 1}`,
        config: clone(DEFAULT_CONFIG),
        behavior: null,
      },
    ],
  }
}

const finite = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const normalizeEyeTransform = (value: unknown): EyeTransform => {
  const source =
    typeof value === 'object' && value !== null
      ? (value as Partial<EyeTransform>)
      : {}
  return {
    scaleX: Math.max(0.35, Math.min(1.8, finite(source.scaleX, 1))),
    scaleY: Math.max(0.08, Math.min(1.8, finite(source.scaleY, 1))),
    offsetX: Math.max(-36, Math.min(36, finite(source.offsetX, 0))),
    offsetY: Math.max(-36, Math.min(36, finite(source.offsetY, 0))),
    rotation: Math.max(-70, Math.min(70, finite(source.rotation, 0))),
  }
}

const isEyeId = (value: unknown): value is EyeId =>
  typeof value === 'string' && (EYE_IDS as readonly string[]).includes(value)

export const normalizeExpression = (
  value: Partial<MoteExpression>,
  fallback = DEFAULT_EXPRESSIONS[0]!,
): MoteExpression => ({
  id:
    typeof value.id === 'string' && value.id.trim()
      ? value.id.trim()
      : fallback.id,
  name:
    typeof value.name === 'string' && value.name.trim()
      ? value.name.trim().slice(0, 60)
      : fallback.name,
  eyeStyle: isEyeId(value.eyeStyle) ? value.eyeStyle : fallback.eyeStyle,
  face: normalizeFaceRig(value.face ?? fallback.face),
  eyes: {
    linked: value.eyes?.linked ?? fallback.eyes.linked,
    left: normalizeEyeTransform(value.eyes?.left ?? fallback.eyes.left),
    right: normalizeEyeTransform(value.eyes?.right ?? fallback.eyes.right),
  },
})

export const serializeStudioDocument = (document: MoteStudioDocument): string =>
  JSON.stringify(document, null, 2)

const validateBehavior = (behavior: MoteBehaviorLibrary, label: string) => {
  if (behavior.expressions.length === 0) {
    throw new Error(`${label} requires at least one expression`)
  }
  const expressionIds = new Set(behavior.expressions.map(({ id }) => id))
  if (expressionIds.size !== behavior.expressions.length) {
    throw new Error(`${label} expression IDs must be unique`)
  }
  const animationIds = new Set(behavior.animations.map(({ id }) => id))
  if (animationIds.size !== behavior.animations.length) {
    throw new Error(`${label} animation IDs must be unique`)
  }
  for (const animation of behavior.animations) {
    if (animation.steps.length === 0) {
      throw new Error(`Animation ${animation.id} requires at least one step`)
    }
    const stepIds = new Set(animation.steps.map(({ id }) => id))
    if (stepIds.size !== animation.steps.length) {
      throw new Error(`Animation ${animation.id} step IDs must be unique`)
    }
    for (const animationStep of animation.steps) {
      if (!expressionIds.has(animationStep.expressionId)) {
        throw new Error(
          `Animation ${animation.id} references missing expression ${animationStep.expressionId}`,
        )
      }
      if (
        !Number.isFinite(animationStep.holdMs) ||
        !Number.isFinite(animationStep.transitionMs) ||
        animationStep.holdMs < 0 ||
        animationStep.transitionMs < 0
      ) {
        throw new Error(`Animation ${animation.id} has invalid step timing`)
      }
    }
  }
}

export const parseStudioDocument = (source: string): MoteStudioDocument => {
  const parsed = JSON.parse(source) as Partial<MoteStudioDocument>
  if (parsed.version !== STUDIO_DOCUMENT_VERSION) {
    throw new Error(
      `Unsupported Mote Studio document version: ${String(parsed.version)}`,
    )
  }
  if (!Array.isArray(parsed.avatars) || parsed.avatars.length === 0) {
    throw new Error('A Mote Studio document requires at least one avatar')
  }
  if (
    !parsed.sharedBehavior ||
    !Array.isArray(parsed.sharedBehavior.expressions) ||
    !Array.isArray(parsed.sharedBehavior.animations)
  ) {
    throw new Error('The shared behavior library is missing')
  }

  const document = clone(parsed) as MoteStudioDocument
  for (const avatar of document.avatars) {
    if (
      typeof avatar.id !== 'string' ||
      !avatar.id.trim() ||
      typeof avatar.name !== 'string' ||
      !avatar.name.trim() ||
      !avatar.config
    ) {
      throw new Error('Every avatar requires an ID, name, and configuration')
    }
    if (
      avatar.behavior &&
      (!Array.isArray(avatar.behavior.expressions) ||
        !Array.isArray(avatar.behavior.animations))
    ) {
      throw new Error(`Avatar ${avatar.id} behavior is incomplete`)
    }
  }
  const ids = new Set(document.avatars.map((avatar) => avatar.id))
  if (ids.size !== document.avatars.length) {
    throw new Error('Avatar IDs must be unique')
  }
  if (!ids.has(document.activeAvatarId)) {
    document.activeAvatarId = document.avatars[0]!.id
  }

  document.sharedBehavior.expressions = document.sharedBehavior.expressions.map(
    (expression, index) =>
      normalizeExpression(expression, DEFAULT_EXPRESSIONS[index] ?? undefined),
  )
  validateBehavior(document.sharedBehavior, 'The shared behavior library')
  for (const avatar of document.avatars) {
    avatar.config.face = normalizeFaceRig(avatar.config.face)
    avatar.config.surface = normalizeSurface(avatar.config.surface)
    if (avatar.behavior) {
      avatar.behavior.expressions = avatar.behavior.expressions.map(
        (expression, index) =>
          normalizeExpression(
            expression,
            DEFAULT_EXPRESSIONS[index] ?? undefined,
          ),
      )
      validateBehavior(avatar.behavior, `Avatar ${avatar.id} behavior`)
    }
  }
  return document
}
