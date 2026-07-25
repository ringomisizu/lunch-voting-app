'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Candidate } from '@/lib/types'
import { Button } from '@/components/ui/button'
import CandidateRow from './CandidateRow'
import PointsCounter from './PointsCounter'

const TOTAL_POINTS = 100

interface Props {
  candidates: Candidate[]
}

// Returns a map of candidateId → rank (1–3) for candidates with coins.
// Ties share the same rank. Only ranks 1–3 are returned.
function computeRanks(
  candidates: Candidate[],
  points: Record<string, number>,
): Record<string, number | undefined> {
  const withPts = candidates
    .map(c => ({ id: c.id, pts: points[c.id] ?? 0 }))
    .filter(c => c.pts > 0)
    .sort((a, b) => b.pts - a.pts)

  const result: Record<string, number | undefined> = {}
  let rank = 1
  withPts.forEach((c, i) => {
    if (i > 0 && c.pts < withPts[i - 1].pts) rank = i + 1
    if (rank <= 3) result[c.id] = rank
  })
  return result
}

export default function VotingForm({ candidates }: Props) {
  const router = useRouter()
  const [points, setPoints] = useState<Record<string, number>>(
    Object.fromEntries(candidates.map(c => [c.id, 0]))
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const total = Object.values(points).reduce((sum, p) => sum + p, 0)
  const remaining = TOTAL_POINTS - total
  const isValid = remaining === 0

  // Detect >0→0 transition to animate and fire confetti.
  const prevRemainingRef = useRef(remaining)
  const [justCompleted, setJustCompleted] = useState(false)

  useEffect(() => {
    const prev = prevRemainingRef.current
    prevRemainingRef.current = remaining
    if (prev > 0 && remaining === 0) {
      setJustCompleted(true)
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { x: 0.5, y: 0.1 },
          gravity: 1.5,
          ticks: 120,
        })
      })
    } else if (remaining > 0) {
      setJustCompleted(false)
    }
  }, [remaining])

  function handleChange(id: string, value: number) {
    setPoints(prev => ({ ...prev, [id]: value }))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (total !== TOTAL_POINTS) {
      setError(`コインを合計100枚配り終えてから投票してください（現在 ${total} 枚）`)
      return
    }

    setSubmitting(true)
    setError(null)

    const distribution = candidates.map(c => ({
      candidate_id: c.id,
      points: points[c.id] ?? 0,
    }))

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distribution }),
      })

      if (res.ok) {
        router.push('/complete')
        return
      }

      const data = await res.json()
      setError(data.error ?? '投票に失敗しました')
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  const ranks = computeRanks(candidates, points)

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PointsCounter remaining={remaining} total={TOTAL_POINTS} animateComplete={justCompleted} />

      {/* Candidate cards — no Card wrapper, each is its own card */}
      <div className="space-y-3">
        {candidates.map(c => (
          <CandidateRow
            key={c.id}
            candidate={c}
            value={points[c.id] ?? 0}
            remaining={remaining}
            rank={ranks[c.id]}
            onChange={val => handleChange(c.id, val)}
            disabled={submitting}
          />
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!isValid || submitting}
      >
        {submitting ? '送信中...' : '🎉 じゅんびOK！'}
      </Button>
    </form>
  )
}
