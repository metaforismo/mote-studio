import { useCallback, useEffect, useRef, useState } from 'react'
import type { MoteAnimation, MoteAnimationStep } from '@mote-studio/core'

export type PlaybackStatus = 'stopped' | 'playing' | 'paused'

type Runtime = {
  animation: MoteAnimation | null
  index: number
  direction: 1 | -1
  deadline: number
  remainingMs: number
  timer: number | null
}

const initialRuntime = (): Runtime => ({
  animation: null,
  index: 0,
  direction: 1,
  deadline: 0,
  remainingMs: 0,
  timer: null,
})

export const useAnimationPlayer = (
  onStep: (step: MoteAnimationStep) => void,
) => {
  const [status, setStatus] = useState<PlaybackStatus>('stopped')
  const [animationId, setAnimationId] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const runtime = useRef<Runtime>(initialRuntime())
  const onStepRef = useRef(onStep)
  onStepRef.current = onStep

  const clearTimer = useCallback(() => {
    if (runtime.current.timer !== null) {
      window.clearTimeout(runtime.current.timer)
      runtime.current.timer = null
    }
  }, [])

  const stop = useCallback(() => {
    clearTimer()
    runtime.current = initialRuntime()
    setStatus('stopped')
    setAnimationId(null)
    setStepIndex(0)
  }, [clearTimer])

  const advanceRef = useRef<() => void>(() => undefined)

  const schedule = useCallback(
    (durationMs: number) => {
      clearTimer()
      runtime.current.remainingMs = durationMs
      runtime.current.deadline = performance.now() + durationMs
      runtime.current.timer = window.setTimeout(
        () => advanceRef.current(),
        durationMs,
      )
    },
    [clearTimer],
  )

  advanceRef.current = () => {
    const current = runtime.current
    const animation = current.animation
    if (!animation || animation.steps.length === 0) {
      stop()
      return
    }

    let next = current.index + current.direction
    let direction = current.direction

    if (animation.playbackMode === 'once' && next >= animation.steps.length) {
      clearTimer()
      setStatus('stopped')
      runtime.current.timer = null
      return
    }

    if (animation.playbackMode === 'loop') {
      next = (next + animation.steps.length) % animation.steps.length
    }

    if (animation.playbackMode === 'pingPong') {
      if (next >= animation.steps.length) {
        direction = -1
        next = Math.max(0, animation.steps.length - 2)
      } else if (next < 0) {
        direction = 1
        next = Math.min(animation.steps.length - 1, 1)
      }
    }

    const nextStep = animation.steps[next]
    if (!nextStep) {
      stop()
      return
    }
    current.index = next
    current.direction = direction
    setStepIndex(next)
    onStepRef.current(nextStep)
    schedule(nextStep.holdMs + nextStep.transitionMs)
  }

  const play = useCallback(
    (animation: MoteAnimation) => {
      clearTimer()
      const first = animation.steps[0]
      if (!first) return
      runtime.current = {
        animation,
        index: 0,
        direction: 1,
        deadline: 0,
        remainingMs: first.holdMs + first.transitionMs,
        timer: null,
      }
      setAnimationId(animation.id)
      setStepIndex(0)
      setStatus('playing')
      onStepRef.current(first)
      schedule(first.holdMs + first.transitionMs)
    },
    [clearTimer, schedule],
  )

  const pause = useCallback(() => {
    if (status !== 'playing') return
    runtime.current.remainingMs = Math.max(
      0,
      runtime.current.deadline - performance.now(),
    )
    clearTimer()
    setStatus('paused')
  }, [clearTimer, status])

  const resume = useCallback(() => {
    if (status !== 'paused' || !runtime.current.animation) return
    setStatus('playing')
    schedule(runtime.current.remainingMs)
  }, [schedule, status])

  const replay = useCallback(() => {
    if (runtime.current.animation) play(runtime.current.animation)
  }, [play])

  useEffect(() => stop, [stop])

  return {
    status,
    animationId,
    stepIndex,
    play,
    pause,
    resume,
    stop,
    replay,
  }
}
