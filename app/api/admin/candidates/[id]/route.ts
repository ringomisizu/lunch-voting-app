import { NextRequest, NextResponse } from 'next/server'
import { verifySessionCookie } from '@/lib/session'
import { checkOrigin } from '@/lib/csrf'
import { supabase } from '@/lib/supabase'

async function authGuard(request: NextRequest) {
  if (!(await verifySessionCookie('admin')))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!checkOrigin(request))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

async function requirePreparing() {
  const { data: settings } = await supabase.from('settings').select('status').single()
  if (settings?.status !== 'preparing')
    return NextResponse.json({ error: '投票開始後は候補を変更できません' }, { status: 400 })
  return null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await authGuard(request)
  if (authErr) return authErr

  const prepErr = await requirePreparing()
  if (prepErr) return prepErr

  let body: { name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 })
  }

  const name = String(body.name ?? '').trim()
  if (!name) {
    return NextResponse.json({ error: '候補名を入力してください' }, { status: 400 })
  }

  const { id } = await params
  const { error } = await supabase.from('candidates').update({ name }).eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '同じ名前の候補がすでに存在します' }, { status: 400 })
    }
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await authGuard(request)
  if (authErr) return authErr

  const prepErr = await requirePreparing()
  if (prepErr) return prepErr

  const { id } = await params
  const { error } = await supabase.from('candidates').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
