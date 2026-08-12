import type { ShapeId } from './shapes'
import { shapeById } from './shapes'

type AvatarExport = {
  shapeId: ShapeId
  color: string
  eyeColor: string
  imageDataUrl?: string | null
}

const escapeAttribute = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')

export const createAvatarSvg = ({
  shapeId,
  color,
  eyeColor,
  imageDataUrl,
}: AvatarExport): string => {
  const path = shapeById(shapeId).path
  const safeImage = imageDataUrl ? escapeAttribute(imageDataUrl) : null

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">',
    '<defs><clipPath id="mote-body"><path d="' + path + '"/></clipPath></defs>',
    '<path d="' + path + '" fill="' + escapeAttribute(color) + '"/>',
    safeImage
      ? '<image href="' +
        safeImage +
        '" x="48" y="48" width="224" height="224" preserveAspectRatio="xMidYMid slice" clip-path="url(#mote-body)" opacity="0.78"/>'
      : '',
    '<g fill="' + escapeAttribute(eyeColor) + '">',
    '<rect x="122" y="125" width="24" height="56" rx="12" transform="rotate(8 134 153)"/>',
    '<rect x="177" y="125" width="24" height="56" rx="12" transform="rotate(8 189 153)"/>',
    '</g></svg>',
  ].join('')
}

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export const downloadSvg = (svg: string) => {
  downloadBlob(
    new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
    'mote.svg',
  )
}

export const downloadPng = (svg: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const source = URL.createObjectURL(
      new Blob([svg], { type: 'image/svg+xml' }),
    )
    const image = new Image()

    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1024
      canvas.height = 1024
      const context = canvas.getContext('2d')

      if (!context) {
        URL.revokeObjectURL(source)
        reject(new Error('Canvas is not available in this browser.'))
        return
      }

      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(source)
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('The PNG could not be created.'))
          return
        }
        downloadBlob(blob, 'mote.png')
        resolve()
      }, 'image/png')
    }

    image.onerror = () => {
      URL.revokeObjectURL(source)
      reject(new Error('The avatar preview could not be rendered.'))
    }

    image.src = source
  })
