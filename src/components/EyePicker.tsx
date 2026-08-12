import { EYES, type EyeId } from '@mote-studio/core'

type EyePickerProps = {
  selected: EyeId
  bodyColor: string
  eyeColor: string
  onSelect: (id: EyeId) => void
}

export function EyePicker({
  selected,
  bodyColor,
  eyeColor,
  onSelect,
}: EyePickerProps) {
  return (
    <fieldset>
      <legend className="mb-3 flex w-full items-center justify-between gap-3 text-[0.68rem] font-semibold tracking-[0.18em] text-[#8f9188] uppercase">
        <span>Eyes</span>
        <span className="tracking-normal text-[#686b63] normal-case">
          25 expressions
        </span>
      </legend>
      <div className="grid grid-cols-5 gap-2">
        {EYES.map((eyes) => {
          const isSelected = selected === eyes.id
          return (
            <button
              key={eyes.id}
              type="button"
              aria-label={`${String(eyes.referenceIndex).padStart(2, '0')} ${eyes.label}: ${eyes.description}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(eyes.id)}
              className="group relative aspect-[1.12] rounded-xl border bg-[#1d1e1a] p-1 transition-[border-color,background-color,transform] duration-150 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171815] focus-visible:outline-none active:translate-y-0 active:scale-[0.96]"
              style={{
                borderColor: isSelected ? '#66695f' : 'rgba(255,255,255,0.055)',
                backgroundColor: isSelected
                  ? 'rgba(245,106,22,0.08)'
                  : '#1d1e1a',
                boxShadow: isSelected
                  ? 'inset 0 0 0 1px rgba(255,255,255,0.08)'
                  : 'none',
              }}
            >
              <svg
                viewBox="92 110 140 88"
                aria-hidden="true"
                className="h-full w-full"
              >
                <rect
                  x="94"
                  y="112"
                  width="136"
                  height="84"
                  rx="34"
                  fill={bodyColor}
                />
                <path d={eyes.leftPath} fill={eyeColor} />
                <path d={eyes.rightPath} fill={eyeColor} />
              </svg>
              <span className="absolute right-1 bottom-0.5 font-mono text-[0.5rem] text-[#696c64]">
                {String(eyes.referenceIndex).padStart(2, '0')}
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
