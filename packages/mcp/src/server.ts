import { randomUUID } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/server'
import {
  COLORS,
  DEFAULT_CONFIG,
  MOTION_IDS,
  MOTION_LEVELS,
  SHAPES,
  SHAPE_IDS,
  createAvatarSvg,
  generateMoteConfig,
} from '@mote-studio/core'
import * as z from 'zod/v4'

const shapeIdSchema = z.enum(SHAPE_IDS)
const motionSchema = z.enum(MOTION_IDS)
const colorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, 'Use the #RRGGBB hexadecimal format')

const moteConfigSchema = z.object({
  shapeId: shapeIdSchema,
  color: colorSchema,
  motion: motionSchema,
  autoMorph: z.boolean(),
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
        'Use list_mote_presets to discover supported values. Use create_mote for a deterministic configuration plus portable SVG, or render_mote_svg when the exact configuration is already known. All tools are local, read-only, and network-free.',
    },
  )

  server.registerTool(
    'list_mote_presets',
    {
      title: 'List Mote presets',
      description:
        'List every supported body shape, palette color, motion personality, and the default configuration.',
      inputSchema: z.object({}),
      outputSchema: z.object({
        shapes: z.array(
          z.object({
            id: shapeIdSchema,
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
        colors: COLORS.map(({ name, value }) => ({ name, value })),
        motions: MOTION_LEVELS,
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
        color: colorSchema.optional(),
        motion: motionSchema.optional(),
        autoMorph: z.boolean().optional(),
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
    async ({ seed, shapeId, color, motion, autoMorph, animated, title }) => {
      const resolvedSeed = seed ?? randomUUID()
      const config = generateMoteConfig(resolvedSeed, {
        ...(shapeId === undefined ? {} : { shapeId }),
        ...(color === undefined ? {} : { color }),
        ...(motion === undefined ? {} : { motion }),
        ...(autoMorph === undefined ? {} : { autoMorph }),
      })
      const svg = createAvatarSvg({
        shapeId: config.shapeId,
        color: config.color,
        motion: config.motion,
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
        color: colorSchema,
        motion: motionSchema.default('playful'),
        autoMorph: z.boolean().default(false),
        animated: z.boolean().default(true),
        title: z.string().trim().min(1).max(80).optional(),
      }),
      outputSchema: renderedMoteSchema,
      annotations: { ...readOnlyAnnotations, idempotentHint: true },
    },
    async ({ shapeId, color, motion, autoMorph, animated, title }) => {
      const config = { shapeId, color, motion, autoMorph }
      const svg = createAvatarSvg({
        shapeId,
        color,
        motion,
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
