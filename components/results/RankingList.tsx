'use client'

import { useEffect, useState } from 'react'
import type { CandidateResult } from '@/lib/types'
import GoldCoin from '@/components/ui/GoldCoin'

const RANK_ICON: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

interface TierStyle {
  card: string
  label: string
  points: string
  medal: string
  coin: number
  nameSize: string
  ptSize: string
  bar: string
}

// 落ち着いた高級感のある配色: 1位=淡いゴールド×ワインレッド, 2位=淡いシルバーグレー, 3位=淡いブロンズベージュ
const TIER_STYLE: Record<number, TierStyle> = {
  1: {
    card: 'border border-amber-300 bg-gradient-to-br from-amber-50 via-white to-rose-50/80 shadow-md ring-1 ring-rose-100 p-6',
    label: 'text-rose-800',
    points: 'text-amber-700',
    medal: 'text-4xl',
    coin: 26,
    nameSize: 'text-xl',
    ptSize: 'text-4xl',
    bar: 'bg-gradient-to-r from-amber-400 to-amber-600',
  },
  2: {
    card: 'border border-slate-300 bg-slate-100 shadow-sm p-5',
    label: 'text-slate-600',
    points: 'text-slate-800',
    medal: 'text-3xl',
    coin: 22,
    nameSize: 'text-lg',
    ptSize: 'text-3xl',
    bar: 'bg-slate-400',
  },
  3: {
    card: 'border border-orange-800/30 bg-orange-50 shadow-sm p-5',
    label: 'text-orange-900',
    points: 'text-orange-900',
    medal: 'text-3xl',
    coin: 22,
    nameSize: 'text-lg',
    ptSize: 'text-3xl',
    bar: 'bg-orange-800/70',
  },
}

function AnimatedBar({ pct, colorClass }: { pct: number; colorClass: string }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const id = setTimeout(() => setWidth(pct), 80)
    return () => clearTimeout(id)
  }, [pct])
  return (
    <div className="h-2 bg-black/5 rounded-full overflow-hidden">
      <div
        className={`h-2 rounded-full transition-[width] duration-700 ease-out ${colorClass}`}
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
  const top5 = candidates.filter(c => c.rank <= 5)
  const rest = candidates.filter(c => c.rank > 5)

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {top5.map(c => {
          const pct = maxPoints > 0 ? Math.round((c.total_points / maxPoints) * 100) : 0
          const tier = TIER_STYLE[c.rank]

          if (tier) {
            return (
              <div key={c.candidate_id} className={`rounded-2xl text-center space-y-2 ${tier.card}`}>
                <div className={`leading-none ${tier.medal}`}>{RANK_ICON[c.rank]}</div>
                <div className={`text-xs font-semibold uppercase tracking-wide ${tier.label}`}>{c.rank}位</div>
                <div className={`font-bold text-slate-900 leading-snug line-clamp-2 ${tier.nameSize}`}>
                  {c.name}
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <span className={`font-black tabular-nums ${tier.points} ${tier.ptSize}`}>
                    {c.total_points}
                  </span>
                  <GoldCoin size={tier.coin} />
                  <span className="text-sm text-slate-400">枚</span>
                </div>
                <AnimatedBar pct={pct} colorClass={tier.bar} />
              </div>
            )
          }

          // 4位・5位: シンプルなカード（白背景・通常の濃さの文字色）
          return (
            <div key={c.candidate_id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="shrink-0 w-8 text-sm font-semibold text-slate-500">{c.rank}位</span>
                <span className="flex-1 min-w-0 font-semibold text-sm text-slate-900 line-clamp-2">
                  {c.name}
                </span>
                <span className="shrink-0 flex items-center gap-1 font-bold tabular-nums text-slate-900">
                  {c.total_points}
                  <GoldCoin size={15} />
                  <span className="text-xs font-normal text-slate-400">枚</span>
                </span>
              </div>
              <AnimatedBar pct={pct} colorClass="bg-amber-400" />
            </div>
          )
        })}
      </div>

      {rest.length > 0 && (
        <div className="space-y-2">
          <h2 className="px-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">6位以下</h2>
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
            {rest.map(c => (
              <div key={c.candidate_id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="shrink-0 w-9 text-xs tabular-nums text-slate-500">{c.rank}位</span>
                <span className="flex-1 min-w-0 truncate text-sm font-medium text-slate-800">{c.name}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                  {c.total_points}
                  <span className="text-xs font-normal text-slate-400">枚</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
