import type { Candidate } from '@/lib/types'

interface Props {
  candidate: Candidate
  value: number
  onChange: (value: number) => void
  disabled: boolean
}

export default function CandidateRow({ candidate, value, onChange, disabled }: Props) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value

    if (raw === '') {
      onChange(0)
      return
    }
    // Reject anything that is not a sequence of digits (no decimals, no sign)
    if (!/^\d+$/.test(raw)) return

    const num = parseInt(raw, 10)
    if (num > 100) return
    onChange(num)
  }

  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-b-0">
      <span className="flex-1 text-sm font-medium">{candidate.name}</span>
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value === 0 ? '' : String(value)}
          onChange={handleChange}
          disabled={disabled}
          placeholder="0"
          aria-label={`${candidate.name}へのポイント`}
          className="w-16 text-right border border-gray-300 rounded-md px-2 py-1 text-sm
                     focus:outline-none focus:ring-2 focus:ring-ring
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className="text-xs text-gray-400 w-4">pt</span>
      </div>
    </div>
  )
}
