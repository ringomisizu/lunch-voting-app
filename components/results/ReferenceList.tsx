import type { CandidateResult } from '@/lib/types'

interface Props {
  candidates: CandidateResult[]
}

export default function ReferenceList({ candidates }: Props) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">参考候補</h2>
      <div className="space-y-1">
        {candidates.map(c => (
          <div
            key={c.candidate_id}
            className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border"
          >
            <span className="text-sm text-gray-400 w-8 shrink-0">{c.rank}位</span>
            <span className="flex-1 font-medium text-sm">{c.name}</span>
            <span className="text-sm font-bold tabular-nums text-gray-700">
              {c.total_points} pt
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
