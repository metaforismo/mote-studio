import { getEyeColor, normalizeHexColor, type MotionLevel } from './presets.js'
import { eyeById, type EyeId } from './eyes.js'
import {
  DEFAULT_FACE_RIG,
  normalizeFaceRig,
  projectEye,
  type AvatarStateId,
  type FaceRigConfig,
} from './face-rig.js'
import { shapeById, type ShapeId } from './shapes.js'

export type AvatarSvgOptions = {
  shapeId: ShapeId
  eyeStyle?: EyeId
  color: string
  eyeColor?: string
  motion?: MotionLevel
  state?: AvatarStateId
  face?: Partial<FaceRigConfig>
  animated?: boolean
  title?: string
  imageDataUrl?: string | null
}

const IMAGE_DATA_PATTERN =
  /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/]+=*$/i

const escapeMarkup = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

const hashText = (value: string): string => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

const animationValues: Record<
  MotionLevel,
  { duration: string; middle: string; end: string }
> = {
  calm: {
    duration: '6.8s',
    middle: 'translate3d(0,-3px,0) rotate(.4deg) scale(1.006)',
    end: 'translate3d(0,0,0) rotate(-.4deg) scale(1)',
  },
  playful: {
    duration: '4.4s',
    middle: 'translate3d(0,-8px,0) rotate(1.4deg) scale(1.018)',
    end: 'translate3d(0,0,0) rotate(-1.4deg) scale(1)',
  },
  kinetic: {
    duration: '3.2s',
    middle: 'translate3d(0,-12px,0) rotate(2.2deg) scale(1.03)',
    end: 'translate3d(0,0,0) rotate(-2.5deg) scale(1)',
  },
}

const createAnimationStyle = (motion: MotionLevel, rootId: string) => {
  const values = animationValues[motion]
  return `<style>
@media (prefers-reduced-motion:no-preference){
  #${rootId}{transform-box:fill-box;transform-origin:center;animation:mote-idle ${values.duration} cubic-bezier(.77,0,.175,1) infinite}
  #${rootId}-eyes{transform-box:fill-box;transform-origin:center;animation:mote-blink 5.1s cubic-bezier(.23,1,.32,1) infinite}
}
@keyframes mote-idle{0%,100%{transform:${values.end}}50%{transform:${values.middle}}}
@keyframes mote-blink{0%,44%,48%,100%{transform:scaleY(1)}46%{transform:scaleY(.08)}}
</style>`
}

/** Build a portable, dependency-free SVG string. */
export const createAvatarSvg = ({
  shapeId,
  eyeStyle = 'neutral',
  color,
  eyeColor,
  motion = 'playful',
  state = 'idle',
  face = DEFAULT_FACE_RIG,
  animated = false,
  title,
  imageDataUrl,
}: AvatarSvgOptions): string => {
  const path = shapeById(shapeId).path
  const eyes = eyeById(eyeStyle)
  const normalizedFace = normalizeFaceRig(face)
  const leftProjection = projectEye(eyes.leftCenter, normalizedFace)
  const rightProjection = projectEye(eyes.rightCenter, normalizedFace)
  const normalizedColor = normalizeHexColor(color)
  const normalizedEyeColor = eyeColor
    ? normalizeHexColor(eyeColor)
    : getEyeColor(normalizedColor)
  const titleText = title?.trim()

  if (imageDataUrl && !IMAGE_DATA_PATTERN.test(imageDataUrl)) {
    throw new Error('Textures must be PNG, JPEG, or WebP base64 data URLs')
  }

  const suffix = hashText(
    `${shapeId}:${eyeStyle}:${normalizedColor}:${normalizedEyeColor}:${motion}:${state}:${JSON.stringify(normalizedFace)}:${titleText ?? ''}`,
  )
  const rootId = `mote-${suffix}`
  const clipId = `${rootId}-clip`
  const titleId = `${rootId}-title`
  const accessibility = titleText
    ? `role="img" aria-labelledby="${titleId}"`
    : 'aria-hidden="true"'

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" ${accessibility}>`,
    titleText
      ? `<title id="${titleId}">${escapeMarkup(titleText)}</title>`
      : '',
    animated ? createAnimationStyle(motion, rootId) : '',
    `<defs><clipPath id="${clipId}"><path d="${path}"/></clipPath></defs>`,
    `<g id="${rootId}">`,
    `<path d="${path}" fill="${normalizedColor}"/>`,
    imageDataUrl
      ? `<image href="${escapeMarkup(imageDataUrl)}" x="48" y="48" width="224" height="224" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" opacity=".78"/>`
      : '',
    `<g id="${rootId}-eyes" fill="${normalizedEyeColor}">`,
    `<g opacity="${leftProjection.opacity}" transform="${leftProjection.svgTransform}"><path d="${eyes.leftPath}"/></g>`,
    `<g opacity="${rightProjection.opacity}" transform="${rightProjection.svgTransform}"><path d="${eyes.rightPath}"/></g>`,
    '</g></g></svg>',
  ].join('')
}
