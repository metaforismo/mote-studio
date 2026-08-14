// @vitest-environment node

import { describe, expect, it } from 'vitest'
import {
  EYES,
  EYE_IDS,
  AVATAR_STATES,
  DEFAULT_FACE_RIG,
  SHAPES,
  SHAPE_IDS,
  closedCurvePath,
  createAvatarSvg,
  createStudioDocument,
  detachAvatarBehavior,
  duplicateAvatar,
  generateMoteConfig,
  eyeById,
  performanceRigFrames,
  projectEye,
  parseStudioDocument,
  serializeStudioDocument,
} from './index.js'

describe('Mote core', () => {
  it('provides compatible morph targets for every public shape', () => {
    expect(SHAPES.map((shape) => shape.id)).toEqual(SHAPE_IDS)
    expect(SHAPES).toHaveLength(14)

    for (const shape of SHAPES) {
      expect(shape.path).toMatch(/^M /)
      expect(shape.path).toMatch(/ Z$/)
      expect(shape.path.match(/C /g)).toHaveLength(32)
      expect(shape.path).not.toContain('NaN')
    }
  })

  it('projects eye positions continuously on the procedural face sphere', () => {
    const eye = eyeById('neutral')
    const centered = projectEye(eye.leftCenter, DEFAULT_FACE_RIG)
    const turned = projectEye(eye.leftCenter, {
      ...DEFAULT_FACE_RIG,
      turn: 72,
      eyeSpacing: 1.2,
    })

    expect(AVATAR_STATES).toHaveLength(12)
    expect(AVATAR_STATES.every((state) => state.eyePair.length === 2)).toBe(
      true,
    )
    expect(
      AVATAR_STATES.every(
        (state) =>
          state.performance.durationMs >= 1400 &&
          state.performance.durationMs <= 2400 &&
          state.performance.times.length >= 4 &&
          state.performance.times.length <= 5 &&
          state.performance.eyeSequence.length ===
            state.performance.times.length &&
          Object.keys(state.performance.rigDeltas).length >= 2,
      ),
    ).toBe(true)
    for (const state of AVATAR_STATES) {
      const frames = performanceRigFrames(state)
      const start = frames[0]
      const end = frames.at(-1)
      expect(start).toEqual(state.rig)
      expect(end).toEqual(state.rig)
      expect(
        frames
          .slice(1, -1)
          .some((frame) => JSON.stringify(frame) !== JSON.stringify(state.rig)),
      ).toBe(true)
      for (const channel of Object.values(state.performance.rigDeltas)) {
        expect(channel).toHaveLength(state.performance.times.length)
        expect(channel?.[0]).toBe(0)
        expect(channel?.at(-1)).toBe(0)
      }
    }
    expect(centered.opacity).toBe(1)
    expect(turned.translateX).not.toBe(centered.translateX)
    expect(turned.scaleX).toBeLessThan(centered.scaleX)
    expect(turned.cssTransform).toContain('translate3d')
  })

  it('provides 25 compatible eye expressions from the technical reference', () => {
    expect(EYES.map((eye) => eye.id)).toEqual(EYE_IDS)
    expect(EYES).toHaveLength(25)

    for (const eye of EYES) {
      expect(eye.leftPath.match(/C /g)).toHaveLength(16)
      expect(eye.rightPath.match(/C /g)).toHaveLength(16)
      expect(eye.leftPath).not.toContain('NaN')
      expect(eye.rightPath).not.toContain('NaN')
    }
  })

  it('rejects point rings that cannot form a closed curve', () => {
    expect(() => closedCurvePath([{ x: 1, y: 1 }])).toThrow(
      'A closed curve requires at least three points',
    )
  })

  it('generates deterministic configurations from a seed', () => {
    const first = generateMoteConfig('porto-at-dawn')
    const second = generateMoteConfig('porto-at-dawn')
    expect(first).toEqual(second)
  })

  it('merges partial face overrides onto the selected state pose', () => {
    const config = generateMoteConfig('partial-rig', {
      state: 'thinking',
      face: { eyeSpacing: 1.3 },
    })

    expect(config.face.eyeSpacing).toBe(1.3)
    expect(config.face.turn).toBe(-14)
    expect(config.face.gazeY).toBe(-0.42)
  })

  it('renders a portable animated SVG with reduced-motion support', () => {
    const svg = createAvatarSvg({
      shapeId: 'teardrop',
      eyeStyle: 'joyful',
      color: '#f56a16',
      motion: 'kinetic',
      animated: true,
      title: 'Release companion',
    })

    expect(svg).toContain('<title')
    expect(svg).toContain('prefers-reduced-motion:no-preference')
    expect(svg).toContain('@keyframes mote-idle')
    expect(svg).toContain('-left-rig')
    expect(svg).toContain('-left-expression')
    expect(svg).toContain('d:path(')
    expect(svg.match(/%\{d:path\(/g)?.length).toBeGreaterThan(5)
    expect(svg).toContain('aria-labelledby=')
    expect(svg).toContain(eyeById('joyful').leftPath)
    expect(svg).toMatch(/-eyes" fill="#[0-9a-f]+" clip-path="url\(#.+-clip\)"/)
  })

  it('rejects unsafe texture URLs', () => {
    expect(() =>
      createAvatarSvg({
        shapeId: 'blob',
        color: '#f56a16',
        imageDataUrl: 'https://example.com/private.png',
      }),
    ).toThrow('Textures must be PNG, JPEG, or WebP base64 data URLs')
  })

  it('round-trips a versioned multi-avatar document with copy-on-write behavior', () => {
    const shared = createStudioDocument()
    const duplicated = duplicateAvatar(shared)
    expect(duplicated.avatars).toHaveLength(2)
    expect(duplicated.avatars.every(({ behavior }) => behavior === null)).toBe(
      true,
    )

    const detached = detachAvatarBehavior(duplicated)
    const active = detached.avatars.find(
      ({ id }) => id === detached.activeAvatarId,
    )
    expect(active?.behavior).not.toBe(detached.sharedBehavior)
    expect(active?.behavior).toEqual(detached.sharedBehavior)

    const parsed = parseStudioDocument(serializeStudioDocument(detached))
    expect(parsed).toEqual(detached)
  })

  it('rejects project animations with broken expression references', () => {
    const document = createStudioDocument()
    document.sharedBehavior.animations[0]!.steps[0]!.expressionId =
      'expression-missing'

    expect(() =>
      parseStudioDocument(serializeStudioDocument(document)),
    ).toThrow('references missing expression expression-missing')
  })

  it('renders independent eye transforms and projected surface geometry', () => {
    const svg = createAvatarSvg({
      shapeId: 'cloud',
      color: '#f56a16',
      surface: { id: 'sphere', depth: 0.7, rotateX: 12, rotateY: -18 },
      eyeTransform: {
        linked: false,
        left: {
          scaleX: 1.2,
          scaleY: 0.8,
          offsetX: -4,
          offsetY: 2,
          rotation: -8,
        },
        right: {
          scaleX: 0.8,
          scaleY: 1.15,
          offsetX: 5,
          offsetY: -2,
          rotation: 10,
        },
      },
    })

    expect(svg).toContain('data-surface="sphere"')
    expect(svg).toContain('scale(1.2 0.8)')
    expect(svg).toContain('scale(0.8 1.15)')
  })
})
