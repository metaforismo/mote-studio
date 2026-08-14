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

export type PhotoBackground =
  | { type: 'transparent' }
  | { type: 'solid'; color: string }
  | { type: 'linear'; from: string; to: string }
  | { type: 'radial'; from: string; to: string }

export type PngExportOptions = {
  size: 512 | 1024 | 2048
  background: PhotoBackground
}

const paintBackground = (
  context: CanvasRenderingContext2D,
  size: number,
  background: PhotoBackground,
) => {
  if (background.type === 'transparent') {
    context.clearRect(0, 0, size, size)
    return
  }
  if (background.type === 'solid') {
    context.fillStyle = background.color
  } else if (background.type === 'linear') {
    const gradient = context.createLinearGradient(0, 0, size, size)
    gradient.addColorStop(0, background.from)
    gradient.addColorStop(1, background.to)
    context.fillStyle = gradient
  } else {
    const gradient = context.createRadialGradient(
      size * 0.42,
      size * 0.35,
      0,
      size * 0.5,
      size * 0.5,
      size * 0.72,
    )
    gradient.addColorStop(0, background.from)
    gradient.addColorStop(1, background.to)
    context.fillStyle = gradient
  }
  context.fillRect(0, 0, size, size)
}

export const downloadPng = (
  svg: string,
  options: PngExportOptions = {
    size: 1024,
    background: { type: 'transparent' },
  },
): Promise<void> =>
  new Promise((resolve, reject) => {
    const source = URL.createObjectURL(
      new Blob([svg], { type: 'image/svg+xml' }),
    )
    const image = new Image()

    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = options.size
      canvas.height = options.size
      const context = canvas.getContext('2d')

      if (!context) {
        URL.revokeObjectURL(source)
        reject(new Error('Canvas is not available in this browser.'))
        return
      }

      paintBackground(context, options.size, options.background)
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

const escapeTemplateLiteral = (value: string) =>
  value.replaceAll('`', '\\`').replaceAll('${', '\\${')

export const downloadJavaScript = (svg: string) => {
  const source = `/** Portable Mote Studio export. No runtime dependencies. */\nexport const moteSvg = \`${escapeTemplateLiteral(svg)}\`;\n\nexport function mountMote(target) {\n  if (!(target instanceof Element)) throw new TypeError('mountMote expects a DOM Element');\n  target.innerHTML = moteSvg;\n  return target.querySelector('svg');\n}\n`
  downloadBlob(new Blob([source], { type: 'text/javascript' }), 'mote.js')
}

export const downloadReactComponent = (svg: string) => {
  const source = `import type { HTMLAttributes } from 'react';\n\nconst svg = \`${escapeTemplateLiteral(svg)}\`;\n\nexport function Mote(props: HTMLAttributes<HTMLSpanElement>) {\n  return <span {...props} data-mote-studio dangerouslySetInnerHTML={{ __html: svg }} />;\n}\n`
  downloadBlob(new Blob([source], { type: 'text/plain' }), 'Mote.tsx')
}
