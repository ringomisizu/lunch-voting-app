import { NextRequest, NextResponse } from 'next/server'
import { verifySessionCookie } from '@/lib/session'
import { checkOrigin } from '@/lib/csrf'
import { supabase } from '@/lib/supabase'

export async function GET() {
  if (!(await verifySessionCookie('admin'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ candidates: data })
}

export async function POST(request: NextRequest) {
  if (!(await verifySessionCookie('admin'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: settings } = await supabase.from('settings').select('status').single()
  if (settings?.status !== 'preparing') {
    return NextResponse.json({ error: '投票開始後は候補を変更できません' }, { status: 400 })
  }

  let body: { name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 })
  }

  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json({ error: '候補名を入力してください' }, { status: 400 })
  }
  if (name.length > 100) {
    return NextResponse.json({ error: '候補名は100文字以内で入力してください' }, { status: 400 })
  }

  const { count } = await supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true })
  if (count !== null && count >= 15) {
    return NextResponse.json({ error: '候補は最大15件まで登録できます' }, { status: 400 })
  }

  const { data: maxData } = await supabase
    .from('candidates')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = (maxData?.[0]?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('candidates')
    .insert({ name, sort_order: nextOrder })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'その候補名はすでに登録されています' }, { status: 400 })
    }
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ candidate: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  if (!(await verifySessionCookie('admin'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: settings } = await supabase.from('settings').select('status').single()
  if (settings?.status !== 'preparing') {
    return NextResponse.json({ error: '投票開始後は候補を変更できません' }, { status: 400 })
  }

  let body: { order?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 })
  }

  if (!Array.isArray(body.order) || body.order.length === 0) {
    return NextResponse.json({ error: '並び順が不正です' }, { status: 400 })
  }

  const results = await Promise.all(
    body.order.map((id, index) =>
      supabase.from('candidates').update({ sort_order: index }).eq('id', id)
    )
  )

  const failed = results.find(r => r.error)
  if (failed) {
    return NextResponse.json({ error: '並べ替えに失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
