import {
  ArrowDown,
  ArrowsClockwise,
  DownloadSimple,
  Eye,
  GithubLogo,
  MagicWand,
  Pause,
  Play,
} from '@phosphor-icons/react'
import { MotionConfig, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { EyePicker } from './components/EyePicker'
import { MoteAvatar } from './components/MoteAvatar'
import { PalettePicker } from './components/PalettePicker'
import { ShapePicker } from './components/ShapePicker'
import { UploadPanel, type UploadedImage } from './components/UploadPanel'
import {
  COLORS,
  DEFAULT_CONFIG,
  EYES,
  MOTION_LEVELS,
  SHAPES,
  createAvatarSvg,
  eyeById,
  getEyeColor,
  shapeById,
  type MoteConfig,
  type EyeId,
  type MotionLevel,
  type ShapeId,
} from '@mote-studio/core'
import { downloadPng, downloadSvg } from './lib/exportAvatar'

type StudioTab = 'bot' | 'generate' | 'upload'
type ExportState = 'idle' | 'png' | 'error'

const TAB_ORDER: StudioTab[] = ['bot', 'generate', 'upload']

const readSavedConfig = (): MoteConfig => {
  try {
    const saved = window.localStorage.getItem('mote-studio:config')
    if (!saved) return DEFAULT_CONFIG
    const parsed = JSON.parse(saved) as Partial<MoteConfig>
    const isKnownShape = SHAPES.some((shape) => shape.id === parsed.shapeId)
    const isKnownEye =
      parsed.eyeStyle === undefined ||
      EYES.some((eyes) => eyes.id === parsed.eyeStyle)
    const isKnownColor = COLORS.some((color) => color.value === parsed.color)
    const isKnownMotion = MOTION_LEVELS.some(
      (motionLevel) => motionLevel.id === parsed.motion,
    )

    if (!isKnownShape || !isKnownEye || !isKnownColor || !isKnownMotion) {
      return DEFAULT_CONFIG
    }

    return {
      shapeId: parsed.shapeId as ShapeId,
      eyeStyle: (parsed.eyeStyle ?? DEFAULT_CONFIG.eyeStyle) as EyeId,
      color: parsed.color as string,
      motion: parsed.motion as MotionLevel,
      autoMorph: parsed.autoMorph ?? DEFAULT_CONFIG.autoMorph,
      autoEyes: parsed.autoEyes ?? DEFAULT_CONFIG.autoEyes,
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

const randomDifferent = <T,>(items: T[], current: T): T => {
  const choices = items.filter((item) => item !== current)
  return choices[Math.floor(Math.random() * choices.length)] ?? current
}

function App() {
  const [config, setConfig] = useState<MoteConfig>(readSavedConfig)
  const [activeTab, setActiveTab] = useState<StudioTab>('bot')
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null)
  const [gaze, setGaze] = useState({ x: 0, y: 0 })
  const [blinkToken, setBlinkToken] = useState(0)
  const [turnToken, setTurnToken] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [exportState, setExportState] = useState<ExportState>('idle')
  const [announcement, setAnnouncement] = useState('Mote ready')
  const generateTimer = useRef<number | undefined>(undefined)
  const shouldReduceMotion = useReducedMotion() === true
  const isMorphing = config.autoMorph && !shouldReduceMotion
  const eyeColor = getEyeColor(config.color)

  useEffect(() => {
    window.localStorage.setItem('mote-studio:config', JSON.stringify(config))
  }, [config])

  useEffect(
    () => () => {
      if (generateTimer.current) window.clearTimeout(generateTimer.current)
    },
    [],
  )

  useEffect(() => {
    if (!config.autoMorph || shouldReduceMotion) return

    const interval = window.setInterval(() => {
      setConfig((current) => ({
        ...current,
        shapeId: randomDifferent(
          SHAPES.map((shape) => shape.id),
          current.shapeId,
        ),
      }))
      setAnnouncement('The mote changed shape')
    }, 7800)

    return () => window.clearInterval(interval)
  }, [config.autoMorph, shouldReduceMotion])

  useEffect(() => {
    if (!config.autoEyes || shouldReduceMotion) return

    const cadence = { calm: 9000, playful: 6200, kinetic: 4200 }[config.motion]
    const interval = window.setInterval(() => {
      setConfig((current) => ({
        ...current,
        eyeStyle: randomDifferent(
          EYES.map((eyes) => eyes.id),
          current.eyeStyle,
        ),
      }))
    }, cadence)

    return () => window.clearInterval(interval)
  }, [config.autoEyes, config.motion, shouldReduceMotion])

  const svgSource = useMemo(
    () =>
      createAvatarSvg({
        shapeId: config.shapeId,
        eyeStyle: config.eyeStyle,
        color: config.color,
        eyeColor,
        imageDataUrl: uploadedImage?.dataUrl,
      }),
    [
      config.color,
      config.eyeStyle,
      config.shapeId,
      eyeColor,
      uploadedImage?.dataUrl,
    ],
  )

  const selectShape = (shapeId: ShapeId) => {
    setConfig((current) => ({ ...current, shapeId }))
    setAnnouncement(`${shapeById(shapeId).label} shape selected`)
  }

  const selectColor = (color: string) => {
    const colorName =
      COLORS.find((entry) => entry.value === color)?.name ?? 'Custom'
    setConfig((current) => ({ ...current, color }))
    setAnnouncement(`${colorName} color selected`)
  }

  const selectEyes = (eyeStyle: EyeId) => {
    const eyes = EYES.find((entry) => entry.id === eyeStyle)
    setConfig((current) => ({ ...current, eyeStyle }))
    setAnnouncement(`${eyes?.label ?? 'Eye'} expression selected`)
  }

  const generateMote = () => {
    if (isGenerating) return
    setIsGenerating(true)
    setAnnouncement('Generating a new mote')
    if (generateTimer.current) window.clearTimeout(generateTimer.current)

    generateTimer.current = window.setTimeout(
      () => {
        setConfig((current) => ({
          ...current,
          shapeId: randomDifferent(
            SHAPES.map((shape) => shape.id),
            current.shapeId,
          ),
          eyeStyle: randomDifferent(
            EYES.map((eyes) => eyes.id),
            current.eyeStyle,
          ),
          color: randomDifferent(
            COLORS.map((color) => color.value),
            current.color,
          ),
          motion: randomDifferent(
            MOTION_LEVELS.map((motionLevel) => motionLevel.id),
            current.motion,
          ),
        }))
        setUploadedImage(null)
        setIsGenerating(false)
        setAnnouncement('A new mote was generated')
      },
      shouldReduceMotion ? 120 : 520,
    )
  }

  const resetAll = () => {
    setConfig(DEFAULT_CONFIG)
    setUploadedImage(null)
    setGaze({ x: 0, y: 0 })
    setExportState('idle')
    setAnnouncement('Studio reset to defaults')
  }

  const handleStagePointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2
    setGaze({
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
    })
  }

  const changeTab = (tab: StudioTab) => {
    setActiveTab(tab)
    requestAnimationFrame(() => document.getElementById(`tab-${tab}`)?.focus())
  }

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    tab: StudioTab,
  ) => {
    const currentIndex = TAB_ORDER.indexOf(tab)
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      changeTab(TAB_ORDER[(currentIndex + 1) % TAB_ORDER.length])
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      changeTab(
        TAB_ORDER[(currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length],
      )
    }
    if (event.key === 'Home') {
      event.preventDefault()
      changeTab(TAB_ORDER[0])
    }
    if (event.key === 'End') {
      event.preventDefault()
      changeTab(TAB_ORDER[TAB_ORDER.length - 1])
    }
  }

  const exportPng = async () => {
    setExportState('png')
    try {
      await downloadPng(svgSource)
      setExportState('idle')
      setAnnouncement('PNG downloaded')
    } catch {
      setExportState('error')
      setAnnouncement('PNG export failed')
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-[100dvh] bg-[#10110e] text-[#f3f1e9]">
        <a
          href="#studio"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-[#f56a16] focus:px-4 focus:py-2 focus:text-[#151612]"
        >
          Skip to studio
        </a>

        <header className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 pt-5 pb-4 sm:px-6 lg:px-8 lg:pt-7">
          <a
            href="/"
            className="group inline-flex items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none"
          >
            <span className="relative grid h-7 w-7 place-items-center rounded-[0.65rem] bg-[#f56a16] text-[#161713] transition-transform duration-200 group-hover:-rotate-6">
              <span className="absolute top-[8px] left-[7px] h-[9px] w-[4px] rotate-[8deg] rounded-full bg-[#161713]" />
              <span className="absolute top-[8px] right-[7px] h-[9px] w-[4px] rotate-[8deg] rounded-full bg-[#161713]" />
            </span>
            <span className="text-sm font-semibold tracking-[-0.02em]">
              Mote Studio
            </span>
          </a>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-[#7f8279] sm:inline">
              Local-first character lab
            </span>
            <a
              href="https://github.com/metaforismo/mote-studio"
              target="_blank"
              rel="noreferrer"
              aria-label="View Mote Studio on GitHub"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-[#babcb4] transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none active:scale-[0.96]"
            >
              <GithubLogo aria-hidden="true" size={18} weight="fill" />
            </a>
          </div>
        </header>

        <main
          id="studio"
          className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-4 px-4 pb-6 sm:px-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.72fr)] lg:gap-5 lg:px-8 lg:pb-8"
        >
          <section className="stage-grid relative min-h-[58dvh] overflow-hidden rounded-[1.75rem] border border-[#deddd5] bg-[#eeede7] text-[#171813] shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:min-h-[660px] lg:min-h-[calc(100dvh-116px)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-5 sm:p-7">
              <div>
                <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-[#66685f] uppercase">
                  Live specimen
                </p>
                <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.045em] sm:text-3xl">
                  Make a mote.
                </h1>
              </div>
              <span className="rounded-full border border-[#d0cfc7] bg-[#f7f6f0]/70 px-3 py-1.5 text-[0.68rem] font-semibold tracking-[0.14em] text-[#696b63] uppercase backdrop-blur-sm">
                {shapeById(config.shapeId).label} ·{' '}
                {eyeById(config.eyeStyle).label}
              </span>
            </div>

            <button
              type="button"
              aria-label="Blink the mote"
              onClick={() => {
                setBlinkToken((value) => value + 1)
                setAnnouncement('The mote blinked')
              }}
              onPointerMove={handleStagePointer}
              onPointerLeave={() => setGaze({ x: 0, y: 0 })}
              className="absolute inset-0 m-auto h-[min(64vw,460px)] max-h-[62%] w-[min(64vw,460px)] max-w-[62%] touch-none rounded-full focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:ring-offset-8 focus-visible:ring-offset-[#eeede7] focus-visible:outline-none lg:h-[min(38vw,520px)] lg:w-[min(38vw,520px)]"
            >
              <MoteAvatar
                shapeId={config.shapeId}
                eyeStyle={config.eyeStyle}
                color={config.color}
                eyeColor={eyeColor}
                motionLevel={config.motion}
                gaze={gaze}
                blinkToken={blinkToken}
                turnToken={turnToken}
                imageDataUrl={uploadedImage?.dataUrl}
              />
            </button>

            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setBlinkToken((value) => value + 1)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#cfcec6] bg-[#f7f6f0]/78 px-2.5 py-2 text-xs font-medium whitespace-nowrap text-[#4d4f48] backdrop-blur-sm transition-colors hover:bg-[#fffef8] focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none active:scale-[0.97] sm:px-3.5"
                >
                  <Eye aria-hidden="true" size={16} />
                  Blink
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTurnToken((value) => value + 1)
                    setAnnouncement('The mote turned its face')
                  }}
                  disabled={shouldReduceMotion}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#cfcec6] bg-[#f7f6f0]/78 px-2.5 py-2 text-xs font-medium whitespace-nowrap text-[#4d4f48] backdrop-blur-sm transition-colors hover:bg-[#fffef8] focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-65 sm:px-3.5"
                >
                  <ArrowsClockwise aria-hidden="true" size={15} />
                  Turn
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfig((current) => ({
                      ...current,
                      autoMorph: !current.autoMorph,
                    }))
                  }
                  disabled={shouldReduceMotion}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#cfcec6] bg-[#f7f6f0]/78 px-2.5 py-2 text-xs font-medium whitespace-nowrap text-[#4d4f48] backdrop-blur-sm transition-colors hover:bg-[#fffef8] focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-65 sm:px-3.5"
                  aria-pressed={isMorphing}
                >
                  {isMorphing ? (
                    <Pause aria-hidden="true" size={15} />
                  ) : (
                    <Play aria-hidden="true" size={15} />
                  )}
                  {shouldReduceMotion
                    ? 'Motion reduced'
                    : config.autoMorph
                      ? 'Pause morph'
                      : 'Play morph'}
                </button>
              </div>

              <div className="flex items-center gap-2 text-[0.68rem] font-medium text-[#66685f]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#19a976] motion-safe:animate-pulse" />
                Move your pointer · Click to blink
              </div>
            </div>
          </section>

          <aside className="flex min-h-[600px] flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#171815] shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_24px_70px_rgba(0,0,0,0.26)] lg:min-h-[calc(100dvh-116px)]">
            <div
              className="flex items-center border-b border-white/[0.07] px-3 pt-2.5"
              role="tablist"
              aria-label="Studio tools"
            >
              {TAB_ORDER.map((tab) => (
                <button
                  key={tab}
                  id={`tab-${tab}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  aria-controls={`panel-${tab}`}
                  tabIndex={activeTab === tab ? 0 : -1}
                  onClick={() => setActiveTab(tab)}
                  onKeyDown={(event) => handleTabKeyDown(event, tab)}
                  className="relative rounded-t-xl px-3 py-3 text-sm font-medium text-[#979991] capitalize transition-colors hover:text-[#dedfd8] focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none focus-visible:ring-inset sm:px-4"
                >
                  {tab}
                  {activeTab === tab ? (
                    <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#f56a16]" />
                  ) : null}
                </button>
              ))}
              <button
                type="button"
                onClick={resetAll}
                className="ml-auto rounded-xl px-3 py-3 text-sm font-medium text-[#979991] transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none focus-visible:ring-inset active:scale-[0.97] sm:px-4"
              >
                Reset
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <section
                key={activeTab}
                id={`panel-${activeTab}`}
                role="tabpanel"
                aria-labelledby={`tab-${activeTab}`}
                className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6"
              >
                {activeTab === 'bot' ? (
                  <div className="space-y-7">
                    <ShapePicker
                      selected={config.shapeId}
                      color={config.color}
                      eyeColor={eyeColor}
                      eyeStyle={config.eyeStyle}
                      onSelect={selectShape}
                    />
                    <div className="h-px bg-white/[0.07]" />
                    <EyePicker
                      selected={config.eyeStyle}
                      bodyColor={config.color}
                      eyeColor={eyeColor}
                      onSelect={selectEyes}
                    />
                    <div className="h-px bg-white/[0.07]" />
                    <PalettePicker
                      selected={config.color}
                      onSelect={selectColor}
                    />
                  </div>
                ) : null}

                {activeTab === 'generate' ? (
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm font-medium text-[#f2f0e8]">
                        Motion character
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[#92958c]">
                        Pick an energy level, or let the studio compose a new
                        combination.
                      </p>
                    </div>

                    {isGenerating ? (
                      <div
                        aria-label="Generating mote"
                        className="space-y-3 rounded-[1.2rem] border border-white/[0.07] bg-[#1d1e1a] p-4"
                      >
                        <div className="skeleton h-4 w-28 rounded-full" />
                        <div className="grid grid-cols-3 gap-2">
                          <div className="skeleton h-16 rounded-xl" />
                          <div className="skeleton h-16 rounded-xl" />
                          <div className="skeleton h-16 rounded-xl" />
                        </div>
                      </div>
                    ) : (
                      <fieldset>
                        <legend className="mb-3 text-[0.68rem] font-semibold tracking-[0.18em] text-[#8f9188] uppercase">
                          Energy
                        </legend>
                        <div className="grid grid-cols-3 gap-2">
                          {MOTION_LEVELS.map((motionLevel) => {
                            const isSelected = config.motion === motionLevel.id
                            return (
                              <button
                                key={motionLevel.id}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() => {
                                  setConfig((current) => ({
                                    ...current,
                                    motion: motionLevel.id,
                                  }))
                                  setAnnouncement(
                                    `${motionLevel.label} motion selected`,
                                  )
                                }}
                                className="rounded-xl border px-2 py-3 text-center transition-colors focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none active:scale-[0.97]"
                                style={{
                                  borderColor: isSelected
                                    ? '#f56a16'
                                    : 'rgba(255,255,255,0.075)',
                                  backgroundColor: isSelected
                                    ? 'rgba(245,106,22,0.09)'
                                    : '#1c1d19',
                                  color: isSelected ? '#f2f0e8' : '#92958c',
                                }}
                              >
                                <span className="block text-xs font-semibold">
                                  {motionLevel.label}
                                </span>
                                <span className="mt-1 hidden text-[0.64rem] leading-tight text-[#7f8279] sm:block">
                                  {motionLevel.description}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </fieldset>
                    )}

                    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[1.1rem] border border-white/[0.07] bg-[#1c1d19] p-4">
                      <span>
                        <span className="block text-sm font-medium text-[#e2e2dc]">
                          Automatic morph
                        </span>
                        <span className="mt-0.5 block text-xs text-[#85887f]">
                          {shouldReduceMotion
                            ? 'Disabled by your system motion preference'
                            : 'Change silhouette every few seconds'}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={config.autoMorph}
                        disabled={shouldReduceMotion}
                        onChange={(event) =>
                          setConfig((current) => ({
                            ...current,
                            autoMorph: event.target.checked,
                          }))
                        }
                        className="peer sr-only"
                      />
                      <span className="relative h-6 w-10 shrink-0 rounded-full bg-[#383a34] transition-colors peer-checked:bg-[#f56a16] peer-focus-visible:ring-2 peer-focus-visible:ring-[#f56a16] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#171815] peer-disabled:opacity-45 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-[#f4f2eb] after:transition-transform peer-checked:after:translate-x-4" />
                    </label>

                    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[1.1rem] border border-white/[0.07] bg-[#1c1d19] p-4">
                      <span>
                        <span className="block text-sm font-medium text-[#e2e2dc]">
                          Living eyes
                        </span>
                        <span className="mt-0.5 block text-xs text-[#85887f]">
                          {shouldReduceMotion
                            ? 'Disabled by your system motion preference'
                            : 'Cycle expressions at a calm, readable cadence'}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={config.autoEyes}
                        disabled={shouldReduceMotion}
                        onChange={(event) =>
                          setConfig((current) => ({
                            ...current,
                            autoEyes: event.target.checked,
                          }))
                        }
                        className="peer sr-only"
                      />
                      <span className="relative h-6 w-10 shrink-0 rounded-full bg-[#383a34] transition-colors peer-checked:bg-[#f56a16] peer-focus-visible:ring-2 peer-focus-visible:ring-[#f56a16] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#171815] peer-disabled:opacity-45 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-[#f4f2eb] after:transition-transform peer-checked:after:translate-x-4" />
                    </label>

                    <button
                      type="button"
                      onClick={generateMote}
                      disabled={isGenerating}
                      className="group flex w-full items-center justify-between rounded-[1.05rem] bg-[#f56a16] px-4 py-3.5 font-semibold text-[#171813] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#ff914f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171815] focus-visible:outline-none active:translate-y-0 active:scale-[0.985] disabled:cursor-wait disabled:opacity-70"
                    >
                      <span>
                        {isGenerating ? 'Composing…' : 'Generate a new mote'}
                      </span>
                      <MagicWand
                        aria-hidden="true"
                        size={19}
                        weight="bold"
                        className="transition-transform duration-200 group-hover:rotate-6"
                      />
                    </button>
                  </div>
                ) : null}

                {activeTab === 'upload' ? (
                  <UploadPanel
                    image={uploadedImage}
                    onChange={(image) => {
                      setUploadedImage(image)
                      if (image) {
                        setAnnouncement(`${image.name} applied as a texture`)
                      } else {
                        setAnnouncement('Texture removed')
                      }
                    }}
                  />
                ) : null}
              </section>

              <div className="border-t border-white/[0.07] p-4 sm:p-5">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      downloadSvg(svgSource)
                      setAnnouncement('SVG downloaded')
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm font-medium text-[#d3d4cd] transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none active:scale-[0.98]"
                  >
                    <DownloadSimple aria-hidden="true" size={17} />
                    SVG
                  </button>
                  <button
                    type="button"
                    onClick={exportPng}
                    disabled={exportState === 'png'}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm font-medium text-[#d3d4cd] transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
                  >
                    {exportState === 'png' ? (
                      <ArrowsClockwise
                        aria-hidden="true"
                        size={17}
                        className="motion-safe:animate-spin"
                      />
                    ) : (
                      <DownloadSimple aria-hidden="true" size={17} />
                    )}
                    PNG
                  </button>
                </div>
                {exportState === 'error' ? (
                  <p
                    role="alert"
                    className="mt-2 text-center text-xs text-[#f5a49d]"
                  >
                    PNG export is unavailable. SVG still works.
                  </p>
                ) : null}
              </div>
            </div>
          </aside>
        </main>

        <footer className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 pt-1 pb-8 text-xs text-[#85887f] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>Twelve shapes · Twenty-five eye expressions · Eleven colors</p>
          <a
            href="#studio"
            className="inline-flex min-h-6 items-center gap-1.5 self-start rounded-lg transition-colors hover:text-[#c7c9c1] focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none sm:self-auto"
          >
            Back to studio{' '}
            <ArrowDown aria-hidden="true" size={14} className="rotate-180" />
          </a>
        </footer>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>
      </div>
    </MotionConfig>
  )
}

export default App
