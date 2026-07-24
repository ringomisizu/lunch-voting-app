import type { CandidateResult } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'

const RANK_LABEL: Record<number, string> = { 1: '1位', 2: '2位', 3: '3位' }
const RANK_STYLE: Record<number, string> = {
  1: 'border-yellow-400 bg-yellow-50',
  2: 'border-gray-300 bg-gray-50',
  3: 'border-amber-700 bg-amber-50',
}
const RANK_TEXT: Record<number, string> = {
  1: 'text-yellow-600',
  2: 'text-gray-500',
  3: 'text-amber-700',
}

interface Props {
  candidates: CandidateResult[]
}

export default function TopThreeCards({ candidates }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {candidates.map(c => (
        <Card
          key={c.candidate_id}
          className={`border-2 ${RANK_STYLE[c.rank] ?? 'border-gray-200 bg-white'}`}
        >
          <CardContent className="py-6 text-center space-y-2">
            <div className={`text-sm font-semibold ${RANK_TEXT[c.rank] ?? 'text-gray-500'}`}>
              {RANK_LABEL[c.rank] ?? `${c.rank}位`}
            </div>
            <div className="text-xl font-bold leading-tight">{c.name}</div>
            <div className="text-4xl font-black tabular-nums">{c.total_points}</div>
            <div className="text-xs text-gray-400">合計ポイント</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
