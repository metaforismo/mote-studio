import { ArrowsClockwise, Eye, SlidersHorizontal } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import {
  AVATAR_STATES,
  eyeById,
  performanceRigFrames,
  projectEye,
  shapeById,
  type AvatarStateId,
  type FaceRigConfig,
  type ShapeId,
} from '@mote-studio/core'
import type { WinkSide } from './MoteAvatar'

type RigControl = {
  key: keyof FaceRigConfig
  label: string
  min: number
  max: number
  step: number
  format: (value: number) => string
}

const PRIMARY_CONTROLS: RigControl[] = [
  {
    key: 'turn',
    label: 'Turn',
    min: -100,
    max: 100,
    step: 1,
    format: (value) =>
      value === 0
        ? 'Front'
        : `${Math.abs(Math.round(value))}° ${value < 0 ? 'left' : 'right'}`,
  },
  {
    key: 'eyeSpacing',
    label: 'Spacing',
    min: 0.55,
    max: 1.55,
    step: 0.01,
    format: (value) => `${Math.round(value * 100)}%`,
  },
  {
    key: 'eyeScale',
    label: 'Eye size',
    min: 0.45,
    max: 1.65,
    step: 0.01,
    format: (value) => `${Math.round(value * 100)}%`,
  },
]

const ADVANCED_CONTROLS: RigControl[] = [
  {
    key: 'eyeRotation',
    label: 'Eye tilt',
    min: -55,
    max: 55,
    step: 1,
    format: (value) => `${Math.round(value)}°`,
  },
  {
    key: 'eyeOffsetY',
    label: 'Eye height',
    min: -34,
    max: 34,
    step: 1,
    format: (value) =>
      value === 0
        ? 'Center'
        : `${Math.abs(Math.round(value))} ${value < 0 ? 'up' : 'down'}`,
  },
  {
    key: 'perspective',
    label: 'Depth',
    min: 0,
    max: 1.4,
    step: 0.01,
    format: (value) => `${Math.round(value * 100)}%`,
  },
]

const clamp = (value: number) => Math.max(-1, Math.min(1, value))

const POSE_SHORT_LABELS: Record<AvatarStateId, string> = {
  idle: 'Idle',
  listening: 'Listen',
  thinking: 'Think',
  searching: 'Search',
  excited: 'Excited',
  curious: 'Curious',
  playful: 'Playful',
  sleeping: 'Sleep',
  surprised: 'Surprise',
  focused: 'Focus',
  shy: 'Shy',
  doubtful: 'Doubt',
}

type FaceRigPanelProps = {
  state: AvatarStateId
  face: FaceRigConfig
  shapeId: ShapeId
  color: string
  eyeColor: string
  onSelectState: (state: AvatarStateId, animate: boolean) => void
  onChange: (key: keyof FaceRigConfig, value: number) => void
  onWink: (side: WinkSide) => void
  onResetPose: () => void
  performanceState: AvatarStateId | null
  performanceToken: number
  reduceMotion: boolean
}

function StatePreview({
  stateId,
  shapeId,
  color,
  eyeColor,
  animatePerformance,
  performanceToken,
  reduceMotion,
}: {
  stateId: AvatarStateId
  shapeId: ShapeId
  color: string
  eyeColor: string
  animatePerformance: boolean
  performanceToken: number
  reduceMotion: boolean
}) {
  const definition = AVATAR_STATES.find((candidate) => candidate.id === stateId)
  if (!definition) return null

  const eyes = eyeById(definition.eyePair[0])
  const alternateEyes = eyeById(definition.eyePair[1])
  const shapePath = shapeById(shapeId).path
  const rigFrames = performanceRigFrames(definition)
  const leftFrames = rigFrames.map((frame) =>
    projectEye(eyes.leftCenter, frame),
  )
  const rightFrames = rigFrames.map((frame) =>
    projectEye(eyes.rightCenter, frame),
  )
  const left = leftFrames[0]
  const right = rightFrames[0]
  const clipId = `rig-state-${stateId}`

  return (
    <svg viewBox="0 0 320 320" aria-hidden="true" className="h-11 w-11">
      <defs>
        <clipPath id={clipId}>
          <path d={shapePath} />
        </clipPath>
      </defs>
      <path d={shapePath} fill={color} />
      <g fill={eyeColor} clipPath={`url(#${clipId})`}>
        <motion.g
          key={`left-projection-${performanceToken}`}
          initial={false}
          animate={{
            opacity:
              animatePerformance && !reduceMotion
                ? leftFrames.map((frame) => frame.opacity)
                : left.opacity,
            transform:
              animatePerformance && !reduceMotion
                ? leftFrames.map((frame) => frame.cssTransform)
                : left.cssTransform,
          }}
          transition={{
            duration: definition.performance.durationMs / 1000,
            times: [...definition.performance.times],
            ease: [0.77, 0, 0.175, 1],
          }}
          style={{
            transformOrigin: `${eyes.leftCenter.x}px ${eyes.leftCenter.y}px`,
          }}
        >
          <motion.path
            key={`left-${performanceToken}`}
            initial={false}
            animate={{
              d:
                animatePerformance && !reduceMotion
                  ? [eyes.leftPath, alternateEyes.leftPath, eyes.leftPath]
                  : eyes.leftPath,
            }}
            transition={{
              duration: definition.performance.durationMs / 1000,
              times: [...definition.performance.times],
              ease: [0.77, 0, 0.175, 1],
            }}
          />
        </motion.g>
        <motion.g
          key={`right-projection-${performanceToken}`}
          initial={false}
          animate={{
            opacity:
              animatePerformance && !reduceMotion
                ? rightFrames.map((frame) => frame.opacity)
                : right.opacity,
            transform:
              animatePerformance && !reduceMotion
                ? rightFrames.map((frame) => frame.cssTransform)
                : right.cssTransform,
          }}
          transition={{
            duration: definition.performance.durationMs / 1000,
            times: [...definition.performance.times],
            ease: [0.77, 0, 0.175, 1],
          }}
          style={{
            transformOrigin: `${eyes.rightCenter.x}px ${eyes.rightCenter.y}px`,
          }}
        >
          <motion.path
            key={`right-${performanceToken}`}
            initial={false}
            animate={{
              d:
                animatePerformance && !reduceMotion
                  ? [eyes.rightPath, alternateEyes.rightPath, eyes.rightPath]
                  : eyes.rightPath,
            }}
            transition={{
              duration: definition.performance.durationMs / 1000,
              times: [...definition.performance.times],
              ease: [0.77, 0, 0.175, 1],
            }}
          />
        </motion.g>
      </g>
    </svg>
  )
}

function RigSlider({
  control,
  value,
  onChange,
}: {
  control: RigControl
  value: number
  onChange: (key: keyof FaceRigConfig, value: number) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <label
          htmlFor={`rig-${control.key}`}
          className="font-medium text-[#c8cac2]"
        >
          {control.label}
        </label>
        <output
          htmlFor={`rig-${control.key}`}
          className="rounded-md bg-white/[0.055] px-2 py-0.5 text-[0.65rem] text-[#a7aaa1]"
        >
          {control.format(value)}
        </output>
      </div>
      <input
        id={`rig-${control.key}`}
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={value}
        aria-valuetext={control.format(value)}
        onChange={(event) => onChange(control.key, Number(event.target.value))}
        className="rig-range w-full"
      />
    </div>
  )
}

export function FaceRigPanel({
  state,
  face,
  shapeId,
  color,
  eyeColor,
  onSelectState,
  onChange,
  onWink,
  onResetPose,
  performanceState,
  performanceToken,
  reduceMotion,
}: FaceRigPanelProps) {
  const padRef = useRef<HTMLButtonElement>(null)

  const setGaze = (x: number, y: number) => {
    onChange('gazeX', clamp(x))
    onChange('gazeY', clamp(y))
  }

  const updateGazeFromPointer = (event: PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    setGaze(
      ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
      ((event.clientY - bounds.top) / bounds.height - 0.5) * 2,
    )
  }

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    updateGazeFromPointer(event)
  }

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    updateGazeFromPointer(event)
  }

  const handleGazeKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 0.25 : 0.08
    const next = { x: face.gazeX, y: face.gazeY }

    if (event.key === 'ArrowLeft') next.x -= step
    else if (event.key === 'ArrowRight') next.x += step
    else if (event.key === 'ArrowUp') next.y -= step
    else if (event.key === 'ArrowDown') next.y += step
    else if (event.key === 'Home') {
      next.x = 0
      next.y = 0
    } else return

    event.preventDefault()
    setGaze(next.x, next.y)
  }

  const gazeLabel = `${face.gazeX < -0.12 ? 'left' : face.gazeX > 0.12 ? 'right' : 'center'}, ${face.gazeY < -0.12 ? 'up' : face.gazeY > 0.12 ? 'down' : 'middle'}`

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[#f2f0e8]">
            <SlidersHorizontal aria-hidden="true" size={17} />
            Face pose
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.035] px-2 py-1 text-[0.62rem] font-medium text-[#9da097]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${performanceState ? 'bg-[#f56a16] motion-safe:animate-pulse' : 'bg-[#19a976]'}`}
            />
            {performanceState ? 'Performing' : 'Live'}
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-[#92958c]">
          Each pose combines an eye morph with a small rig gesture. Click again
          to replay.
        </p>
      </div>

      <fieldset>
        <legend className="mb-2 text-[0.68rem] font-semibold tracking-[0.18em] text-[#8f9188] uppercase">
          Pose
        </legend>
        <div className="grid grid-cols-4 gap-2">
          {AVATAR_STATES.map((definition) => (
            <button
              key={definition.id}
              type="button"
              aria-label={`${definition.label}: ${definition.description}`}
              aria-pressed={state === definition.id}
              title={definition.description}
              onClick={(event) =>
                onSelectState(definition.id, event.detail > 0)
              }
              className="group relative flex min-w-0 flex-col items-center gap-1 overflow-hidden rounded-xl border border-white/[0.07] bg-[#1c1d19] px-1 py-2 text-[0.6rem] font-medium text-[#9da097] transition-[border-color,background-color,color,transform] hover:border-white/[0.15] hover:text-[#e8e8e2] focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none active:scale-[0.97] aria-pressed:border-[#f56a16]/70 aria-pressed:bg-[#f56a16]/10 aria-pressed:text-[#f2f0e8]"
            >
              <StatePreview
                stateId={definition.id}
                shapeId={shapeId}
                color={color}
                eyeColor={eyeColor}
                animatePerformance={performanceState === definition.id}
                performanceToken={performanceToken}
                reduceMotion={reduceMotion}
              />
              <span>{POSE_SHORT_LABELS[definition.id]}</span>
              {performanceState === definition.id && !reduceMotion ? (
                <span className="absolute inset-x-2 bottom-0 h-px overflow-hidden rounded-full bg-white/10">
                  <motion.span
                    key={performanceToken}
                    className="block h-full w-full origin-left bg-[#f56a16]"
                    initial={{ transform: 'scaleX(0)' }}
                    animate={{ transform: 'scaleX(1)' }}
                    transition={{
                      duration: definition.performance.durationMs / 1000,
                      ease: 'linear',
                    }}
                  />
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[0.68rem] font-semibold tracking-[0.18em] text-[#8f9188] uppercase">
            Look
          </span>
          <button
            type="button"
            onClick={() => setGaze(0, 0)}
            className="rounded-lg px-2 py-1 text-[0.68rem] font-medium text-[#92958c] transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none active:scale-[0.97]"
          >
            Center
          </button>
        </div>
        <button
          ref={padRef}
          type="button"
          aria-label={`Eye direction: ${gazeLabel}. Use arrow keys to adjust and Home to center.`}
          aria-roledescription="two-dimensional eye direction control"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onKeyDown={handleGazeKeyDown}
          className="gaze-pad relative h-32 w-full touch-none overflow-hidden rounded-[1.1rem] border border-white/[0.08] bg-[#1c1d19] focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none active:cursor-grabbing"
        >
          <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-white/[0.055]" />
          <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-white/[0.055]" />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute h-7 w-7 rounded-full border-[5px] border-[#f56a16] bg-[#f2f0e8] shadow-[0_5px_18px_rgba(0,0,0,0.38)]"
            style={{
              left: `${(face.gazeX + 1) * 50}%`,
              top: `${(face.gazeY + 1) * 50}%`,
              transform: 'translate3d(-50%, -50%, 0)',
            }}
          />
          <span className="sr-only">Current direction: {gazeLabel}</span>
        </button>
      </div>

      <div className="space-y-4 rounded-[1.1rem] border border-white/[0.07] bg-[#1c1d19] p-4">
        {PRIMARY_CONTROLS.map((control) => (
          <RigSlider
            key={control.key}
            control={control}
            value={face[control.key]}
            onChange={onChange}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onWink('left')}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-2 py-2.5 text-xs font-medium text-[#d3d4cd] transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none active:scale-[0.97]"
        >
          <Eye aria-hidden="true" size={14} />
          Wink L
        </button>
        <button
          type="button"
          onClick={() => onWink('right')}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-2 py-2.5 text-xs font-medium text-[#d3d4cd] transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none active:scale-[0.97]"
        >
          Wink R
          <Eye aria-hidden="true" size={14} />
        </button>
        <button
          type="button"
          onClick={onResetPose}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-2 py-2.5 text-xs font-medium text-[#d3d4cd] transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none active:scale-[0.97]"
        >
          <ArrowsClockwise aria-hidden="true" size={14} />
          Reset
        </button>
      </div>

      <details className="rig-advanced rounded-[1.1rem] border border-white/[0.07] bg-[#1c1d19]">
        <summary className="cursor-pointer rounded-[1.1rem] px-4 py-3 text-xs font-medium text-[#aeb0a8] focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none">
          Fine tune
        </summary>
        <div className="space-y-4 border-t border-white/[0.07] px-4 pt-4 pb-4">
          {ADVANCED_CONTROLS.map((control) => (
            <RigSlider
              key={control.key}
              control={control}
              value={face[control.key]}
              onChange={onChange}
            />
          ))}
        </div>
      </details>
    </div>
  )
}
