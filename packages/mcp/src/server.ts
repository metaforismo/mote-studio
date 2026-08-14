import { randomUUID } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/server'
import {
  COLORS,
  AVATAR_STATE_IDS,
  AVATAR_STATES,
  DEFAULT_CONFIG,
  EYES,
  EYE_IDS,
  MOTION_IDS,
  MOTION_LEVELS,
  SURFACES,
  SURFACE_IDS,
  SHAPES,
  SHAPE_IDS,
  avatarStateById,
  behaviorForAvatar,
  createStudioDocument,
  createAvatarSvg,
  generateMoteConfig,
  normalizeFaceRig,
  normalizeSurface,
  parseStudioDocument,
  serializeStudioDocument,
  type MoteStudioDocument,
} from '@mote-studio/core'
import * as z from 'zod/v4'

const shapeIdSchema = z.enum(SHAPE_IDS)
const eyeIdSchema = z.enum(EYE_IDS)
const motionSchema = z.enum(MOTION_IDS)
const stateSchema = z.enum(AVATAR_STATE_IDS)
const surfaceIdSchema = z.enum(SURFACE_IDS)
const colorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, 'Use the #RRGGBB hexadecimal format')

const faceRigSchema = z.object({
  gazeX: z.number().min(-1).max(1),
  gazeY: z.number().min(-1).max(1),
  turn: z.number().min(-100).max(100),
  eyeSpacing: z.number().min(0.55).max(1.55),
  eyeScale: z.number().min(0.45).max(1.65),
  eyeRotation: z.number().min(-55).max(55),
  eyeOffsetY: z.number().min(-34).max(34),
  perspective: z.number().min(0).max(1.4),
})

const surfaceSchema = z.object({
  id: surfaceIdSchema,
  depth: z.number().min(0).max(1),
  rotateX: z.number().min(-70).max(70),
  rotateY: z.number().min(-70).max(70),
  rotateZ: z.number().min(-180).max(180),
})

const eyeTransformSchema = z.object({
  scaleX: z.number().min(0.35).max(1.8),
  scaleY: z.number().min(0.08).max(1.8),
  offsetX: z.number().min(-36).max(36),
  offsetY: z.number().min(-36).max(36),
  rotation: z.number().min(-70).max(70),
})

const eyePairTransformSchema = z.object({
  linked: z.boolean(),
  left: eyeTransformSchema,
  right: eyeTransformSchema,
})

const expressionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  eyeStyle: eyeIdSchema,
  face: faceRigSchema,
  eyes: eyePairTransformSchema,
})

const animationStepSchema = z.object({
  id: z.string().min(1),
  expressionId: z.string().min(1),
  holdMs: z.number().int().min(0),
  transitionMs: z.number().int().min(0),
  transition: z.enum(['spring', 'smooth', 'snappy']),
})

const animationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  playbackMode: z.enum(['once', 'loop', 'pingPong']),
  blink: z.object({
    enabled: z.boolean(),
    intervalMs: z.number().int().positive(),
    varianceMs: z.number().int().min(0),
  }),
  steps: z.array(animationStepSchema).min(1),
})

const behaviorSchema = z.object({
  expressions: z.array(expressionSchema).min(1),
  animations: z.array(animationSchema),
})

const rigPerformanceSchema = z.object({
  durationMs: z.number().int().positive(),
  times: z.array(z.number().min(0).max(1)).min(2),
  eyeSequence: z.array(eyeIdSchema).min(2),
  rigDeltas: z.partialRecord(
    z.enum([
      'gazeX',
      'gazeY',
      'turn',
      'eyeSpacing',
      'eyeScale',
      'eyeRotation',
      'eyeOffsetY',
      'perspective',
    ]),
    z.array(z.number()).min(2),
  ),
})

const moteConfigSchema = z.object({
  shapeId: shapeIdSchema,
  eyeStyle: eyeIdSchema,
  color: colorSchema,
  motion: motionSchema,
  state: stateSchema,
  face: faceRigSchema,
  surface: surfaceSchema,
  autoMorph: z.boolean(),
  autoEyes: z.boolean(),
})

const studioDocumentSchema = z.object({
  version: z.literal(1),
  activeAvatarId: z.string().min(1),
  avatars: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      config: moteConfigSchema,
      behavior: behaviorSchema.nullable(),
    }),
  ),
  sharedBehavior: behaviorSchema,
})

const renderedMoteSchema = z.object({
  seed: z.string(),
  config: moteConfigSchema,
  svg: z.string(),
  mimeType: z.literal('image/svg+xml'),
  animated: z.boolean(),
})

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
} as const

const toToolResult = <T extends Record<string, unknown>>(value: T) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
  structuredContent: value,
})

export const createMoteServer = () => {
  const server = new McpServer(
    { name: 'mote-studio', version: '0.2.0' },
    {
      instructions:
        'Use list_mote_presets to discover silhouettes, surfaces, expressions, animations, colors, motion values, and the procedural rig. Use create_mote for one deterministic portable SVG, create_mote_project for an editable versioned project, render_mote_svg for an exact configuration, or render_mote_project_animation to resolve a project timeline into portable SVG frames. All tools are local, read-only, and network-free.',
    },
  )

  server.registerTool(
    'list_mote_presets',
    {
      title: 'List Mote presets',
      description:
        'List every supported body shape, eye expression, behavioral state, palette color, motion personality, and the default procedural face rig.',
      inputSchema: z.object({}),
      outputSchema: z.object({
        shapes: z.array(
          z.object({
            id: shapeIdSchema,
            label: z.string(),
            description: z.string(),
          }),
        ),
        eyes: z.array(
          z.object({
            id: eyeIdSchema,
            referenceIndex: z.number().int().min(0),
            label: z.string(),
            description: z.string(),
          }),
        ),
        colors: z.array(z.object({ name: z.string(), value: colorSchema })),
        motions: z.array(
          z.object({
            id: motionSchema,
            label: z.string(),
            description: z.string(),
          }),
        ),
        surfaces: z.array(
          z.object({
            id: surfaceIdSchema,
            label: z.string(),
            description: z.string(),
          }),
        ),
        states: z.array(
          z.object({
            id: stateSchema,
            label: z.string(),
            description: z.string(),
            eyePair: z.tuple([eyeIdSchema, eyeIdSchema]),
            performance: rigPerformanceSchema,
            eyePool: z.array(eyeIdSchema),
            cadenceMs: z.number().int().positive(),
            rig: faceRigSchema,
          }),
        ),
        defaults: moteConfigSchema,
        expressions: z.array(expressionSchema),
        animations: z.array(animationSchema),
      }),
      annotations: { ...readOnlyAnnotations, idempotentHint: true },
    },
    async () =>
      toToolResult({
        shapes: SHAPES.map(({ id, label, description }) => ({
          id,
          label,
          description,
        })),
        eyes: EYES.map(({ id, referenceIndex, label, description }) => ({
          id,
          referenceIndex,
          label,
          description,
        })),
        colors: COLORS.map(({ name, value }) => ({ name, value })),
        motions: MOTION_LEVELS,
        surfaces: SURFACES,
        states: AVATAR_STATES,
        defaults: DEFAULT_CONFIG,
        expressions: createStudioDocument().sharedBehavior.expressions,
        animations: createStudioDocument().sharedBehavior.animations,
      }),
  )

  server.registerTool(
    'create_mote',
    {
      title: 'Create a Mote',
      description:
        'Create a deterministic Mote configuration and portable inline SVG. Provide a seed to reproduce the exact result; omitted values are selected from the built-in presets.',
      inputSchema: z.object({
        seed: z
          .string()
          .trim()
          .min(1)
          .max(128)
          .optional()
          .describe('Stable seed for reproducible output'),
        shapeId: shapeIdSchema.optional(),
        eyeStyle: eyeIdSchema.optional(),
        color: colorSchema.optional(),
        motion: motionSchema.optional(),
        state: stateSchema.optional(),
        face: faceRigSchema.partial().optional(),
        surface: surfaceSchema.partial().optional(),
        autoMorph: z.boolean().optional(),
        autoEyes: z.boolean().optional(),
        animated: z.boolean().default(true),
        title: z
          .string()
          .trim()
          .min(1)
          .max(80)
          .optional()
          .describe('Accessible title embedded in the SVG'),
      }),
      outputSchema: renderedMoteSchema,
      annotations: { ...readOnlyAnnotations, idempotentHint: false },
    },
    async ({
      seed,
      shapeId,
      eyeStyle,
      color,
      motion,
      state,
      face,
      surface,
      autoMorph,
      autoEyes,
      animated,
      title,
    }) => {
      const resolvedSeed = seed ?? randomUUID()
      const config = generateMoteConfig(resolvedSeed, {
        ...(shapeId === undefined ? {} : { shapeId }),
        ...(eyeStyle === undefined ? {} : { eyeStyle }),
        ...(color === undefined ? {} : { color }),
        ...(motion === undefined ? {} : { motion }),
        ...(state === undefined ? {} : { state }),
        ...(face === undefined ? {} : { face }),
        ...(surface === undefined
          ? {}
          : { surface: normalizeSurface(surface) }),
        ...(autoMorph === undefined ? {} : { autoMorph }),
        ...(autoEyes === undefined ? {} : { autoEyes }),
      })
      const svg = createAvatarSvg({
        shapeId: config.shapeId,
        eyeStyle: config.eyeStyle,
        color: config.color,
        motion: config.motion,
        state: config.state,
        face: config.face,
        surface: config.surface,
        animated,
        ...(title === undefined ? {} : { title }),
      })

      return toToolResult({
        seed: resolvedSeed,
        config,
        svg,
        mimeType: 'image/svg+xml' as const,
        animated,
      })
    },
  )

  server.registerTool(
    'render_mote_svg',
    {
      title: 'Render Mote SVG',
      description:
        'Render an exact Mote configuration as dependency-free inline SVG. The result never reads files, performs network requests, or writes to disk.',
      inputSchema: z.object({
        shapeId: shapeIdSchema,
        eyeStyle: eyeIdSchema.default('neutral'),
        color: colorSchema,
        motion: motionSchema.default('playful'),
        state: stateSchema.default('idle'),
        face: faceRigSchema.optional(),
        surface: surfaceSchema.optional(),
        eyeTransform: eyePairTransformSchema.optional(),
        autoMorph: z.boolean().default(false),
        autoEyes: z.boolean().default(false),
        animated: z.boolean().default(true),
        title: z.string().trim().min(1).max(80).optional(),
      }),
      outputSchema: renderedMoteSchema,
      annotations: { ...readOnlyAnnotations, idempotentHint: true },
    },
    async ({
      shapeId,
      eyeStyle,
      color,
      motion,
      state,
      face,
      surface,
      eyeTransform,
      autoMorph,
      autoEyes,
      animated,
      title,
    }) => {
      const normalizedFace = normalizeFaceRig(
        face ?? avatarStateById(state).rig,
      )
      const config = {
        shapeId,
        eyeStyle,
        color,
        motion,
        state,
        face: normalizedFace,
        surface: normalizeSurface(surface),
        autoMorph,
        autoEyes,
      }
      const svg = createAvatarSvg({
        shapeId,
        eyeStyle,
        color,
        motion,
        state,
        face: normalizedFace,
        surface: config.surface,
        ...(eyeTransform === undefined ? {} : { eyeTransform }),
        animated,
        ...(title === undefined ? {} : { title }),
      })

      return toToolResult({
        seed: 'explicit-config',
        config,
        svg,
        mimeType: 'image/svg+xml' as const,
        animated,
      })
    },
  )

  server.registerTool(
    'create_mote_project',
    {
      title: 'Create a Mote Studio project',
      description:
        'Create a deterministic, editable version-1 project containing one or more avatars plus the shared expression and animation library.',
      inputSchema: z.object({
        seed: z.string().trim().min(1).max(128),
        avatarCount: z.number().int().min(1).max(8).default(1),
        shapeId: shapeIdSchema.optional(),
        color: colorSchema.optional(),
        surface: surfaceSchema.partial().optional(),
      }),
      outputSchema: z.object({
        seed: z.string(),
        project: studioDocumentSchema,
        json: z.string(),
      }),
      annotations: { ...readOnlyAnnotations, idempotentHint: true },
    },
    async ({ seed, avatarCount, shapeId, color, surface }) => {
      const configs = Array.from({ length: avatarCount }, (_, index) =>
        generateMoteConfig(`${seed}:${index + 1}`, {
          ...(shapeId === undefined ? {} : { shapeId }),
          ...(color === undefined ? {} : { color }),
          ...(surface === undefined
            ? {}
            : { surface: normalizeSurface(surface) }),
        }),
      )
      const project = createStudioDocument(configs[0])
      project.avatars = configs.map((config, index) => ({
        id: `avatar-${index + 1}`,
        name: `Mote ${index + 1}`,
        config,
        behavior: null,
      }))
      project.activeAvatarId = 'avatar-1'
      return toToolResult({
        seed,
        project,
        json: serializeStudioDocument(project),
      })
    },
  )

  server.registerTool(
    'render_mote_project_animation',
    {
      title: 'Render a project animation timeline',
      description:
        'Resolve an animation from a versioned Mote Studio project into ordered portable SVG frames with exact hold and transition metadata.',
      inputSchema: z.object({
        project: studioDocumentSchema,
        animationId: z.string().min(1),
        avatarId: z.string().min(1).optional(),
        title: z.string().trim().min(1).max(80).optional(),
      }),
      outputSchema: z.object({
        avatarId: z.string(),
        animation: animationSchema,
        frames: z.array(
          z.object({
            index: z.number().int().min(0),
            expression: expressionSchema,
            holdMs: z.number().int().min(0),
            transitionMs: z.number().int().min(0),
            transition: z.enum(['spring', 'smooth', 'snappy']),
            svg: z.string(),
          }),
        ),
      }),
      annotations: { ...readOnlyAnnotations, idempotentHint: true },
    },
    async ({ project: inputProject, animationId, avatarId, title }) => {
      const project = parseStudioDocument(
        JSON.stringify(inputProject),
      ) as MoteStudioDocument
      const resolvedAvatarId = avatarId ?? project.activeAvatarId
      const avatar = project.avatars.find(({ id }) => id === resolvedAvatarId)
      if (!avatar) throw new Error(`Unknown avatar: ${resolvedAvatarId}`)
      const behavior = behaviorForAvatar(project, resolvedAvatarId)
      const animation = behavior.animations.find(({ id }) => id === animationId)
      if (!animation) throw new Error(`Unknown animation: ${animationId}`)

      const frames = animation.steps.map((animationStep, index) => {
        const expression = behavior.expressions.find(
          ({ id }) => id === animationStep.expressionId,
        )
        if (!expression) {
          throw new Error(
            `Animation ${animation.id} references missing expression ${animationStep.expressionId}`,
          )
        }
        return {
          index,
          expression,
          holdMs: animationStep.holdMs,
          transitionMs: animationStep.transitionMs,
          transition: animationStep.transition,
          svg: createAvatarSvg({
            shapeId: avatar.config.shapeId,
            eyeStyle: expression.eyeStyle,
            color: avatar.config.color,
            motion: avatar.config.motion,
            state: avatar.config.state,
            face: expression.face,
            eyeTransform: expression.eyes,
            surface: avatar.config.surface,
            animated: false,
            ...(title === undefined ? {} : { title }),
          }),
        }
      })

      return toToolResult({ avatarId: resolvedAvatarId, animation, frames })
    },
  )

  return server
}
