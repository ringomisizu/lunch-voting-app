'use client'

import { useEffect, useState } from 'react'
import type { CandidateResult } from '@/lib/types'

const RANK_ICON: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

interface BarProps {
  pct: number
}

function AnimatedBar({ pct }: BarProps) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const id = setTimeout(() => setWidth(pct), 80)
    return () => clearTimeout(id)
  }, [pct])
  return (
    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-2.5 bg-blue-500 rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

interface Props {
  candidates: CandidateResult[]
}

export default function RankingList({ candidates }: Props) {
  if (candidates.length === 0) return null

  const maxPoints = candidates[0].total_points

  return (
    <div className="space-y-3">
      {candidates.map(c => {
        const icon = RANK_ICON[c.rank]
        const pct = maxPoints > 0 ? Math.round((c.total_points / maxPoints) * 100) : 0
        const isTop3 = c.rank <= 3

        return (
          <div
            key={c.candidate_id}
            className={`rounded-xl border px-4 py-3 space-y-2 ${
              isTop3 ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`shrink-0 font-bold ${icon ? 'text-xl' : 'text-sm text-gray-400 w-6 text-center'}`}>
                {icon ?? `${c.rank}`}
              </span>
              <span className={`flex-1 font-semibold text-sm ${isTop3 ? 'text-gray-900' : 'text-gray-500'}`}>
                {c.name}
              </span>
              <span className={`tabular-nums font-bold shrink-0 ${isTop3 ? 'text-lg text-gray-800' : 'text-sm text-gray-400'}`}>
                {c.total_points}
                <span className="text-xs font-normal ml-0.5 text-gray-400">枚</span>
              </span>
            </div>
            <AnimatedBar pct={pct} />
          </div>
        )
      })}
    </div>
  )
}
