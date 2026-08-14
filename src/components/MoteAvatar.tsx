import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { memo, useEffect, useId, useMemo, useState } from 'react'
import {
  avatarStateById,
  eyeById,
  projectEye,
  shapeById,
  type AvatarStateId,
  type EyeId,
  type FaceRigConfig,
  type EyePairTransform,
  type MotionLevel,
  type ShapeId,
  type SurfaceConfig,
} from '@mote-studio/core'

export type WinkSide = 'left' | 'right'
export type WinkTokens = Record<WinkSide, number>

type MoteAvatarProps = {
  shapeId: ShapeId
  eyeStyle: EyeId
  color: string
  eyeColor: string
  motionLevel: MotionLevel
  state: AvatarStateId
  faceRig: FaceRigConfig
  eyeTransform?: EyePairTransform
  surface: SurfaceConfig
  gaze: { x: number; y: number }
  blinkToken: number
  winkTokens: WinkTokens
  turnToken: number
  posePerformanceToken: number
  posePerformanceActive: boolean
  imageDataUrl?: string | null
}

const MOTION_PRESETS: Record<
  MotionLevel,
  { transform: string[]; duration: number }
> = {
  calm: {
    transform: [
      'translate3d(0, 0, 0) rotate(-0.4deg) scale(1)',
      'translate3d(0, -3px, 0) rotate(0.4deg) scale(1.006)',
      'translate3d(0, 0, 0) rotate(-0.4deg) scale(1)',
    ],
    duration: 6.8,
  },
  playful: {
    transform: [
      'translate3d(0, 0, 0) rotate(-1.4deg) scale(1)',
      'translate3d(0, -8px, 0) rotate(1.4deg) scale(1.018)',
      'translate3d(0, 0, 0) rotate(-1.4deg) scale(1)',
    ],
    duration: 4.4,
  },
  kinetic: {
    transform: [
      'translate3d(0, 0, 0) rotate(-2.5deg) scale(1)',
      'translate3d(0, -12px, 0) rotate(2.2deg) scale(1.03)',
      'translate3d(0, 1px, 0) rotate(-1.2deg) scale(0.99)',
      'translate3d(0, -7px, 0) rotate(1.4deg) scale(1.02)',
      'translate3d(0, 0, 0) rotate(-2.5deg) scale(1)',
    ],
    duration: 3.2,
  },
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const
const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const
const MORPH_SPRING = { type: 'spring', duration: 0.5, bounce: 0.2 } as const
const RIG_SPRING = { stiffness: 260, damping: 28, mass: 0.72 } as const

const useRigSpring = (target: number) => {
  const spring = useSpring(target, RIG_SPRING)
  useEffect(() => spring.set(target), [spring, target])
  return spring
}

type RigMotionValues = {
  gazeX: MotionValue<number>
  gazeY: MotionValue<number>
  turn: MotionValue<number>
  demoTurn: MotionValue<number>
  eyeSpacing: MotionValue<number>
  eyeScale: MotionValue<number>
  eyeRotation: MotionValue<number>
  eyeOffsetY: MotionValue<number>
  perspective: MotionValue<number>
}

type PerformanceMotionValues = {
  [Key in keyof FaceRigConfig]: MotionValue<number>
}

const projectionTransform = (
  values: number[],
  center: { x: number; y: number },
) => {
  const [
    gazeX = 0,
    gazeY = 0,
    turn = 0,
    demoTurn = 0,
    eyeSpacing = 1,
    eyeScale = 1,
    eyeRotation = 0,
    eyeOffsetY = 0,
    perspective = 1,
    performanceGazeX = 0,
    performanceGazeY = 0,
    performanceTurn = 0,
    performanceEyeSpacing = 0,
    performanceEyeScale = 0,
    performanceEyeRotation = 0,
    performanceEyeOffsetY = 0,
    performancePerspective = 0,
  ] = values

  return projectEye(center, {
    gazeX: gazeX + performanceGazeX,
    gazeY: gazeY + performanceGazeY,
    turn: turn + demoTurn + performanceTurn,
    eyeSpacing: eyeSpacing + performanceEyeSpacing,
    eyeScale: eyeScale + performanceEyeScale,
    eyeRotation: eyeRotation + performanceEyeRotation,
    eyeOffsetY: eyeOffsetY + performanceEyeOffsetY,
    perspective: perspective + performancePerspective,
  })
}

const rigInputs = (
  values: RigMotionValues,
  performance: PerformanceMotionValues,
) => [
  values.gazeX,
  values.gazeY,
  values.turn,
  values.demoTurn,
  values.eyeSpacing,
  values.eyeScale,
  values.eyeRotation,
  values.eyeOffsetY,
  values.perspective,
  performance.gazeX,
  performance.gazeY,
  performance.turn,
  performance.eyeSpacing,
  performance.eyeScale,
  performance.eyeRotation,
  performance.eyeOffsetY,
  performance.perspective,
]

export const MoteAvatar = memo(function MoteAvatar({
  shapeId,
  eyeStyle,
  color,
  eyeColor,
  motionLevel,
  state,
  faceRig,
  eyeTransform,
  surface,
  gaze,
  blinkToken,
  winkTokens,
  turnToken,
  posePerformanceToken,
  posePerformanceActive,
  imageDataUrl,
}: MoteAvatarProps) {
  const shouldReduceMotion = useReducedMotion()
  const [autoBlink, setAutoBlink] = useState(0)
  const leftBlink = useMotionValue(1)
  const rightBlink = useMotionValue(1)
  const leftBlinkTransform = useTransform(
    leftBlink,
    (value) => `scaleY(${value})`,
  )
  const rightBlinkTransform = useTransform(
    rightBlink,
    (value) => `scaleY(${value})`,
  )
  const demoTurn = useMotionValue(0)
  const performanceGazeX = useMotionValue(0)
  const performanceGazeY = useMotionValue(0)
  const performanceTurn = useMotionValue(0)
  const performanceEyeSpacing = useMotionValue(0)
  const performanceEyeScale = useMotionValue(0)
  const performanceEyeRotation = useMotionValue(0)
  const performanceEyeOffsetY = useMotionValue(0)
  const performancePerspective = useMotionValue(0)
  const performanceValues = useMemo<PerformanceMotionValues>(
    () => ({
      gazeX: performanceGazeX,
      gazeY: performanceGazeY,
      turn: performanceTurn,
      eyeSpacing: performanceEyeSpacing,
      eyeScale: performanceEyeScale,
      eyeRotation: performanceEyeRotation,
      eyeOffsetY: performanceEyeOffsetY,
      perspective: performancePerspective,
    }),
    [
      performanceEyeOffsetY,
      performanceEyeRotation,
      performanceEyeScale,
      performanceEyeSpacing,
      performanceGazeX,
      performanceGazeY,
      performancePerspective,
      performanceTurn,
    ],
  )
  const rigValues: RigMotionValues = {
    gazeX: useRigSpring(faceRig.gazeX + gaze.x * 0.55),
    gazeY: useRigSpring(faceRig.gazeY + gaze.y * 0.55),
    turn: useRigSpring(faceRig.turn),
    demoTurn,
    eyeSpacing: useRigSpring(faceRig.eyeSpacing),
    eyeScale: useRigSpring(faceRig.eyeScale),
    eyeRotation: useRigSpring(faceRig.eyeRotation),
    eyeOffsetY: useRigSpring(faceRig.eyeOffsetY),
    perspective: useRigSpring(faceRig.perspective),
  }
  const clipId = useId().replaceAll(':', '')
  const sphereGradientId = `${clipId}-sphere`
  const bandGradientId = `${clipId}-band`
  const path = shapeById(shapeId).path
  const eyes = eyeById(eyeStyle)
  const sideTransform = (side: 'left' | 'right') => {
    const value = eyeTransform?.[side] ?? {
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
    }
    const center = side === 'left' ? eyes.leftCenter : eyes.rightCenter
    return `translate(${center.x} ${center.y}) translate(${value.offsetX} ${value.offsetY}) rotate(${value.rotation}) scale(${value.scaleX} ${value.scaleY}) translate(${-center.x} ${-center.y})`
  }
  const stateDefinition = avatarStateById(state)
  const preset = MOTION_PRESETS[motionLevel]
  const morphTransition = shouldReduceMotion ? { duration: 0 } : MORPH_SPRING
  const performancePaths = useMemo(
    () => ({
      left:
        posePerformanceActive && !shouldReduceMotion
          ? stateDefinition.performance.eyeSequence.map(
              (eyeId) => eyeById(eyeId).leftPath,
            )
          : eyes.leftPath,
      right:
        posePerformanceActive && !shouldReduceMotion
          ? stateDefinition.performance.eyeSequence.map(
              (eyeId) => eyeById(eyeId).rightPath,
            )
          : eyes.rightPath,
    }),
    [
      eyes.leftPath,
      eyes.rightPath,
      posePerformanceActive,
      shouldReduceMotion,
      stateDefinition.performance.eyeSequence,
    ],
  )
  const eyePathTransition = posePerformanceActive
    ? {
        duration: stateDefinition.performance.durationMs / 1000,
        times: [...stateDefinition.performance.times],
        ease: EASE_IN_OUT,
      }
    : morphTransition
  const inputs = rigInputs(rigValues, performanceValues)
  const leftProjection = useTransform(inputs, (values) =>
    projectionTransform(values as number[], eyes.leftCenter),
  )
  const rightProjection = useTransform(inputs, (values) =>
    projectionTransform(values as number[], eyes.rightCenter),
  )
  const leftTransform = useTransform(
    leftProjection,
    (projection) => projection.cssTransform,
  )
  const rightTransform = useTransform(
    rightProjection,
    (projection) => projection.cssTransform,
  )
  const leftOpacity = useTransform(
    leftProjection,
    (projection) => projection.opacity,
  )
  const rightOpacity = useTransform(
    rightProjection,
    (projection) => projection.opacity,
  )

  useEffect(() => {
    if (shouldReduceMotion) return

    let timeout: number
    const schedule = () => {
      timeout = window.setTimeout(
        () => {
          setAutoBlink((value) => value + 1)
          schedule()
        },
        2600 + Math.random() * 3300,
      )
    }
    schedule()
    return () => window.clearTimeout(timeout)
  }, [shouldReduceMotion])

  useEffect(() => {
    if (shouldReduceMotion) {
      leftBlink.set(1)
      return
    }
    if (autoBlink === 0 && blinkToken === 0 && winkTokens.left === 0) return
    const controls = animate(leftBlink, [leftBlink.get(), 0.04, 1], {
      duration: 0.32,
      times: [0, 0.42, 1],
      ease: EASE_OUT,
    })
    return () => controls.stop()
  }, [autoBlink, blinkToken, leftBlink, shouldReduceMotion, winkTokens.left])

  useEffect(() => {
    if (shouldReduceMotion) {
      rightBlink.set(1)
      return
    }
    if (autoBlink === 0 && blinkToken === 0 && winkTokens.right === 0) return
    const controls = animate(rightBlink, [rightBlink.get(), 0.04, 1], {
      duration: 0.32,
      times: [0, 0.42, 1],
      ease: EASE_OUT,
    })
    return () => controls.stop()
  }, [autoBlink, blinkToken, rightBlink, shouldReduceMotion, winkTokens.right])

  useEffect(() => {
    if (turnToken === 0 || shouldReduceMotion) {
      demoTurn.set(0)
      return
    }

    const controls = animate(demoTurn, [0, 88, -68, 0], {
      duration: 1.35,
      times: [0, 0.32, 0.7, 1],
      ease: EASE_IN_OUT,
    })
    return () => controls.stop()
  }, [demoTurn, shouldReduceMotion, turnToken])

  useEffect(() => {
    const controls: Array<{ stop: () => void }> = []
    const resetPerformance = () => {
      for (const value of Object.values(performanceValues)) value.set(0)
    }

    resetPerformance()
    if (!posePerformanceActive || shouldReduceMotion) return

    for (const [key, frames] of Object.entries(
      stateDefinition.performance.rigDeltas,
    ) as [keyof FaceRigConfig, readonly number[]][]) {
      controls.push(
        animate(performanceValues[key], [...frames], {
          duration: stateDefinition.performance.durationMs / 1000,
          times: [...stateDefinition.performance.times],
          ease: EASE_IN_OUT,
        }),
      )
    }

    return () => {
      for (const control of controls) control.stop()
      resetPerformance()
    }
  }, [
    posePerformanceActive,
    posePerformanceToken,
    performanceValues,
    shouldReduceMotion,
    stateDefinition,
  ])

  return (
    <motion.svg
      viewBox="0 0 320 320"
      role="img"
      aria-label={`${shapeById(shapeId).label} mote, ${avatarStateById(state).label.toLowerCase()} state`}
      data-pose-performance={posePerformanceActive ? state : undefined}
      className="h-full w-full overflow-visible drop-shadow-[0_28px_30px_rgba(27,25,20,0.16)]"
      animate={shouldReduceMotion ? undefined : { transform: preset.transform }}
      transition={{
        duration: preset.duration,
        repeat: Number.POSITIVE_INFINITY,
        ease: EASE_IN_OUT,
      }}
      style={{ transformOrigin: '50% 58%' }}
    >
      <defs>
        <clipPath id={clipId}>
          <motion.path
            initial={false}
            animate={{ d: path }}
            transition={morphTransition}
          />
        </clipPath>
        <radialGradient
          id={sphereGradientId}
          cx={`${45 + surface.rotateY * 0.28}%`}
          cy={`${38 + surface.rotateX * 0.22}%`}
          r="72%"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.72" />
          <stop offset="48%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#050604" stopOpacity="0.72" />
        </radialGradient>
        <linearGradient
          id={bandGradientId}
          x1={surface.id === 'cylinder' ? '0%' : '8%'}
          y1={surface.id === 'cylinder' ? '50%' : '0%'}
          x2={surface.id === 'cylinder' ? '100%' : '92%'}
          y2={surface.id === 'cylinder' ? '50%' : '100%'}
        >
          <stop offset="0%" stopColor="#060705" stopOpacity="0.48" />
          <stop offset="42%" stopColor="#ffffff" stopOpacity="0.34" />
          <stop offset="68%" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#050604" stopOpacity="0.42" />
        </linearGradient>
      </defs>

      <motion.path
        initial={false}
        animate={{ d: path, fill: color }}
        transition={{
          d: morphTransition,
          fill: { duration: 0.2, ease: EASE_OUT },
        }}
      />

      {surface.id !== 'flat' ? (
        <g
          clipPath={`url(#${clipId})`}
          opacity={0.16 + surface.depth * 0.54}
          aria-hidden="true"
          data-surface={surface.id}
          style={{
            transform: `rotate(${surface.rotateZ}deg) skewX(${surface.rotateY * 0.08}deg) scaleY(${1 - Math.abs(surface.rotateX) * 0.0015})`,
            transformOrigin: '160px 160px',
          }}
        >
          {surface.id === 'sphere' ? (
            <rect width="320" height="320" fill={`url(#${sphereGradientId})`} />
          ) : null}
          {surface.id === 'cylinder' || surface.id === 'capsule' ? (
            <rect width="320" height="320" fill={`url(#${bandGradientId})`} />
          ) : null}
          {surface.id === 'cube' ? (
            <>
              <path d="M0 0H175L145 320H0Z" fill="#ffffff" opacity="0.3" />
              <path d="M175 0H320V320H145Z" fill="#080907" opacity="0.44" />
              <path d="M0 0H320L238 92H76Z" fill="#ffffff" opacity="0.18" />
            </>
          ) : null}
          {surface.id === 'capsule' ? (
            <ellipse
              cx="160"
              cy="78"
              rx="116"
              ry="42"
              fill="#ffffff"
              opacity="0.16"
            />
          ) : null}
        </g>
      ) : null}

      {imageDataUrl ? (
        <motion.image
          key={imageDataUrl.slice(-24)}
          href={imageDataUrl}
          x="45"
          y="45"
          width="230"
          height="230"
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          initial={{ opacity: 0, transform: 'scale(0.97)' }}
          animate={{ opacity: 0.76, transform: 'scale(1)' }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
          style={{ transformOrigin: '160px 160px' }}
        />
      ) : null}

      <g data-eye-layer="clipped" clipPath={`url(#${clipId})`}>
        <motion.g
          data-eye="left"
          style={{
            opacity: leftOpacity,
            transform: leftTransform,
            transformOrigin: `${eyes.leftCenter.x}px ${eyes.leftCenter.y}px`,
          }}
        >
          <motion.g
            style={{
              transform: leftBlinkTransform,
              transformOrigin: `${eyes.leftCenter.x}px ${eyes.leftCenter.y}px`,
            }}
          >
            <motion.g data-wink="left">
              <motion.g
                initial={false}
                animate={{ transform: sideTransform('left') }}
                transition={morphTransition}
              >
                <motion.path
                  key={`left-performance-${posePerformanceToken}`}
                  initial={false}
                  animate={{ d: performancePaths.left, fill: eyeColor }}
                  transition={{
                    d: eyePathTransition,
                    fill: { duration: 0.2, ease: EASE_OUT },
                  }}
                />
              </motion.g>
            </motion.g>
          </motion.g>
        </motion.g>

        <motion.g
          data-eye="right"
          style={{
            opacity: rightOpacity,
            transform: rightTransform,
            transformOrigin: `${eyes.rightCenter.x}px ${eyes.rightCenter.y}px`,
          }}
        >
          <motion.g
            style={{
              transform: rightBlinkTransform,
              transformOrigin: `${eyes.rightCenter.x}px ${eyes.rightCenter.y}px`,
            }}
          >
            <motion.g data-wink="right">
              <motion.g
                initial={false}
                animate={{ transform: sideTransform('right') }}
                transition={morphTransition}
              >
                <motion.path
                  key={`right-performance-${posePerformanceToken}`}
                  initial={false}
                  animate={{ d: performancePaths.right, fill: eyeColor }}
                  transition={{
                    d: eyePathTransition,
                    fill: { duration: 0.2, ease: EASE_OUT },
                  }}
                />
              </motion.g>
            </motion.g>
          </motion.g>
        </motion.g>
      </g>
    </motion.svg>
  )
})
