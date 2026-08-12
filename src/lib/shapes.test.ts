import { describe, expect, it } from 'vitest'
import { closedCurvePath, SHAPES, SHAPE_IDS } from './shapes'

describe('shape path library', () => {
  it('provides one valid morph target for every public shape id', () => {
    expect(SHAPES.map((shape) => shape.id)).toEqual(SHAPE_IDS)
    expect(SHAPES).toHaveLength(8)

    for (const shape of SHAPES) {
      expect(shape.path).toMatch(/^M /)
      expect(shape.path).toMatch(/ Z$/)
      expect(shape.path.match(/C /g)).toHaveLength(16)
      expect(shape.path).not.toContain('NaN')
    }
  })

  it('rejects point rings that cannot form a closed curve', () => {
    expect(() => closedCurvePath([{ x: 1, y: 1 }])).toThrow(
      'A closed curve requires at least three points',
    )
  })
})
