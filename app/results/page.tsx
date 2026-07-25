import { verifySessionCookie } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import { classifyResults } from '@/lib/results'
import ResultsLoginForm from '@/components/results/ResultsLoginForm'
import RankingList from '@/components/results/RankingList'

export const dynamic = 'force-dynamic'

export default async function ResultsPage() {
  const isAuthenticated = await verifySessionCookie('results')
  if (!isAuthenticated) {
    return <ResultsLoginForm />
  }

  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('title, results_published')
    .single()

  if (settingsError || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">システムエラーが発生しました</p>
      </div>
    )
  }

  if (!settings.results_published) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold">{settings.title || 'ランチ投票'}</h1>
          <p className="text-gray-500">結果はまだ公開されていません</p>
          <p className="text-sm text-gray-400">管理者が公開するまでお待ちください</p>
        </div>
      </div>
    )
  }

  // Fetch candidates and votes to compute aggregate results
  const [{ data: candidates }, { data: votes }] = await Promise.all([
    supabase.from('candidates').select('id, name').order('sort_order', { ascending: true }),
    supabase.from('votes').select('candidate_id, points'),
  ])

  const pointsMap: Record<string, number> = {}
  for (const v of votes ?? []) {
    pointsMap[v.candidate_id] = (pointsMap[v.candidate_id] ?? 0) + v.points
  }

  const candidatesWithPoints = (candidates ?? []).map(c => ({
    candidate_id: c.id,
    name: c.name,
    total_points: pointsMap[c.id] ?? 0,
  }))

  const { top3, reference, carryover } = classifyResults(candidatesWithPoints)
  const allRanked = [...top3, ...reference, ...carryover]

  const title = settings.title || 'ランチ投票'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto py-10 px-4 space-y-6">
        <h1 className="text-2xl font-bold text-center">{title} — 結果</h1>

        {allRanked.length > 0 ? (
          <RankingList candidates={allRanked} />
        ) : (
          <p className="text-center text-gray-400">投票データがありません</p>
        )}
      </div>
    </div>
  )
}
