import type { Candidate } from '@/lib/types'

interface Props {
  candidate: Candidate
  value: number
  remaining: number
  onChange: (value: number) => void
  disabled: boolean
}

interface StepButtonProps {
  label: string
  onClick: () => void
  disabled: boolean
}

function StepButton({ label, onClick, disabled }: StepButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-9 w-14 rounded-lg border border-gray-300 bg-white text-sm font-medium
                 hover:bg-gray-50 active:bg-gray-100
                 disabled:opacity-30 disabled:cursor-not-allowed
                 transition-colors"
    >
      {label}
    </button>
  )
}

export default function CandidateRow({ candidate, value, remaining, onChange, disabled }: Props) {
  function adjust(delta: number) {
    const next = value + delta
    if (next < 0) return
    if (delta > 0 && delta > remaining) return
    onChange(next)
  }

  return (
    <div className="py-3 border-b last:border-b-0 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium leading-snug">{candidate.name}</span>
        <span className={`text-xl font-bold tabular-nums shrink-0 ${value > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
          {value}<span className="text-sm font-normal ml-0.5">枚</span>
        </span>
      </div>
      <div className="flex items-center justify-end gap-1.5">
        <StepButton label="−10" onClick={() => adjust(-10)} disabled={disabled || value < 10} />
        <StepButton label="−1"  onClick={() => adjust(-1)}  disabled={disabled || value < 1} />
        <StepButton label="+1"  onClick={() => adjust(1)}   disabled={disabled || remaining < 1} />
        <StepButton label="+10" onClick={() => adjust(10)}  disabled={disabled || remaining < 10} />
      </div>
    </div>
  )
}
