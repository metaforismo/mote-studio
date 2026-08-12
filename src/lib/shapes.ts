export const SHAPE_IDS = [
  'orb',
  'soft',
  'tile',
  'capsule',
  'peak',
  'gem',
  'ripple',
  'drop',
] as const

export type ShapeId = (typeof SHAPE_IDS)[number]

export type Point = {
  x: number
  y: number
}

export type ShapeDefinition = {
  id: ShapeId
  label: string
  description: string
  path: string
}

const CENTER = 160
const POINT_COUNT = 16

const sample = (factory: (angle: number, index: number) => Point): Point[] =>
  Array.from({ length: POINT_COUNT }, (_, index) => {
    const angle = -Math.PI / 2 + (index / POINT_COUNT) * Math.PI * 2
    return factory(angle, index)
  })

const superellipse = (
  radiusX: number,
  radiusY: number,
  power: number,
): Point[] =>
  sample((angle) => ({
    x:
      CENTER +
      radiusX *
        Math.sign(Math.cos(angle)) *
        Math.abs(Math.cos(angle)) ** (2 / power),
    y:
      CENTER +
      radiusY *
        Math.sign(Math.sin(angle)) *
        Math.abs(Math.sin(angle)) ** (2 / power),
  }))

const radial = (
  radiusX: number,
  radiusY: number,
  modulation: (angle: number, index: number) => number,
): Point[] =>
  sample((angle, index) => {
    const radius = modulation(angle, index)
    return {
      x: CENTER + Math.cos(angle) * radiusX * radius,
      y: CENTER + Math.sin(angle) * radiusY * radius,
    }
  })

const fromCoordinates = (
  coordinates: ReadonlyArray<readonly [number, number]>,
): Point[] => coordinates.map(([x, y]) => ({ x, y }))

const round = (value: number) => Number(value.toFixed(2))

/**
 * Converts a closed point ring to compatible cubic Bézier commands.
 * Every preset uses the same point count, so Motion can interpolate `d`
 * without replacing the SVG node or causing a layout jump.
 */
export const closedCurvePath = (points: Point[]): string => {
  if (points.length < 3) {
    throw new Error('A closed curve requires at least three points')
  }

  const commands = ['M ' + round(points[0].x) + ' ' + round(points[0].y)]

  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index - 1 + points.length) % points.length]
    const current = points[index]
    const next = points[(index + 1) % points.length]
    const afterNext = points[(index + 2) % points.length]

    const controlOne = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6,
    }
    const controlTwo = {
      x: next.x - (afterNext.x - current.x) / 6,
      y: next.y - (afterNext.y - current.y) / 6,
    }

    commands.push(
      'C ' +
        round(controlOne.x) +
        ' ' +
        round(controlOne.y) +
        ' ' +
        round(controlTwo.x) +
        ' ' +
        round(controlTwo.y) +
        ' ' +
        round(next.x) +
        ' ' +
        round(next.y),
    )
  }

  return commands.join(' ') + ' Z'
}

const pointSets: Record<ShapeId, Point[]> = {
  orb: radial(106, 106, () => 1),
  soft: radial(110, 102, (angle) => 1 + 0.045 * Math.sin(angle * 3 + 0.7)),
  tile: superellipse(101, 101, 5.4),
  capsule: superellipse(121, 70, 4.2),
  peak: fromCoordinates([
    [160, 49],
    [178, 72],
    [200, 106],
    [222, 143],
    [238, 181],
    [232, 207],
    [206, 216],
    [176, 218],
    [144, 218],
    [113, 218],
    [88, 209],
    [82, 184],
    [97, 146],
    [118, 108],
    [141, 73],
    [153, 54],
  ]),
  gem: fromCoordinates([
    [160, 48],
    [185, 62],
    [213, 80],
    [238, 97],
    [246, 129],
    [246, 166],
    [244, 201],
    [216, 220],
    [184, 238],
    [160, 249],
    [136, 238],
    [104, 220],
    [76, 201],
    [74, 165],
    [74, 129],
    [82, 97],
  ]),
  ripple: radial(102, 96, (angle) => 1 + 0.13 * Math.sin(angle * 5 - 0.55)),
  drop: fromCoordinates([
    [160, 44],
    [178, 68],
    [198, 97],
    [218, 128],
    [228, 160],
    [224, 191],
    [206, 216],
    [184, 231],
    [160, 236],
    [136, 231],
    [114, 216],
    [96, 191],
    [92, 160],
    [102, 128],
    [122, 97],
    [142, 68],
  ]),
}

const metadata: Record<
  ShapeId,
  Pick<ShapeDefinition, 'label' | 'description'>
> = {
  orb: { label: 'Orb', description: 'Balanced and calm' },
  soft: { label: 'Soft', description: 'Organic and uneven' },
  tile: { label: 'Tile', description: 'Rounded and steady' },
  capsule: { label: 'Capsule', description: 'Quick and compact' },
  peak: { label: 'Peak', description: 'Curious and alert' },
  gem: { label: 'Gem', description: 'Structured and bold' },
  ripple: { label: 'Ripple', description: 'Playful and elastic' },
  drop: { label: 'Drop', description: 'Warm and expressive' },
}

export const SHAPES: ShapeDefinition[] = SHAPE_IDS.map((id) => ({
  id,
  ...metadata[id],
  path: closedCurvePath(pointSets[id]),
}))

export const shapeById = (id: ShapeId): ShapeDefinition =>
  SHAPES.find((shape) => shape.id === id) ?? SHAPES[0]
