import { motion, useReducedMotion } from 'motion/react'
import { memo, useEffect, useId, useState } from 'react'
import type { MotionLevel } from '../constants'
import type { ShapeId } from '../lib/shapes'
import { shapeById } from '../lib/shapes'

type MoteAvatarProps = {
  shapeId: ShapeId
  color: string
  eyeColor: string
  motionLevel: MotionLevel
  gaze: { x: number; y: number }
  blinkToken: number
  burstToken: number
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

const OrbitBurst = memo(function OrbitBurst({ token }: { token: number }) {
  if (token === 0) return null

  const strokes = ['#f56a16', '#16a79d', '#7651d6', '#d72879', '#d2b83d']

  return (
    <motion.g
      key={token}
      initial={{ opacity: 0, transform: 'scale(0.92)' }}
      animate={{
        opacity: [0, 0.92, 0],
        transform: ['scale(0.92)', 'scale(1.12)', 'scale(1.32)'],
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.05, times: [0, 0.28, 1], ease: EASE_OUT }}
      style={{ transformOrigin: '160px 160px' }}
      aria-hidden="true"
    >
      {strokes.map((stroke, index) => (
        <motion.ellipse
          key={stroke}
          cx="160"
          cy="160"
          rx={126 - index * 5}
          ry={48 + index * 8}
          fill="none"
          stroke={stroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${160 + index * 22} 94`}
          initial={{ transform: `rotate(${index * 28 - 52}deg)` }}
          animate={{
            transform: `rotate(${index % 2 === 0 ? 210 + index * 18 : -190 - index * 14}deg)`,
          }}
          transition={{ duration: 1.05, ease: EASE_OUT }}
          style={{ transformOrigin: '160px 160px' }}
        />
      ))}
    </motion.g>
  )
})

export const MoteAvatar = memo(function MoteAvatar({
  shapeId,
  color,
  eyeColor,
  motionLevel,
  gaze,
  blinkToken,
  burstToken,
  imageDataUrl,
}: MoteAvatarProps) {
  const shouldReduceMotion = useReducedMotion()
  const [autoBlink, setAutoBlink] = useState(0)
  const clipId = useId().replaceAll(':', '')
  const path = shapeById(shapeId).path
  const preset = MOTION_PRESETS[motionLevel]

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
            transition={ALIVE_SPRING}
          />
        </clipPath>
      </defs>

      {!shouldReduceMotion && (
        <OrbitBurst key={burstToken} token={burstToken} />
      )}

      <motion.path
        initial={false}
        animate={{ d: path, fill: color }}
        transition={{
          d: ALIVE_SPRING,
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
          <motion.rect
            x="122"
            y="125"
            width="24"
            height="56"
            rx="12"
            animate={{
              fill: eyeColor,
              transform: `rotate(${8 + gaze.x * 3}deg)`,
            }}
            transition={{
              fill: { duration: 0.2, ease: EASE_OUT },
              transform: ALIVE_SPRING,
            }}
            style={{ transformOrigin: '134px 153px' }}
          />
          <motion.rect
            x="177"
            y="125"
            width="24"
            height="56"
            rx="12"
            animate={{
              fill: eyeColor,
              transform: `rotate(${8 + gaze.x * 3}deg)`,
            }}
            transition={{
              fill: { duration: 0.2, ease: EASE_OUT },
              transform: ALIVE_SPRING,
            }}
            style={{ transformOrigin: '189px 153px' }}
          />
        </motion.g>
      </motion.g>
    </motion.svg>
  )
})
