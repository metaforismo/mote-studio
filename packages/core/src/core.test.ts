// @vitest-environment node

import { describe, expect, it } from 'vitest'
import {
  EYES,
  EYE_IDS,
  SHAPES,
  SHAPE_IDS,
  closedCurvePath,
  createAvatarSvg,
  generateMoteConfig,
  eyeById,
} from './index.js'

describe('Mote core', () => {
  it('provides compatible morph targets for every public shape', () => {
    expect(SHAPES.map((shape) => shape.id)).toEqual(SHAPE_IDS)
    expect(SHAPES).toHaveLength(12)

    for (const shape of SHAPES) {
      expect(shape.path).toMatch(/^M /)
      expect(shape.path).toMatch(/ Z$/)
      expect(shape.path.match(/C /g)).toHaveLength(24)
      expect(shape.path).not.toContain('NaN')
    }
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
    expect(svg).toContain('aria-labelledby=')
    expect(svg).toContain(eyeById('joyful').leftPath)
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
})
