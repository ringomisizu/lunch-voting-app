export type VotingStatus = 'preparing' | 'open' | 'closed'

export interface Settings {
  id: true
  title: string
  status: VotingStatus
  results_published: boolean
  created_at: string
  updated_at: string
}

export interface Candidate {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export interface Voter {
  id: string
  voter_token: string
  voted_at: string
}

export interface Vote {
  id: string
  voter_id: string
  candidate_id: string
  points: number
  created_at: string
}

export interface VoteDistributionItem {
  candidate_id: string
  points: number
}

export interface CandidateResult {
  candidate_id: string
  name: string
  total_points: number
  rank: number
}

export interface ResultsData {
  top3: CandidateResult[]
  reference: CandidateResult[]
  carryover: CandidateResult[]
}
