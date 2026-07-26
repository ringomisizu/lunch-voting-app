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

      {/* Hero image — wider container (max-w-5xl), natural portrait aspect ratio */}
      <div className="w-full max-w-5xl mx-auto bg-amber-50 rounded-b-2xl overflow-hidden">
        <Image
          src="/coin-hero.png"
          alt={title}
          width={1024}
          height={1536}
          className="w-full h-auto object-contain block"
          style={{ maxHeight: '480px' }}
          priority
          sizes="(max-width: 576px) 100vw, (max-width: 1024px) 80vw, 1100px"
        />
      </div>

      <div className="max-w-xl mx-auto">
        <div className="px-4 pt-6 pb-10 space-y-6">
          <h1 className="text-2xl font-bold text-center">{title}</h1>

          <VotingForm candidates={candidates} />
        </div>
      </div>
    </div>
  )
}
