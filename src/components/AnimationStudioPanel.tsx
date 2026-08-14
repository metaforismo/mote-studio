import { useEffect, useMemo, useState } from 'react'
import {
  EYES,
  PLAYBACK_MODES,
  SURFACES,
  TRANSITION_STYLES,
  activeAvatar,
  behaviorForAvatar,
  createAvatar,
  detachAvatarBehavior,
  duplicateAvatar,
  normalizeExpression,
  parseStudioDocument,
  serializeStudioDocument,
  type EyePairTransform,
  type EyeTransform,
  type MoteAnimation,
  type MoteAnimationStep,
  type MoteBehaviorLibrary,
  type MoteExpression,
  type MoteStudioDocument,
  type SurfaceConfig,
} from '@mote-studio/core'
import type { PlaybackStatus } from '../hooks/useAnimationPlayer'

type Mode = 'animations' | 'expressions' | 'geometry' | 'library'

type AnimationStudioPanelProps = {
  document: MoteStudioDocument
  onDocumentChange: (document: MoteStudioDocument) => void
  onSelectAvatar: (avatarId: string) => void
  onApplyExpression: (expression: MoteExpression) => void
  onSurfaceChange: (surface: SurfaceConfig) => void
  playback: {
    status: PlaybackStatus
    animationId: string | null
    stepIndex: number
    play: (animation: MoteAnimation) => void
    pause: () => void
    resume: () => void
    stop: () => void
    replay: () => void
  }
}

const modes: Array<{ id: Mode; label: string }> = [
  { id: 'animations', label: 'Animations' },
  { id: 'expressions', label: 'Expressions' },
  { id: 'geometry', label: 'Geometry' },
  { id: 'library', label: 'Library' },
]

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const inputClass =
  'w-full rounded-lg border border-white/10 bg-[#11120f] px-2.5 py-2 text-xs text-[#eeece4] outline-none transition-colors focus:border-[#f56a16] focus:ring-1 focus:ring-[#f56a16]'
const smallButton =
  'rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs font-medium text-[#c7c9c0] transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40'

const nextLocalId = (prefix: string, ids: string[]) => {
  let index = 1
  while (ids.includes(`${prefix}-${index}`)) index += 1
  return `${prefix}-${index}`
}

const downloadProject = (document: MoteStudioDocument) => {
  const blob = new Blob([serializeStudioDocument(document)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = 'mote-studio-project.json'
  link.click()
  URL.revokeObjectURL(url)
}

const EyeTransformFields = ({
  side,
  value,
  onChange,
}: {
  side: 'left' | 'right'
  value: EyeTransform
  onChange: (key: keyof EyeTransform, value: number) => void
}) => (
  <fieldset className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
    <legend className="px-1 text-[0.68rem] font-semibold tracking-[0.12em] text-[#96988f] uppercase">
      {side} eye
    </legend>
    <div className="grid grid-cols-2 gap-2">
      {(
        [
          ['scaleX', 'Width', 0.35, 1.8, 0.01],
          ['scaleY', 'Height', 0.08, 1.8, 0.01],
          ['offsetX', 'X', -36, 36, 1],
          ['offsetY', 'Y', -36, 36, 1],
          ['rotation', 'Rotate', -70, 70, 1],
        ] as const
      ).map(([key, label, min, max, step]) => (
        <label key={key} className={key === 'rotation' ? 'col-span-2' : ''}>
          <span className="mb-1 block text-[0.65rem] text-[#8f9188]">
            {label}
          </span>
          <input
            aria-label={`${side} eye ${label}`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value[key]}
            onChange={(event) => onChange(key, Number(event.target.value))}
            className={inputClass}
          />
        </label>
      ))}
    </div>
  </fieldset>
)

export function AnimationStudioPanel({
  document,
  onDocumentChange,
  onSelectAvatar,
  onApplyExpression,
  onSurfaceChange,
  playback,
}: AnimationStudioPanelProps) {
  const [mode, setMode] = useState<Mode>('animations')
  const avatar = activeAvatar(document)
  const behavior = behaviorForAvatar(document)
  const [selectedExpressionId, setSelectedExpressionId] = useState(
    behavior.expressions[0]?.id ?? '',
  )
  const [selectedAnimationId, setSelectedAnimationId] = useState(
    behavior.animations[0]?.id ?? '',
  )
  const selectedExpression =
    behavior.expressions.find(
      (expression) => expression.id === selectedExpressionId,
    ) ?? behavior.expressions[0]
  const selectedAnimation =
    behavior.animations.find(
      (animation) => animation.id === selectedAnimationId,
    ) ?? behavior.animations[0]
  const [draftExpression, setDraftExpression] = useState<MoteExpression | null>(
    selectedExpression ? clone(selectedExpression) : null,
  )
  const [selectedStepId, setSelectedStepId] = useState(
    selectedAnimation?.steps[0]?.id ?? '',
  )
  const [projectError, setProjectError] = useState('')

  useEffect(() => {
    if (selectedExpression) setDraftExpression(clone(selectedExpression))
  }, [selectedExpression])

  useEffect(() => {
    if (!behavior.expressions.some(({ id }) => id === selectedExpressionId)) {
      setSelectedExpressionId(behavior.expressions[0]?.id ?? '')
    }
    if (!behavior.animations.some(({ id }) => id === selectedAnimationId)) {
      setSelectedAnimationId(behavior.animations[0]?.id ?? '')
    }
  }, [
    behavior.animations,
    behavior.expressions,
    selectedAnimationId,
    selectedExpressionId,
  ])

  const updateBehavior = (
    updater: (behavior: MoteBehaviorLibrary) => MoteBehaviorLibrary,
  ) => {
    const detached = detachAvatarBehavior(document)
    onDocumentChange({
      ...detached,
      avatars: detached.avatars.map((candidate) =>
        candidate.id === detached.activeAvatarId
          ? { ...candidate, behavior: updater(candidate.behavior!) }
          : candidate,
      ),
    })
  }

  const updateAnimation = (
    updater: (value: MoteAnimation) => MoteAnimation,
  ) => {
    if (!selectedAnimation) return
    updateBehavior((current) => ({
      ...current,
      animations: current.animations.map((animation) =>
        animation.id === selectedAnimation.id ? updater(animation) : animation,
      ),
    }))
  }

  const selectedStep = selectedAnimation?.steps.find(
    (step) => step.id === selectedStepId,
  )

  const referencedExpressionIds = useMemo(
    () =>
      new Set(
        behavior.animations.flatMap(({ steps }) =>
          steps.map((step) => step.expressionId),
        ),
      ),
    [behavior.animations],
  )

  const updateEye = (
    side: 'left' | 'right',
    key: keyof EyeTransform,
    value: number,
  ) => {
    setDraftExpression((current) => {
      if (!current) return current
      const nextEyes: EyePairTransform = {
        ...current.eyes,
        [side]: { ...current.eyes[side], [key]: value },
      }
      if (current.eyes.linked) {
        const other = side === 'left' ? 'right' : 'left'
        nextEyes[other] = { ...nextEyes[other], [key]: value }
      }
      return normalizeExpression({ ...current, eyes: nextEyes }, current)
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#f2f0e8]">Motion studio</p>
            <p className="mt-1 text-xs leading-relaxed text-[#92958c]">
              Compose reusable expressions, then arrange them as animation
              steps.
            </p>
          </div>
          <span className="rounded-md bg-[#f56a16]/12 px-2 py-1 text-[0.62rem] font-semibold tracking-[0.12em] text-[#ff9b5d] uppercase">
            v{document.version}
          </span>
        </div>

        <div
          className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-black/20 p-1 sm:grid-cols-4"
          role="tablist"
          aria-label="Motion studio modes"
        >
          {modes.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={mode === item.id}
              onClick={() => setMode(item.id)}
              className={`rounded-lg px-1.5 py-2 text-[0.68rem] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none ${mode === item.id ? 'bg-[#303128] text-white' : 'text-[#92958c] hover:text-white'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'animations' && selectedAnimation ? (
        <div className="space-y-4">
          <label>
            <span className="mb-1.5 block text-[0.68rem] font-semibold tracking-[0.12em] text-[#8f9188] uppercase">
              Animation
            </span>
            <select
              aria-label="Animation"
              value={selectedAnimation.id}
              onChange={(event) => {
                setSelectedAnimationId(event.target.value)
                const next = behavior.animations.find(
                  ({ id }) => id === event.target.value,
                )
                setSelectedStepId(next?.steps[0]?.id ?? '')
              }}
              className={inputClass}
            >
              {behavior.animations.map((animation) => (
                <option key={animation.id} value={animation.id}>
                  {animation.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              aria-label="Animation name"
              value={selectedAnimation.name}
              onChange={(event) =>
                updateAnimation((current) => ({
                  ...current,
                  name: event.target.value.slice(0, 60),
                }))
              }
              className={inputClass}
            />
            <select
              aria-label="Playback mode"
              value={selectedAnimation.playbackMode}
              onChange={(event) =>
                updateAnimation((current) => ({
                  ...current,
                  playbackMode: event.target
                    .value as MoteAnimation['playbackMode'],
                }))
              }
              className={inputClass}
            >
              {PLAYBACK_MODES.map((value) => (
                <option key={value} value={value}>
                  {value === 'pingPong' ? 'Ping-pong' : value}
                </option>
              ))}
            </select>
          </div>

          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Playback controls"
          >
            {playback.status === 'playing' &&
            playback.animationId === selectedAnimation.id ? (
              <button
                type="button"
                className={smallButton}
                onClick={playback.pause}
              >
                Pause
              </button>
            ) : playback.status === 'paused' &&
              playback.animationId === selectedAnimation.id ? (
              <button
                type="button"
                className={smallButton}
                onClick={playback.resume}
              >
                Resume
              </button>
            ) : (
              <button
                type="button"
                className={`${smallButton} border-[#f56a16]/50 bg-[#f56a16]/12 text-[#ffab76]`}
                onClick={() => playback.play(selectedAnimation)}
              >
                Play
              </button>
            )}
            <button
              type="button"
              className={smallButton}
              onClick={playback.stop}
            >
              Stop
            </button>
            <button
              type="button"
              className={smallButton}
              onClick={playback.replay}
            >
              Replay
            </button>
            <button
              type="button"
              className={smallButton}
              onClick={() => {
                const ids = behavior.animations.map(({ id }) => id)
                const id = nextLocalId('animation-custom', ids)
                const copy = {
                  ...clone(selectedAnimation),
                  id,
                  name: `${selectedAnimation.name} copy`,
                  steps: selectedAnimation.steps.map((item, index) => ({
                    ...item,
                    id: `${id}-step-${index + 1}`,
                  })),
                }
                updateBehavior((current) => ({
                  ...current,
                  animations: [...current.animations, copy],
                }))
                setSelectedAnimationId(id)
              }}
            >
              Duplicate
            </button>
          </div>

          <fieldset>
            <legend className="mb-2 text-[0.68rem] font-semibold tracking-[0.12em] text-[#8f9188] uppercase">
              Timeline
            </legend>
            <div className="space-y-2">
              {selectedAnimation.steps.map((item, index) => {
                const expression = behavior.expressions.find(
                  ({ id }) => id === item.expressionId,
                )
                const active =
                  playback.animationId === selectedAnimation.id &&
                  playback.stepIndex === index &&
                  playback.status !== 'stopped'
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selectedStepId === item.id}
                    onClick={() => {
                      setSelectedStepId(item.id)
                      if (expression) onApplyExpression(expression)
                    }}
                    className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none ${selectedStepId === item.id ? 'border-[#f56a16]/60 bg-[#f56a16]/10' : 'border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.05]'}`}
                  >
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-md text-[0.65rem] font-semibold tabular-nums ${active ? 'bg-[#f56a16] text-[#161713]' : 'bg-white/[0.06] text-[#aeb0a7]'}`}
                    >
                      {index + 1}
                    </span>
                    <span>
                      <span className="block text-xs font-medium text-[#e5e3dc]">
                        {expression?.name ?? 'Missing expression'}
                      </span>
                      <span className="mt-0.5 block text-[0.64rem] text-[#85887f]">
                        {item.holdMs} ms hold · {item.transitionMs} ms{' '}
                        {item.transition}
                      </span>
                    </span>
                    <span className="text-[0.62rem] text-[#70736b]">
                      {active ? 'playing' : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          {selectedStep ? (
            <div className="rounded-xl border border-white/[0.07] bg-[#1d1e1a] p-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="col-span-2">
                  <span className="mb-1 block text-[0.65rem] text-[#8f9188]">
                    Expression
                  </span>
                  <select
                    aria-label="Step expression"
                    value={selectedStep.expressionId}
                    onChange={(event) =>
                      updateAnimation((current) => ({
                        ...current,
                        steps: current.steps.map((item) =>
                          item.id === selectedStep.id
                            ? { ...item, expressionId: event.target.value }
                            : item,
                        ),
                      }))
                    }
                    className={inputClass}
                  >
                    {behavior.expressions.map((expression) => (
                      <option key={expression.id} value={expression.id}>
                        {expression.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-[0.65rem] text-[#8f9188]">
                    Hold ms
                  </span>
                  <input
                    aria-label="Step hold milliseconds"
                    type="number"
                    min="80"
                    max="8000"
                    step="20"
                    value={selectedStep.holdMs}
                    onChange={(event) =>
                      updateAnimation((current) => ({
                        ...current,
                        steps: current.steps.map((item) =>
                          item.id === selectedStep.id
                            ? { ...item, holdMs: Number(event.target.value) }
                            : item,
                        ),
                      }))
                    }
                    className={inputClass}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-[0.65rem] text-[#8f9188]">
                    Transition ms
                  </span>
                  <input
                    aria-label="Step transition milliseconds"
                    type="number"
                    min="0"
                    max="4000"
                    step="20"
                    value={selectedStep.transitionMs}
                    onChange={(event) =>
                      updateAnimation((current) => ({
                        ...current,
                        steps: current.steps.map((item) =>
                          item.id === selectedStep.id
                            ? {
                                ...item,
                                transitionMs: Number(event.target.value),
                              }
                            : item,
                        ),
                      }))
                    }
                    className={inputClass}
                  />
                </label>
                <label className="col-span-2">
                  <span className="mb-1 block text-[0.65rem] text-[#8f9188]">
                    Transition
                  </span>
                  <select
                    aria-label="Step transition"
                    value={selectedStep.transition}
                    onChange={(event) =>
                      updateAnimation((current) => ({
                        ...current,
                        steps: current.steps.map((item) =>
                          item.id === selectedStep.id
                            ? {
                                ...item,
                                transition: event.target
                                  .value as MoteAnimationStep['transition'],
                              }
                            : item,
                        ),
                      }))
                    }
                    className={inputClass}
                  >
                    {TRANSITION_STYLES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className={smallButton}
                  disabled={selectedAnimation.steps[0]?.id === selectedStep.id}
                  onClick={() =>
                    updateAnimation((current) => {
                      const index = current.steps.findIndex(
                        ({ id }) => id === selectedStep.id,
                      )
                      const steps = [...current.steps]
                      ;[steps[index - 1], steps[index]] = [
                        steps[index]!,
                        steps[index - 1]!,
                      ]
                      return { ...current, steps }
                    })
                  }
                >
                  Move up
                </button>
                <button
                  type="button"
                  className={smallButton}
                  disabled={
                    selectedAnimation.steps.at(-1)?.id === selectedStep.id
                  }
                  onClick={() =>
                    updateAnimation((current) => {
                      const index = current.steps.findIndex(
                        ({ id }) => id === selectedStep.id,
                      )
                      const steps = [...current.steps]
                      ;[steps[index], steps[index + 1]] = [
                        steps[index + 1]!,
                        steps[index]!,
                      ]
                      return { ...current, steps }
                    })
                  }
                >
                  Move down
                </button>
                <button
                  type="button"
                  className={smallButton}
                  disabled={selectedAnimation.steps.length <= 1}
                  onClick={() =>
                    updateAnimation((current) => ({
                      ...current,
                      steps: current.steps.filter(
                        ({ id }) => id !== selectedStep.id,
                      ),
                    }))
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            className={`${smallButton} w-full`}
            onClick={() => {
              const expressionId = behavior.expressions[0]?.id
              if (!expressionId) return
              const id = nextLocalId(
                `${selectedAnimation.id}-step`,
                selectedAnimation.steps.map(({ id }) => id),
              )
              updateAnimation((current) => ({
                ...current,
                steps: [
                  ...current.steps,
                  {
                    id,
                    expressionId,
                    holdMs: 500,
                    transitionMs: 320,
                    transition: 'spring',
                  },
                ],
              }))
              setSelectedStepId(id)
            }}
          >
            Add step
          </button>
        </div>
      ) : null}

      {mode === 'expressions' && draftExpression ? (
        <div className="space-y-4">
          <label>
            <span className="mb-1.5 block text-[0.68rem] font-semibold tracking-[0.12em] text-[#8f9188] uppercase">
              Expression
            </span>
            <select
              aria-label="Expression"
              value={selectedExpression?.id}
              onChange={(event) => setSelectedExpressionId(event.target.value)}
              className={inputClass}
            >
              {behavior.expressions.map((expression) => (
                <option key={expression.id} value={expression.id}>
                  {expression.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="mb-1 block text-[0.65rem] text-[#8f9188]">
                Name
              </span>
              <input
                aria-label="Expression name"
                value={draftExpression.name}
                onChange={(event) =>
                  setDraftExpression((current) =>
                    current
                      ? { ...current, name: event.target.value }
                      : current,
                  )
                }
                className={inputClass}
              />
            </label>
            <label>
              <span className="mb-1 block text-[0.65rem] text-[#8f9188]">
                Eye contour
              </span>
              <select
                aria-label="Expression eye contour"
                value={draftExpression.eyeStyle}
                onChange={(event) =>
                  setDraftExpression((current) =>
                    current
                      ? {
                          ...current,
                          eyeStyle: event.target
                            .value as MoteExpression['eyeStyle'],
                        }
                      : current,
                  )
                }
                className={inputClass}
              >
                {EYES.map((eye) => (
                  <option key={eye.id} value={eye.id}>
                    {eye.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['turn', 'Turn', -100, 100, 1],
                ['eyeSpacing', 'Spacing', 0.55, 1.55, 0.01],
                ['eyeScale', 'Eye size', 0.45, 1.65, 0.01],
              ] as const
            ).map(([key, label, min, max, step]) => (
              <label key={key}>
                <span className="mb-1 block text-[0.65rem] text-[#8f9188]">
                  {label}
                </span>
                <input
                  aria-label={`Expression ${label}`}
                  type="number"
                  min={min}
                  max={max}
                  step={step}
                  value={draftExpression.face[key]}
                  onChange={(event) =>
                    setDraftExpression((current) =>
                      current
                        ? normalizeExpression(
                            {
                              ...current,
                              face: {
                                ...current.face,
                                [key]: Number(event.target.value),
                              },
                            },
                            current,
                          )
                        : current,
                    )
                  }
                  className={inputClass}
                />
              </label>
            ))}
          </div>

          <label className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-xs text-[#c4c6bd]">
            Link left and right eye edits
            <input
              type="checkbox"
              checked={draftExpression.eyes.linked}
              onChange={(event) =>
                setDraftExpression((current) =>
                  current
                    ? {
                        ...current,
                        eyes: {
                          ...current.eyes,
                          linked: event.target.checked,
                          ...(event.target.checked
                            ? { right: clone(current.eyes.left) }
                            : {}),
                        },
                      }
                    : current,
                )
              }
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <EyeTransformFields
              side="left"
              value={draftExpression.eyes.left}
              onChange={(key, value) => updateEye('left', key, value)}
            />
            <EyeTransformFields
              side="right"
              value={draftExpression.eyes.right}
              onChange={(key, value) => updateEye('right', key, value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`${smallButton} border-[#f56a16]/50 bg-[#f56a16]/12 text-[#ffab76]`}
              onClick={() => {
                updateBehavior((current) => ({
                  ...current,
                  expressions: current.expressions.map((expression) =>
                    expression.id === draftExpression.id
                      ? normalizeExpression(draftExpression, expression)
                      : expression,
                  ),
                }))
                onApplyExpression(draftExpression)
              }}
            >
              Save
            </button>
            <button
              type="button"
              className={smallButton}
              onClick={() => onApplyExpression(draftExpression)}
            >
              Preview
            </button>
            <button
              type="button"
              className={smallButton}
              onClick={() =>
                selectedExpression &&
                setDraftExpression(clone(selectedExpression))
              }
            >
              Cancel
            </button>
            <button
              type="button"
              className={smallButton}
              onClick={() => {
                const id = nextLocalId(
                  'expression-custom',
                  behavior.expressions.map(({ id }) => id),
                )
                const copy = normalizeExpression(
                  {
                    ...clone(draftExpression),
                    id,
                    name: `${draftExpression.name} copy`,
                  },
                  draftExpression,
                )
                updateBehavior((current) => ({
                  ...current,
                  expressions: [...current.expressions, copy],
                }))
                setSelectedExpressionId(id)
              }}
            >
              Duplicate
            </button>
            <button
              type="button"
              className={smallButton}
              disabled={
                behavior.expressions.length <= 1 ||
                referencedExpressionIds.has(draftExpression.id)
              }
              title={
                referencedExpressionIds.has(draftExpression.id)
                  ? 'Remove this expression from animation steps first'
                  : undefined
              }
              onClick={() =>
                updateBehavior((current) => ({
                  ...current,
                  expressions: current.expressions.filter(
                    ({ id }) => id !== draftExpression.id,
                  ),
                }))
              }
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}

      {mode === 'geometry' ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-[#f2f0e8]">
              Procedural surface
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#92958c]">
              Keep the soft silhouette, then add optional projected volume. This
              is the advanced layer, not a separate 3D modeller.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SURFACES.map((surface) => (
              <button
                key={surface.id}
                type="button"
                aria-pressed={avatar.config.surface.id === surface.id}
                onClick={() =>
                  onSurfaceChange({ ...avatar.config.surface, id: surface.id })
                }
                className={`rounded-xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none ${avatar.config.surface.id === surface.id ? 'border-[#f56a16]/60 bg-[#f56a16]/10' : 'border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.05]'}`}
              >
                <span className="block text-xs font-medium text-[#e7e5de]">
                  {surface.label}
                </span>
                <span className="mt-1 block text-[0.65rem] leading-relaxed text-[#81847b]">
                  {surface.description}
                </span>
              </button>
            ))}
          </div>
          {(
            [
              ['depth', 'Depth', 0, 1, 0.01],
              ['rotateX', 'Pitch', -70, 70, 1],
              ['rotateY', 'Yaw', -70, 70, 1],
              ['rotateZ', 'Roll', -180, 180, 1],
            ] as const
          ).map(([key, label, min, max, step]) => (
            <label key={key} className="block">
              <span className="mb-1.5 flex justify-between text-[0.68rem] text-[#a3a59d]">
                <span>{label}</span>
                <output className="text-[#777a71] tabular-nums">
                  {avatar.config.surface[key]}
                </output>
              </span>
              <input
                aria-label={`Surface ${label}`}
                type="range"
                min={min}
                max={max}
                step={step}
                value={avatar.config.surface[key]}
                onChange={(event) =>
                  onSurfaceChange({
                    ...avatar.config.surface,
                    [key]: Number(event.target.value),
                  })
                }
                className="rig-range w-full"
              />
            </label>
          ))}
        </div>
      ) : null}

      {mode === 'library' ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-[#f2f0e8]">Avatar library</p>
            <p className="mt-1 text-xs leading-relaxed text-[#92958c]">
              New avatars share the default behavior library. The first edit
              creates a private copy, so one character can diverge without
              changing the others.
            </p>
          </div>
          <div className="space-y-2">
            {document.avatars.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                aria-pressed={candidate.id === document.activeAvatarId}
                onClick={() => onSelectAvatar(candidate.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none ${candidate.id === document.activeAvatarId ? 'border-[#f56a16]/60 bg-[#f56a16]/10' : 'border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.05]'}`}
              >
                <span>
                  <span className="block text-xs font-medium text-[#e7e5de]">
                    {candidate.name}
                  </span>
                  <span className="mt-0.5 block text-[0.64rem] text-[#81847b]">
                    {candidate.config.shapeId} ·{' '}
                    {candidate.behavior ? 'custom behavior' : 'shared behavior'}
                  </span>
                </span>
                <span className="text-[0.62rem] text-[#777a71]">
                  {candidate.id}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={smallButton}
              onClick={() => {
                const next = createAvatar(document)
                onDocumentChange(next)
              }}
            >
              New avatar
            </button>
            <button
              type="button"
              className={smallButton}
              onClick={() => {
                const next = duplicateAvatar(document)
                onDocumentChange(next)
              }}
            >
              Duplicate
            </button>
            <button
              type="button"
              className={smallButton}
              disabled={document.avatars.length <= 1}
              onClick={() => {
                const avatars = document.avatars.filter(
                  ({ id }) => id !== document.activeAvatarId,
                )
                const next = {
                  ...document,
                  avatars,
                  activeAvatarId: avatars[0]!.id,
                }
                onDocumentChange(next)
              }}
            >
              Delete
            </button>
          </div>
          <div className="h-px bg-white/[0.07]" />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={smallButton}
              onClick={() => downloadProject(document)}
            >
              Export project JSON
            </button>
            <label className={smallButton}>
              Import project JSON
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  try {
                    const next = parseStudioDocument(await file.text())
                    setProjectError('')
                    onDocumentChange(next)
                  } catch (error) {
                    setProjectError(
                      error instanceof Error
                        ? error.message
                        : 'The project could not be imported',
                    )
                  }
                  event.target.value = ''
                }}
              />
            </label>
          </div>
          {projectError ? (
            <p
              role="alert"
              className="rounded-lg bg-[#dc2944]/12 px-3 py-2 text-xs text-[#ff8294]"
            >
              {projectError}
            </p>
          ) : null}
          <p className="text-[0.65rem] leading-relaxed text-[#777a71]">
            {behavior === document.sharedBehavior
              ? 'This avatar is using shared behavior.'
              : 'This avatar has a private copy-on-write behavior library.'}
          </p>
        </div>
      ) : null}
    </div>
  )
}
