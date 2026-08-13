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
  SHAPES,
  SHAPE_IDS,
  avatarStateById,
  createAvatarSvg,
  generateMoteConfig,
  normalizeFaceRig,
} from '@mote-studio/core'
import * as z from 'zod/v4'

const shapeIdSchema = z.enum(SHAPE_IDS)
const eyeIdSchema = z.enum(EYE_IDS)
const motionSchema = z.enum(MOTION_IDS)
const stateSchema = z.enum(AVATAR_STATE_IDS)
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
  autoMorph: z.boolean(),
  autoEyes: z.boolean(),
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
    { name: 'mote-studio', version: '0.1.0' },
    {
      instructions:
        'Use list_mote_presets to discover supported silhouettes, eye expressions, behavioral states, colors, motion values, and the procedural face rig. Use create_mote for a deterministic configuration plus portable SVG, or render_mote_svg when the exact configuration is already known. All tools are local, read-only, and network-free.',
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
        states: AVATAR_STATES,
        defaults: DEFAULT_CONFIG,
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

  return server
}
