import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import VotingForm from '@/components/voting/VotingForm'

// Always server-render: reads cookies and live DB state
export const dynamic = 'force-dynamic'

export default async function VotingPage() {
  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('*')
    .single()

  if (settingsError || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">システムエラーが発生しました</p>
      </div>
    )
  }

  const title = settings.title || 'ランチ投票'

  if (settings.status === 'preparing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-gray-500">投票はまだ始まっていません</p>
        </div>
      </div>
    )
  }

  if (settings.status === 'closed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-gray-500">投票は締め切られました</p>
          <p className="text-sm text-gray-400">結果発表までお待ちください</p>
        </div>
      </div>
    )
  }

  // status === 'open': check if this browser has already voted
  const cookieStore = await cookies()
  const voterToken = cookieStore.get('voter_token')?.value

  if (voterToken) {
    // Verify against DB so that after a reset the user can vote again
    const { data: voter } = await supabase
      .from('voters')
      .select('id')
      .eq('voter_token', voterToken)
      .maybeSingle()

    if (voter) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-gray-500">すでに投票済みです</p>
            <p className="text-sm text-gray-400">結果発表までお待ちください</p>
          </div>
        </div>
      )
    }
  }

  const { data: candidates, error: candidatesError } = await supabase
    .from('candidates')
    .select('*')
    .order('sort_order', { ascending: true })

  if (candidatesError || !candidates) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">候補の取得に失敗しました</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-xl mx-auto max-w-xl py-8 px-4 space-y-6">
        <h1 className="text-2xl font-bold text-center">{title}</h1>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1 text-sm text-gray-700">
          <p className="font-bold text-base">🪙 コインを100枚持っています！</p>
          <p>行きたいお店に、好きなだけコインを配ってね。</p>
          <p>「ここ一択！」なら100枚全部でもOK！</p>
          <p>迷ったら、何店舗かに分けてもOK！</p>
          <p className="font-medium pt-1">コインを全部配り終えたら投票しよう！</p>
        </div>

        <VotingForm candidates={candidates} />
      </div>
    </div>
  )
}
