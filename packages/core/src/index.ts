export {
  COLORS,
  DEFAULT_CONFIG,
  HEX_COLOR_PATTERN,
  MOTION_IDS,
  MOTION_LEVELS,
  getEyeColor,
  normalizeHexColor,
  type MotionLevel,
  type MoteConfig,
} from './presets.js'
export {
  SHAPES,
  SHAPE_IDS,
  closedCurvePath,
  shapeById,
  type Point,
  type ShapeDefinition,
  type ShapeId,
} from './shapes.js'
export { generateMoteConfig, type MoteOverrides } from './generate.js'
export { createAvatarSvg, type AvatarSvgOptions } from './svg.js'
