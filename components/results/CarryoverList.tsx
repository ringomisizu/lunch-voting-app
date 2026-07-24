import type { CandidateResult } from '@/lib/types'

interface Props {
  candidates: CandidateResult[]
}

export default function CarryoverList({ candidates }: Props) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">次回持ち越し</h2>
      <div className="space-y-1">
        {candidates.map(c => (
          <div
            key={c.candidate_id}
            className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <span className="text-sm text-gray-300 w-8 shrink-0">{c.rank}位</span>
            <span className="flex-1 text-sm text-gray-400">{c.name}</span>
            <span className="text-xs text-gray-300">次回持ち越し</span>
          </div>
        ))}
      </div>
    </div>
  )
}
