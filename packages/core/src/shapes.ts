export const SHAPE_IDS = [
  'orb',
  'blob',
  'pebble',
  'egg',
  'squircle',
  'capsule',
  'wedge',
  'gem',
  'cloud',
  'brain',
  'teardrop',
  'dome',
  'bean',
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
const POINT_COUNT = 32

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
  orb: radial(104, 104, (angle) => 1 + 0.012 * Math.sin(angle * 3 + 0.35)),
  blob: fromCoordinates([
    [160, 54],
    [188, 57],
    [213, 72],
    [228, 91],
    [249, 102],
    [260, 127],
    [256, 153],
    [247, 172],
    [256, 196],
    [246, 219],
    [224, 235],
    [197, 236],
    [174, 246],
    [145, 241],
    [121, 235],
    [94, 236],
    [73, 220],
    [63, 196],
    [70, 171],
    [61, 148],
    [67, 121],
    [86, 103],
    [97, 77],
    [126, 57],
  ]),
  pebble: radial(114, 91, (angle) => 1 + 0.035 * Math.sin(angle * 3 + 0.4)),
  egg: sample((angle) => ({
    x: CENTER + Math.cos(angle) * (89 + 14 * ((Math.sin(angle) + 1) / 2)),
    y: CENTER + Math.sin(angle) * 113,
  })),
  squircle: superellipse(103, 103, 5.4),
  capsule: superellipse(122, 72, 4.6),
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
  cloud: fromCoordinates([
    [160, 51],
    [181, 52],
    [200, 61],
    [214, 76],
    [221, 94],
    [222, 103],
    [234, 96],
    [250, 95],
    [265, 102],
    [276, 115],
    [281, 132],
    [281, 139],
    [290, 143],
    [298, 153],
    [302, 166],
    [301, 181],
    [295, 194],
    [284, 205],
    [270, 212],
    [252, 216],
    [226, 217],
    [194, 217],
    [160, 217],
    [126, 217],
    [94, 217],
    [68, 216],
    [50, 212],
    [36, 205],
    [25, 194],
    [19, 181],
    [18, 166],
    [22, 153],
    [30, 143],
    [39, 139],
    [39, 132],
    [44, 115],
    [55, 102],
    [70, 95],
    [86, 96],
    [98, 103],
    [99, 94],
    [106, 76],
    [120, 61],
    [139, 52],
  ]),
  brain: fromCoordinates([
    [160, 82],
    [177, 73],
    [197, 76],
    [211, 88],
    [216, 101],
    [229, 93],
    [247, 95],
    [260, 106],
    [264, 121],
    [280, 119],
    [294, 129],
    [299, 145],
    [295, 160],
    [286, 169],
    [297, 181],
    [298, 195],
    [289, 207],
    [273, 213],
    [258, 210],
    [249, 222],
    [234, 230],
    [218, 228],
    [207, 220],
    [194, 231],
    [177, 235],
    [161, 228],
    [147, 235],
    [130, 232],
    [118, 222],
    [105, 230],
    [88, 227],
    [77, 215],
    [61, 216],
    [47, 208],
    [41, 194],
    [45, 181],
    [34, 170],
    [29, 155],
    [34, 140],
    [47, 130],
    [43, 116],
    [50, 102],
    [64, 94],
    [80, 96],
    [87, 82],
    [101, 73],
    [118, 75],
    [130, 85],
    [142, 75],
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
  dome: fromCoordinates([
    [160, 66],
    [190, 67],
    [218, 78],
    [240, 98],
    [254, 123],
    [258, 153],
    [258, 183],
    [257, 211],
    [246, 226],
    [224, 232],
    [196, 232],
    [160, 232],
    [124, 232],
    [96, 232],
    [74, 226],
    [63, 211],
    [62, 183],
    [62, 153],
    [66, 124],
    [80, 99],
    [102, 80],
    [130, 68],
  ]),
  bean: radial(
    111,
    91,
    (angle) =>
      1 + 0.09 * Math.sin(angle - 0.55) - 0.08 * Math.cos(angle * 2 + 0.35),
  ),
  leaf: fromCoordinates([
    [258, 70],
    [254, 95],
    [246, 121],
    [234, 148],
    [219, 174],
    [201, 198],
    [181, 217],
    [159, 229],
    [136, 234],
    [114, 230],
    [95, 220],
    [80, 204],
    [70, 185],
    [66, 164],
    [69, 143],
    [79, 124],
    [94, 108],
    [113, 96],
    [135, 87],
    [159, 80],
    [185, 75],
    [211, 72],
    [236, 70],
  ]),
}

const metadata: Record<
  ShapeId,
  Pick<ShapeDefinition, 'label' | 'description'>
> = {
  orb: { label: 'Orb', description: 'Round and quietly imperfect' },
  blob: { label: 'Blob', description: 'Balanced and organic' },
  pebble: { label: 'Pebble', description: 'Grounded and soft' },
  egg: { label: 'Egg', description: 'Light and upright' },
  squircle: { label: 'Squircle', description: 'Rounded and steady' },
  capsule: { label: 'Capsule', description: 'Low and composed' },
  gem: { label: 'Gem', description: 'Structured and bold' },
  wedge: { label: 'Wedge', description: 'Curious and alert' },
  dome: { label: 'Dome', description: 'Low and relaxed' },
  cloud: {
    label: 'Cloud',
    description: 'Clean, puffy and softly grounded',
  },
  brain: { label: 'Brain', description: 'Lobed and playfully thoughtful' },
  teardrop: { label: 'Teardrop', description: 'Pointed, warm and expressive' },
  bean: { label: 'Bean', description: 'Asymmetric and friendly' },
  leaf: { label: 'Leaf', description: 'Directional, soft and lightly poised' },
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
