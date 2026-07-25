'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Candidate } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import CandidateRow from './CandidateRow'
import PointsCounter from './PointsCounter'

const TOTAL_POINTS = 100

interface Props {
  candidates: Candidate[]
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PointsCounter remaining={remaining} total={TOTAL_POINTS} />

      <Card>
        <CardContent className="pt-2 pb-2">
          {candidates.map(c => (
            <CandidateRow
              key={c.id}
              candidate={c}
              value={points[c.id] ?? 0}
              remaining={remaining}
              onChange={val => handleChange(c.id, val)}
              disabled={submitting}
            />
          ))}
        </CardContent>
      </Card>

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
        {submitting ? '送信中...' : 'この内容で投票する'}
      </Button>
    </form>
  )
}
