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
