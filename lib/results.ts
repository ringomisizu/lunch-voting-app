import type { CandidateResult, ResultsData } from './types'

interface CandidateWithPoints {
  candidate_id: string
  name: string
  total_points: number
}

/**
 * Sort candidates by total_points DESC, assign ranks (ties share the same rank),
 * then split into top3 (rank ≤ 3), reference (4 ≤ rank ≤ 6), carryover (rank > 6).
 * Ties at rank 6 automatically fall into reference because they share rank 6.
 */
export function classifyResults(candidates: CandidateWithPoints[]): ResultsData {
  const sorted = [...candidates].sort((a, b) => b.total_points - a.total_points)

  let currentRank = 1
  const withRanks: CandidateResult[] = sorted.map((c, i) => {
    if (i > 0 && c.total_points < sorted[i - 1].total_points) {
      currentRank = i + 1
    }
    return { ...c, rank: currentRank }
  })

  return {
    top3:      withRanks.filter(c => c.rank <= 3),
    reference: withRanks.filter(c => c.rank >= 4 && c.rank <= 6),
    carryover: withRanks.filter(c => c.rank > 6),
  }
}
