import {
  DEFAULT_CONFIG,
  getEyeColor,
  normalizeHexColor,
  normalizeSurface,
  type MotionLevel,
  type SurfaceOverrides,
} from './presets.js'
import { eyeById, type EyeId } from './eyes.js'
import {
  avatarStateById,
  DEFAULT_FACE_RIG,
  normalizeFaceRig,
  performanceRigFrames,
  projectEye,
  type AvatarStateId,
  type FaceRigConfig,
} from './face-rig.js'
import { shapeById, type ShapeId } from './shapes.js'
import {
  DEFAULT_EYE_PAIR,
  type EyePairTransform,
  type EyeTransform,
} from './studio.js'

export type AvatarSvgOptions = {
  shapeId: ShapeId
  eyeStyle?: EyeId
  color: string
  eyeColor?: string
  motion?: MotionLevel
  state?: AvatarStateId
  face?: Partial<FaceRigConfig>
  eyeTransform?: EyePairTransform
  surface?: SurfaceOverrides
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

const percentage = (value: number) => Number(value.toFixed(3))

const createAnimationStyle = (
  motion: MotionLevel,
  rootId: string,
  state: AvatarStateId,
  baseEyes: ReturnType<typeof eyeById>,
  normalizedFace: FaceRigConfig,
) => {
  const values = animationValues[motion]
  const stateDefinition = avatarStateById(state)
  const rigFrames = performanceRigFrames(stateDefinition, normalizedFace)
  const baseLeft = projectEye(baseEyes.leftCenter, normalizedFace)
  const baseRight = projectEye(baseEyes.rightCenter, normalizedFace)
  const leftFrames = rigFrames.map((frame) =>
    projectEye(baseEyes.leftCenter, frame),
  )
  const rightFrames = rigFrames.map((frame) =>
    projectEye(baseEyes.rightCenter, frame),
  )
  const expressionFrames = stateDefinition.performance.eyeSequence.map(
    (eyeId, index, sequence) =>
      index === 0 || index === sequence.length - 1 ? baseEyes : eyeById(eyeId),
  )
  const cycleMs = Math.max(
    stateDefinition.cadenceMs,
    stateDefinition.performance.durationMs,
  )
  const returnPercent = percentage(
    (stateDefinition.performance.durationMs * 100) / cycleMs,
  )
  const cycleSeconds = `${cycleMs / 1000}s`
  const framePercent = (index: number) =>
    percentage(
      ((stateDefinition.performance.times[index] ?? 0) *
        stateDefinition.performance.durationMs *
        100) /
        cycleMs,
    )
  const projectionFrames = (
    frames: ReturnType<typeof projectEye>[],
    base: ReturnType<typeof projectEye>,
  ) =>
    `${frames
      .map(
        (frame, index) =>
          `${framePercent(index)}%{transform:${frame.cssTransform};opacity:${frame.opacity}}`,
      )
      .join('')}100%{transform:${base.cssTransform};opacity:${base.opacity}}`
  const expressionKeyframes = (side: 'left' | 'right') =>
    `${expressionFrames
      .map(
        (eyes, index) =>
          `${framePercent(index)}%{d:path("${side === 'left' ? eyes.leftPath : eyes.rightPath}")}`,
      )
      .join(
        '',
      )}${returnPercent}%{d:path("${side === 'left' ? baseEyes.leftPath : baseEyes.rightPath}")}100%{d:path("${side === 'left' ? baseEyes.leftPath : baseEyes.rightPath}")}`

  return `<style>
@media (prefers-reduced-motion:no-preference){
  #${rootId}{transform-box:fill-box;transform-origin:center;animation:mote-idle ${values.duration} cubic-bezier(.77,0,.175,1) infinite}
  #${rootId}-eyes{transform-box:fill-box;transform-origin:center;animation:mote-blink 5.1s cubic-bezier(.23,1,.32,1) infinite}
  #${rootId}-left,#${rootId}-right,#${rootId}-left-path,#${rootId}-right-path{animation-duration:${cycleSeconds};animation-timing-function:cubic-bezier(.77,0,.175,1);animation-iteration-count:infinite}
  #${rootId}-left{transform-origin:${baseEyes.leftCenter.x}px ${baseEyes.leftCenter.y}px;animation-name:${rootId}-left-rig}
  #${rootId}-right{transform-origin:${baseEyes.rightCenter.x}px ${baseEyes.rightCenter.y}px;animation-name:${rootId}-right-rig}
  #${rootId}-left-path{animation-name:${rootId}-left-expression}
  #${rootId}-right-path{animation-name:${rootId}-right-expression}
}
@keyframes mote-idle{0%,100%{transform:${values.end}}50%{transform:${values.middle}}}
@keyframes mote-blink{0%,44%,48%,100%{transform:scaleY(1)}46%{transform:scaleY(.08)}}
@keyframes ${rootId}-left-rig{${projectionFrames(leftFrames, baseLeft)}}
@keyframes ${rootId}-right-rig{${projectionFrames(rightFrames, baseRight)}}
@keyframes ${rootId}-left-expression{${expressionKeyframes('left')}}
@keyframes ${rootId}-right-expression{${expressionKeyframes('right')}}
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
  eyeTransform = DEFAULT_EYE_PAIR,
  surface = DEFAULT_CONFIG.surface,
  animated = false,
  title,
  imageDataUrl,
}: AvatarSvgOptions): string => {
  const path = shapeById(shapeId).path
  const eyes = eyeById(eyeStyle)
  const normalizedFace = normalizeFaceRig(face)
  const normalizedSurface = normalizeSurface(surface)
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
    `${shapeId}:${eyeStyle}:${normalizedColor}:${normalizedEyeColor}:${motion}:${state}:${JSON.stringify(normalizedFace)}:${JSON.stringify(normalizedSurface)}:${JSON.stringify(eyeTransform)}:${titleText ?? ''}`,
  )
  const rootId = `mote-${suffix}`
  const clipId = `${rootId}-clip`
  const titleId = `${rootId}-title`
  const sphereId = `${rootId}-sphere`
  const bandId = `${rootId}-band`
  const accessibility = titleText
    ? `role="img" aria-labelledby="${titleId}"`
    : 'aria-hidden="true"'
  const localEyeTransform = (
    side: EyeTransform,
    center: { x: number; y: number },
  ) =>
    `translate(${center.x} ${center.y}) translate(${side.offsetX} ${side.offsetY}) rotate(${side.rotation}) scale(${side.scaleX} ${side.scaleY}) translate(${-center.x} ${-center.y})`
  const surfaceMarkup = (() => {
    if (normalizedSurface.id === 'flat') return ''
    const common = `clip-path="url(#${clipId})" opacity="${0.16 + normalizedSurface.depth * 0.54}" transform="rotate(${normalizedSurface.rotateZ} 160 160) skewX(${normalizedSurface.rotateY * 0.08}) scale(1 ${1 - Math.abs(normalizedSurface.rotateX) * 0.0015})" data-surface="${normalizedSurface.id}"`
    if (normalizedSurface.id === 'sphere') {
      return `<g ${common}><rect width="320" height="320" fill="url(#${sphereId})"/></g>`
    }
    if (
      normalizedSurface.id === 'cylinder' ||
      normalizedSurface.id === 'capsule'
    ) {
      return `<g ${common}><rect width="320" height="320" fill="url(#${bandId})"/>${normalizedSurface.id === 'capsule' ? '<ellipse cx="160" cy="78" rx="116" ry="42" fill="#fff" opacity=".16"/>' : ''}</g>`
    }
    return `<g ${common}><path d="M0 0H175L145 320H0Z" fill="#fff" opacity=".3"/><path d="M175 0H320V320H145Z" fill="#080907" opacity=".44"/><path d="M0 0H320L238 92H76Z" fill="#fff" opacity=".18"/></g>`
  })()

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" ${accessibility}>`,
    titleText
      ? `<title id="${titleId}">${escapeMarkup(titleText)}</title>`
      : '',
    animated
      ? createAnimationStyle(motion, rootId, state, eyes, normalizedFace)
      : '',
    `<defs><clipPath id="${clipId}"><path d="${path}"/></clipPath><radialGradient id="${sphereId}" cx="${45 + normalizedSurface.rotateY * 0.28}%" cy="${38 + normalizedSurface.rotateX * 0.22}%" r="72%"><stop offset="0" stop-color="#fff" stop-opacity=".72"/><stop offset=".48" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#050604" stop-opacity=".72"/></radialGradient><linearGradient id="${bandId}" x1="0" y1=".5" x2="1" y2=".5"><stop offset="0" stop-color="#060705" stop-opacity=".48"/><stop offset=".42" stop-color="#fff" stop-opacity=".34"/><stop offset=".68" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#050604" stop-opacity=".42"/></linearGradient></defs>`,
    `<g id="${rootId}">`,
    `<path d="${path}" fill="${normalizedColor}"/>`,
    surfaceMarkup,
    imageDataUrl
      ? `<image href="${escapeMarkup(imageDataUrl)}" x="48" y="48" width="224" height="224" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" opacity=".78"/>`
      : '',
    `<g id="${rootId}-eyes" fill="${normalizedEyeColor}" clip-path="url(#${clipId})">`,
    `<g id="${rootId}-left" opacity="${leftProjection.opacity}" transform="${leftProjection.svgTransform}"><g transform="${localEyeTransform(eyeTransform.left, eyes.leftCenter)}"><path id="${rootId}-left-path" d="${eyes.leftPath}"/></g></g>`,
    `<g id="${rootId}-right" opacity="${rightProjection.opacity}" transform="${rightProjection.svgTransform}"><g transform="${localEyeTransform(eyeTransform.right, eyes.rightCenter)}"><path id="${rootId}-right-path" d="${eyes.rightPath}"/></g></g>`,
    '</g></g></svg>',
  ].join('')
}
