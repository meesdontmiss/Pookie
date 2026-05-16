'use client'

export function BetSlider({
  value,
  min,
  max,
  onChange,
}: {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <input
      className="h-2 w-full accent-emerald-300"
      type="range"
      min={min}
      max={Math.max(min, max)}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  )
}

