export const SHAPE_IDS = [
  'blob',
  'pebble',
  'bean',
  'egg',
  'squircle',
  'tablet',
  'capsule',
  'cylinder',
  'hex',
  'gem',
  'crystal',
  'wedge',
  'shield',
  'dome',
  'arch',
  'cloud',
  'teardrop',
  'leaf',
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
 * Every preset uses the same point count, so animation engines can
 * interpolate `d` without replacing the SVG node or causing a layout jump.
 */
export const closedCurvePath = (points: Point[]): string => {
  if (points.length < 3) {
    throw new Error('A closed curve requires at least three points')
  }

  const first = points[0]
  if (!first) throw new Error('A closed curve requires at least three points')

  const commands = [`M ${round(first.x)} ${round(first.y)}`]

  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index - 1 + points.length) % points.length]
    const current = points[index]
    const next = points[(index + 1) % points.length]
    const afterNext = points[(index + 2) % points.length]

    if (!previous || !current || !next || !afterNext) {
      throw new Error('The point ring is incomplete')
    }

    const controlOne = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6,
    }
    const controlTwo = {
      x: next.x - (afterNext.x - current.x) / 6,
      y: next.y - (afterNext.y - current.y) / 6,
    }

    commands.push(
      `C ${round(controlOne.x)} ${round(controlOne.y)} ${round(controlTwo.x)} ${round(controlTwo.y)} ${round(next.x)} ${round(next.y)}`,
    )
  }

  return `${commands.join(' ')} Z`
}

const pointSets: Record<ShapeId, Point[]> = {
  blob: radial(106, 106, (angle) => 1 + 0.025 * Math.sin(angle * 3 + 0.7)),
  pebble: radial(113, 92, (angle) => 1 + 0.04 * Math.sin(angle * 3 + 0.4)),
  bean: radial(
    92,
    116,
    (angle) => 1 + 0.13 * Math.sin(angle - 0.55) + 0.035 * Math.sin(angle * 3),
  ),
  egg: sample((angle) => ({
    x: CENTER + Math.cos(angle) * (89 + 14 * ((Math.sin(angle) + 1) / 2)),
    y: CENTER + Math.sin(angle) * 113,
  })),
  squircle: superellipse(103, 103, 5.4),
  tablet: superellipse(122, 76, 5.2),
  capsule: superellipse(76, 119, 4.2),
  cylinder: superellipse(88, 115, 7),
  hex: fromCoordinates([
    [118, 55],
    [160, 44],
    [202, 55],
    [232, 82],
    [249, 120],
    [249, 160],
    [249, 200],
    [231, 237],
    [202, 265],
    [160, 276],
    [118, 265],
    [89, 237],
    [71, 200],
    [71, 160],
    [71, 120],
    [88, 82],
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
  crystal: fromCoordinates([
    [160, 39],
    [184, 69],
    [211, 92],
    [224, 126],
    [232, 164],
    [221, 199],
    [202, 230],
    [179, 260],
    [160, 278],
    [139, 253],
    [117, 226],
    [95, 199],
    [87, 163],
    [96, 126],
    [111, 91],
    [137, 65],
  ]),
  wedge: fromCoordinates([
    [160, 49],
    [177, 71],
    [197, 103],
    [219, 142],
    [241, 184],
    [247, 216],
    [229, 237],
    [194, 244],
    [160, 245],
    [126, 244],
    [91, 237],
    [73, 216],
    [79, 184],
    [101, 142],
    [123, 103],
    [143, 71],
  ]),
  shield: fromCoordinates([
    [160, 45],
    [189, 57],
    [222, 70],
    [244, 92],
    [244, 130],
    [239, 169],
    [224, 207],
    [198, 239],
    [160, 270],
    [122, 239],
    [96, 207],
    [81, 169],
    [76, 130],
    [76, 92],
    [98, 70],
    [131, 57],
  ]),
  dome: fromCoordinates([
    [160, 56],
    [196, 62],
    [226, 80],
    [247, 108],
    [256, 142],
    [256, 177],
    [251, 207],
    [235, 228],
    [205, 237],
    [160, 239],
    [115, 237],
    [85, 228],
    [69, 207],
    [64, 177],
    [64, 142],
    [87, 91],
  ]),
  arch: superellipse(78, 121, 5.4),
  cloud: radial(106, 91, (angle) => 1 + 0.1 * Math.sin(angle * 5 - 0.4)),
  teardrop: fromCoordinates([
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
  leaf: fromCoordinates([
    [223, 53],
    [240, 78],
    [244, 108],
    [238, 142],
    [222, 179],
    [201, 215],
    [177, 246],
    [153, 267],
    [128, 263],
    [104, 247],
    [83, 222],
    [72, 191],
    [73, 156],
    [84, 119],
    [105, 85],
    [137, 60],
  ]),
}

const metadata: Record<
  ShapeId,
  Pick<ShapeDefinition, 'label' | 'description'>
> = {
  blob: { label: 'Blob', description: 'Balanced and organic' },
  pebble: { label: 'Pebble', description: 'Grounded and soft' },
  bean: { label: 'Bean', description: 'Asymmetric and friendly' },
  egg: { label: 'Egg', description: 'Light and upright' },
  squircle: { label: 'Squircle', description: 'Rounded and steady' },
  tablet: { label: 'Tablet', description: 'Wide and composed' },
  capsule: { label: 'Capsule', description: 'Tall and compact' },
  cylinder: { label: 'Cylinder', description: 'Strong and architectural' },
  hex: { label: 'Hex', description: 'Technical and precise' },
  gem: { label: 'Gem', description: 'Structured and bold' },
  crystal: { label: 'Crystal', description: 'Sharp and luminous' },
  wedge: { label: 'Wedge', description: 'Curious and alert' },
  shield: { label: 'Shield', description: 'Protective and confident' },
  dome: { label: 'Dome', description: 'Low and relaxed' },
  arch: { label: 'Arch', description: 'Tall and focused' },
  cloud: { label: 'Cloud', description: 'Playful and elastic' },
  teardrop: { label: 'Teardrop', description: 'Warm and expressive' },
  leaf: { label: 'Leaf', description: 'Directional and lively' },
}

export const SHAPES: ShapeDefinition[] = SHAPE_IDS.map((id) => ({
  id,
  ...metadata[id],
  path: closedCurvePath(pointSets[id]),
}))

export const shapeById = (id: ShapeId): ShapeDefinition => {
  const shape = SHAPES.find((candidate) => candidate.id === id)
  if (!shape) throw new Error(`Unknown Mote shape: ${id}`)
  return shape
}
