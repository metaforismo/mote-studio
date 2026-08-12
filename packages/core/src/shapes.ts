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
const POINT_COUNT = 24

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

/**
 * Redistributes hand-drawn rings to the shared body topology while retaining
 * the silhouette's corners and lobes. This lets expressive reference shapes
 * morph into the procedural presets without crossfading.
 */
const resampleClosedRing = (
  points: Point[],
  targetCount = POINT_COUNT,
): Point[] => {
  if (points.length < 3) {
    throw new Error('A closed curve requires at least three points')
  }

  const segments = points.map((point, index) => {
    const next = points[(index + 1) % points.length]
    if (!next) throw new Error('The point ring is incomplete')
    return Math.hypot(next.x - point.x, next.y - point.y)
  })
  const perimeter = segments.reduce((total, length) => total + length, 0)

  return Array.from({ length: targetCount }, (_, sampleIndex) => {
    const targetDistance = (sampleIndex / targetCount) * perimeter
    let coveredDistance = 0

    for (let index = 0; index < points.length; index += 1) {
      const point = points[index]
      const next = points[(index + 1) % points.length]
      const segmentLength = segments[index]

      if (!point || !next || segmentLength === undefined) {
        throw new Error('The point ring is incomplete')
      }

      if (coveredDistance + segmentLength >= targetDistance) {
        const progress =
          segmentLength === 0
            ? 0
            : (targetDistance - coveredDistance) / segmentLength
        return {
          x: point.x + (next.x - point.x) * progress,
          y: point.y + (next.y - point.y) * progress,
        }
      }

      coveredDistance += segmentLength
    }

    return points[0] as Point
  })
}

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
    [160, 48],
    [173, 64],
    [188, 88],
    [205, 116],
    [222, 146],
    [239, 178],
    [249, 205],
    [245, 226],
    [228, 239],
    [199, 244],
    [160, 245],
    [121, 244],
    [92, 239],
    [75, 226],
    [71, 205],
    [81, 178],
    [98, 146],
    [115, 116],
    [132, 88],
    [147, 64],
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
  cloud: fromCoordinates([
    [160, 76],
    [176, 65],
    [194, 67],
    [205, 82],
    [220, 85],
    [237, 79],
    [252, 89],
    [256, 107],
    [249, 122],
    [262, 137],
    [263, 154],
    [252, 168],
    [258, 185],
    [247, 200],
    [228, 203],
    [215, 197],
    [199, 211],
    [181, 213],
    [166, 204],
    [150, 215],
    [131, 211],
    [119, 199],
    [100, 207],
    [82, 199],
    [77, 183],
    [63, 174],
    [57, 157],
    [67, 143],
    [58, 128],
    [62, 110],
    [77, 100],
    [91, 101],
    [101, 86],
    [118, 80],
    [132, 88],
    [143, 74],
  ]),
  teardrop: fromCoordinates([
    [160, 38],
    [170, 52],
    [184, 73],
    [200, 96],
    [215, 120],
    [228, 146],
    [236, 171],
    [237, 193],
    [229, 213],
    [214, 229],
    [195, 241],
    [174, 247],
    [151, 248],
    [129, 244],
    [109, 234],
    [93, 219],
    [84, 200],
    [82, 180],
    [87, 157],
    [97, 134],
    [110, 112],
    [124, 88],
    [139, 62],
    [152, 43],
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
  cloud: {
    label: 'Braincloud',
    description: 'Lobed like a little thought cloud',
  },
  teardrop: { label: 'Teardrop', description: 'Pointed, warm and expressive' },
  leaf: { label: 'Leaf', description: 'Directional and lively' },
}

export const SHAPES: ShapeDefinition[] = SHAPE_IDS.map((id) => ({
  id,
  ...metadata[id],
  path: closedCurvePath(resampleClosedRing(pointSets[id])),
}))

export const shapeById = (id: ShapeId): ShapeDefinition => {
  const shape = SHAPES.find((candidate) => candidate.id === id)
  if (!shape) throw new Error(`Unknown Mote shape: ${id}`)
  return shape
}
