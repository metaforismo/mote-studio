import { SHAPES, eyeById, type EyeId, type ShapeId } from '@mote-studio/core'

type ShapePickerProps = {
  selected: ShapeId
  color: string
  eyeColor: string
  eyeStyle: EyeId
  onSelect: (id: ShapeId) => void
}

export function ShapePicker({
  selected,
  color,
  eyeColor,
  eyeStyle,
  onSelect,
}: ShapePickerProps) {
  const eyes = eyeById(eyeStyle)

  return (
    <fieldset>
      <legend className="mb-3 flex w-full items-center justify-between gap-3 text-[0.68rem] font-semibold tracking-[0.18em] text-[#8f9188] uppercase">
        <span>Shape</span>
        <span className="tracking-normal text-[#686b63] normal-case">
          14 silhouettes
        </span>
      </legend>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
        {SHAPES.map((shape) => {
          const isSelected = selected === shape.id
          return (
            <button
              key={shape.id}
              type="button"
              aria-label={`${shape.label}: ${shape.description}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(shape.id)}
              className="group relative aspect-square rounded-xl border bg-[#1d1e1a] p-1.5 transition-[border-color,background-color,transform] duration-150 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171815] focus-visible:outline-none active:translate-y-0 active:scale-[0.96]"
              style={{
                borderColor: isSelected ? '#66695f' : 'rgba(255,255,255,0.055)',
                boxShadow: isSelected
                  ? 'inset 0 0 0 1px rgba(255,255,255,0.08)'
                  : 'none',
              }}
            >
              <svg
                viewBox="0 0 320 320"
                aria-hidden="true"
                className="h-full w-full overflow-visible"
              >
                <path d={shape.path} fill={color} />
                <g fill={eyeColor}>
                  <path d={eyes.leftPath} />
                  <path d={eyes.rightPath} />
                </g>
              </svg>
              <span className="sr-only">{shape.label}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
