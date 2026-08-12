import { Check } from '@phosphor-icons/react'
import { COLORS } from '../constants'

type PalettePickerProps = {
  selected: string
  onSelect: (color: string) => void
}

export function PalettePicker({ selected, onSelect }: PalettePickerProps) {
  return (
    <fieldset>
      <legend className="mb-3 text-[0.68rem] font-semibold tracking-[0.18em] text-[#8f9188] uppercase">
        Color
      </legend>
      <div className="grid grid-cols-6 gap-x-3 gap-y-3.5 sm:grid-cols-7 lg:grid-cols-6">
        {COLORS.map((color) => {
          const isSelected =
            selected.toLowerCase() === color.value.toLowerCase()
          const iconColor =
            color.name === 'Chalk' ||
            color.name === 'Marigold' ||
            color.name === 'Silver'
              ? '#171815'
              : '#f5f2e9'
          return (
            <button
              key={color.value}
              type="button"
              aria-label={color.name}
              aria-pressed={isSelected}
              onClick={() => onSelect(color.value)}
              className="relative aspect-square min-h-9 min-w-9 rounded-full border-2 border-transparent transition-transform duration-150 hover:scale-110 focus-visible:ring-2 focus-visible:ring-[#f56a16] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171815] focus-visible:outline-none active:scale-[0.92]"
              style={{
                backgroundColor: color.value,
                boxShadow: isSelected
                  ? '0 0 0 3px #171815, 0 0 0 5px #5c5f56'
                  : 'inset 0 1px 0 rgba(255,255,255,0.18)',
              }}
            >
              {isSelected ? (
                <Check
                  aria-hidden="true"
                  weight="bold"
                  className="absolute inset-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2"
                  color={iconColor}
                />
              ) : null}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
