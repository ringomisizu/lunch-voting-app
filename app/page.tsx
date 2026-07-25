import Image from 'next/image'
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
      <div className="max-w-xl mx-auto">

        {/* Hero image — full width of the container, no side padding */}
        <div className="relative h-44 sm:h-56 bg-amber-50 rounded-b-2xl overflow-hidden">
          <Image
            src="/coin-hero.png"
            alt={title}
            fill
            sizes="(max-width: 576px) 100vw, 576px"
            className="object-contain"
            priority
          />
        </div>

        <div className="px-4 pt-6 pb-10 space-y-6">
          <h1 className="text-2xl font-bold text-center">{title}</h1>

          {/* 使い方 */}
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-4 space-y-4 text-sm">
            <p className="font-bold text-base text-gray-900">🍽️ 使い方</p>

            <div className="space-y-1">
              <p className="font-semibold text-gray-800">① 候補のお店にコインを配ろう</p>
              <p className="text-gray-500">
                100枚のコインを、<br />
                行きたいお店の候補へ自由に配ろう！
              </p>
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-gray-800">② 準備OK！</p>
              <p className="text-gray-500">
                コインを全部配ったら<br />
                「🎉 じゅんびOK！」を押して投票！
              </p>
            </div>
          </div>

          <VotingForm candidates={candidates} />
        </div>
      </div>
    </div>
  )
}
