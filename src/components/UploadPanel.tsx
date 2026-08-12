import { ImageSquare, Trash, UploadSimple } from '@phosphor-icons/react'
import { useRef, useState } from 'react'

export type UploadedImage = {
  name: string
  dataUrl: string
}

type UploadPanelProps = {
  image: UploadedImage | null
  onChange: (image: UploadedImage | null) => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export function UploadPanel({ image, onChange }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReading, setIsReading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const readFile = (file?: File) => {
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Choose a PNG, JPEG, or WebP image.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('The image must be smaller than 5 MB.')
      return
    }

    setError(null)
    setIsReading(true)
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setError('This image could not be read.')
        setIsReading(false)
        return
      }
      onChange({ name: file.name, dataUrl: reader.result })
      setIsReading(false)
    }
    reader.onerror = () => {
      setError('This image could not be read.')
      setIsReading(false)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-[#f2f0e8]">Add a texture</p>
        <p className="mt-1 text-xs leading-relaxed text-[#92958c]">
          Your file stays in this browser and is never uploaded to a server.
        </p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault()
          setIsDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          readFile(event.dataTransfer.files[0])
        }}
        className="group flex min-h-44 w-full flex-col items-center justify-center rounded-[1.2rem] border border-dashed px-5 py-7 text-center transition-[border-color,background-color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none active:scale-[0.985]"
        style={{
          borderColor: isDragging ? '#f56a16' : 'rgba(255,255,255,0.14)',
          backgroundColor: isDragging ? 'rgba(245,106,22,0.08)' : '#1c1d19',
        }}
      >
        {isReading ? (
          <div className="w-full max-w-44 space-y-3" aria-label="Reading image">
            <div className="skeleton mx-auto h-10 w-10 rounded-xl" />
            <div className="skeleton h-3 w-full rounded-full" />
            <div className="skeleton mx-auto h-3 w-2/3 rounded-full" />
          </div>
        ) : image ? (
          <>
            <img
              src={image.dataUrl}
              alt="Uploaded texture preview"
              className="h-20 w-20 rounded-[1rem] object-cover shadow-[0_12px_24px_rgba(0,0,0,0.22)]"
            />
            <span className="mt-3 max-w-full truncate text-sm font-medium text-[#f2f0e8]">
              {image.name}
            </span>
            <span className="mt-1 text-xs text-[#92958c]">
              Choose another image
            </span>
          </>
        ) : (
          <>
            <span className="grid h-11 w-11 place-items-center rounded-[0.9rem] bg-[#272823] text-[#d7d8d0] transition-transform duration-200 group-hover:-translate-y-0.5">
              <UploadSimple aria-hidden="true" size={21} weight="bold" />
            </span>
            <span className="mt-4 text-sm font-medium text-[#f2f0e8]">
              Drop an image here
            </span>
            <span className="mt-1 text-xs text-[#92958c]">
              PNG, JPEG, or WebP · 5 MB max
            </span>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="sr-only"
        aria-label="Choose an image texture"
        onChange={(event) => readFile(event.target.files?.[0])}
      />

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-[#6f3434] bg-[#2b1b1a] px-3 py-2 text-xs text-[#f5a49d]"
        >
          {error}
        </p>
      ) : null}

      {image ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-[#c9cbc3] transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:outline-none active:scale-[0.985]"
        >
          <Trash aria-hidden="true" size={17} />
          Remove texture
        </button>
      ) : (
        <div className="flex items-start gap-2.5 rounded-xl bg-[#1d1e1a] p-3 text-xs leading-relaxed text-[#92958c]">
          <ImageSquare
            aria-hidden="true"
            size={17}
            className="mt-0.5 shrink-0"
          />
          <span>High-contrast photos create the clearest clipped texture.</span>
        </div>
      )}
    </div>
  )
}
