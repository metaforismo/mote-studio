import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react'
import { memo, useEffect, useId, useState } from 'react'
import {
  eyeById,
  shapeById,
  type EyeId,
  type MotionLevel,
  type ShapeId,
} from '@mote-studio/core'

type MoteAvatarProps = {
  shapeId: ShapeId
  eyeStyle: EyeId
  color: string
  eyeColor: string
  motionLevel: MotionLevel
  gaze: { x: number; y: number }
  blinkToken: number
  turnToken: number
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
const ALIVE_SPRING = { type: 'spring', duration: 0.5, bounce: 0.2 } as const

const FACE_CENTER_X = 160
const FACE_RADIUS = 108

const projectEye = (baseX: number, turnDegrees: number) => {
  const offset = baseX - FACE_CENTER_X
  const baseLongitude = Math.asin(offset / FACE_RADIUS)
  const longitude = baseLongitude + (turnDegrees * Math.PI) / 180
  const depth = Math.cos(longitude)
  const perspective =
    Math.max(depth, 0.02) / Math.max(Math.cos(baseLongitude), 0.02)
  const projectedX = FACE_CENTER_X + FACE_RADIUS * Math.sin(longitude)

  return {
    opacity: depth > 0.02 ? 1 : 0,
    transform: `translate3d(${projectedX - baseX}px, 0, 0) scaleX(${perspective})`,
  }
}

export const MoteAvatar = memo(function MoteAvatar({
  shapeId,
  eyeStyle,
  color,
  eyeColor,
  motionLevel,
  gaze,
  blinkToken,
  turnToken,
  imageDataUrl,
}: MoteAvatarProps) {
  const shouldReduceMotion = useReducedMotion()
  const [autoBlink, setAutoBlink] = useState(0)
  const faceTurn = useMotionValue(0)
  const leftTurnTransform = useTransform(
    faceTurn,
    (degrees) => projectEye(134, degrees).transform,
  )
  const rightTurnTransform = useTransform(
    faceTurn,
    (degrees) => projectEye(189, degrees).transform,
  )
  const leftTurnOpacity = useTransform(
    faceTurn,
    (degrees) => projectEye(134, degrees).opacity,
  )
  const rightTurnOpacity = useTransform(
    faceTurn,
    (degrees) => projectEye(189, degrees).opacity,
  )
  const clipId = useId().replaceAll(':', '')
  const path = shapeById(shapeId).path
  const eyes = eyeById(eyeStyle)
  const preset = MOTION_PRESETS[motionLevel]
  const morphTransition = shouldReduceMotion ? { duration: 0 } : ALIVE_SPRING

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
      faceTurn.set(0)
      return
    }

    let frame = 0
    const startedAt = performance.now()

    const turn = (now: number) => {
      const progress = Math.min((now - startedAt) / 1200, 1)
      faceTurn.set(Math.sin(progress * Math.PI * 2) * 85 * (1 - progress))

      if (progress < 1) {
        frame = window.requestAnimationFrame(turn)
      } else {
        faceTurn.set(0)
      }
    }

    frame = window.requestAnimationFrame(turn)

    return () => {
      window.cancelAnimationFrame(frame)
      faceTurn.set(0)
    }
  }, [faceTurn, shouldReduceMotion, turnToken])

  return (
    <motion.svg
      viewBox="0 0 320 320"
      role="img"
      aria-label={`${shapeById(shapeId).label} mote preview`}
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

      <motion.g
        key={`${blinkToken}-${autoBlink}`}
        initial={{ transform: 'scaleY(1)' }}
        animate={
          shouldReduceMotion
            ? undefined
            : { transform: ['scaleY(1)', 'scaleY(0.08)', 'scaleY(1)'] }
        }
        transition={{ duration: 0.2, times: [0, 0.48, 1], ease: EASE_OUT }}
        style={{ transformOrigin: '160px 153px' }}
      >
        <motion.g
          animate={{
            transform: `translate3d(${gaze.x * 10}px, ${gaze.y * 7}px, 0)`,
          }}
          transition={ALIVE_SPRING}
        >
          <motion.g
            style={{
              opacity: leftTurnOpacity,
              transform: leftTurnTransform,
              transformOrigin: '134px 153px',
            }}
          >
            <motion.path
              initial={false}
              animate={{
                d: eyes.leftPath,
                fill: eyeColor,
              }}
              transition={{
                d: morphTransition,
                fill: { duration: 0.2, ease: EASE_OUT },
              }}
            />
          </motion.g>
          <motion.g
            style={{
              opacity: rightTurnOpacity,
              transform: rightTurnTransform,
              transformOrigin: '189px 153px',
            }}
          >
            <motion.path
              initial={false}
              animate={{
                d: eyes.rightPath,
                fill: eyeColor,
              }}
              transition={{
                d: morphTransition,
                fill: { duration: 0.2, ease: EASE_OUT },
              }}
            />
          </motion.g>
        </motion.g>
      </motion.g>
    </motion.svg>
  )
})
