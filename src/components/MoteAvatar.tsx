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
  type MotionLevel,
  type ShapeId,
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
  const path = shapeById(shapeId).path
  const eyes = eyeById(eyeStyle)
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

  const blinkKey = `${blinkToken}-${autoBlink}`
  const blinkAnimation = shouldReduceMotion
    ? undefined
    : { transform: ['scaleY(1)', 'scaleY(0.04)', 'scaleY(1)'] }
  const sharedBlinkAnimation =
    blinkToken > 0 || autoBlink > 0 ? blinkAnimation : undefined

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
      </defs>

      <motion.path
        initial={false}
        animate={{ d: path, fill: color }}
        transition={{
          d: morphTransition,
          fill: { duration: 0.2, ease: EASE_OUT },
        }}
      />

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
            key={blinkKey}
            initial={{ transform: 'scaleY(1)' }}
            animate={sharedBlinkAnimation}
            transition={{
              duration: 0.32,
              times: [0, 0.42, 1],
              ease: EASE_OUT,
            }}
            style={{
              transformOrigin: `${eyes.leftCenter.x}px ${eyes.leftCenter.y}px`,
            }}
          >
            <motion.g
              key={`left-${winkTokens.left}`}
              data-wink="left"
              initial={{ transform: 'scaleY(1)' }}
              animate={winkTokens.left > 0 ? blinkAnimation : undefined}
              transition={{
                duration: 0.32,
                times: [0, 0.42, 1],
                ease: EASE_OUT,
              }}
              style={{
                transformOrigin: `${eyes.leftCenter.x}px ${eyes.leftCenter.y}px`,
              }}
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

        <motion.g
          data-eye="right"
          style={{
            opacity: rightOpacity,
            transform: rightTransform,
            transformOrigin: `${eyes.rightCenter.x}px ${eyes.rightCenter.y}px`,
          }}
        >
          <motion.g
            key={blinkKey}
            initial={{ transform: 'scaleY(1)' }}
            animate={sharedBlinkAnimation}
            transition={{
              duration: 0.32,
              times: [0, 0.42, 1],
              ease: EASE_OUT,
            }}
            style={{
              transformOrigin: `${eyes.rightCenter.x}px ${eyes.rightCenter.y}px`,
            }}
          >
            <motion.g
              key={`right-${winkTokens.right}`}
              data-wink="right"
              initial={{ transform: 'scaleY(1)' }}
              animate={winkTokens.right > 0 ? blinkAnimation : undefined}
              transition={{
                duration: 0.32,
                times: [0, 0.42, 1],
                ease: EASE_OUT,
              }}
              style={{
                transformOrigin: `${eyes.rightCenter.x}px ${eyes.rightCenter.y}px`,
              }}
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
      </g>
    </motion.svg>
  )
})
