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
  EYES,
  EYE_IDS,
  eyeById,
  type EyeDefinition,
  type EyeId,
} from './eyes.js'
export {
  SHAPES,
  SHAPE_IDS,
  closedCurvePath,
  shapeById,
  type Point,
  type ShapeDefinition,
  type ShapeId,
} from './shapes.js'
export {
  AVATAR_STATE_IDS,
  AVATAR_STATES,
  DEFAULT_FACE_RIG,
  avatarStateById,
  normalizeFaceRig,
  projectEye,
  type AvatarStateDefinition,
  type AvatarStateId,
  type EyeProjection,
  type FaceRigConfig,
  type FaceRigOverrides,
} from './face-rig.js'
export { generateMoteConfig, type MoteOverrides } from './generate.js'
export { createAvatarSvg, type AvatarSvgOptions } from './svg.js'
