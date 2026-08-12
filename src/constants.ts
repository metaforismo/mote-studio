import type { ShapeId } from './lib/shapes'

export const COLORS = [
  { name: 'Chalk', value: '#edece7' },
  { name: 'Cocoa', value: '#8b633d' },
  { name: 'Poppy', value: '#dc2944' },
  { name: 'Tangerine', value: '#f56a16' },
  { name: 'Marigold', value: '#ee9e18' },
  { name: 'Meadow', value: '#19ae7a' },
  { name: 'Lagoon', value: '#16a79d' },
  { name: 'Sky', value: '#2f8de3' },
  { name: 'Violet', value: '#7651d6' },
  { name: 'Berry', value: '#d72879' },
  { name: 'Silver', value: '#b9bab7' },
] as const

export type MotionLevel = 'calm' | 'playful' | 'kinetic'

export type MoteConfig = {
  shapeId: ShapeId
  color: string
  motion: MotionLevel
  autoMorph: boolean
}

export const DEFAULT_CONFIG: MoteConfig = {
  shapeId: 'orb',
  color: '#f56a16',
  motion: 'playful',
  autoMorph: true,
}

export const MOTION_LEVELS: Array<{
  id: MotionLevel
  label: string
  description: string
}> = [
  { id: 'calm', label: 'Calm', description: 'Slow, gentle drift' },
  { id: 'playful', label: 'Playful', description: 'Soft bounce and tilt' },
  { id: 'kinetic', label: 'Kinetic', description: 'Fast and expressive' },
]

export const getEyeColor = (hex: string): string => {
  const value = hex.replace('#', '')
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
  return luminance > 0.48 ? '#151612' : '#f4f2eb'
}
