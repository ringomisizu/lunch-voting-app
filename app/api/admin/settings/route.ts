import { NextRequest, NextResponse } from 'next/server'
import { verifySessionCookie } from '@/lib/session'
import { checkOrigin } from '@/lib/csrf'
import { supabase } from '@/lib/supabase'

export async function GET() {
  if (!(await verifySessionCookie('admin'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [settingsResult, voterCountResult] = await Promise.all([
    supabase.from('settings').select('*').single(),
    supabase.from('voters').select('*', { count: 'exact', head: true }),
  ])

  if (settingsResult.error) {
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({
    settings: settingsResult.data,
    voterCount: voterCountResult.count ?? 0,
  })
}

export async function PATCH(request: NextRequest) {
  if (!(await verifySessionCookie('admin'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { title?: string; status?: string; results_published?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.title !== undefined) {
    updates.title = String(body.title).slice(0, 100)
  }

  if (body.status !== undefined) {
    const validStatuses = ['preparing', 'open', 'closed']
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: '無効なステータスです' }, { status: 400 })
    }

    if (body.status === 'open') {
      const [{ count }, { data: current }] = await Promise.all([
        supabase.from('candidates').select('*', { count: 'exact', head: true }),
        supabase.from('settings').select('status').single(),
      ])
      if (current?.status !== 'preparing') {
        return NextResponse.json({ error: '投票は既に開始されています' }, { status: 400 })
      }
      if (count === null || count < 10 || count > 15) {
        return NextResponse.json(
          { error: `候補は10件以上15件以下で登録してください（現在 ${count ?? 0} 件）` },
          { status: 400 }
        )
      }
    }

    updates.status = body.status
  }

  if (body.results_published !== undefined) {
    updates.results_published = Boolean(body.results_published)
  }

  const { error } = await supabase.from('settings').update(updates).eq('id', true)

  if (error) {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
