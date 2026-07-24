import { NextRequest, NextResponse } from 'next/server'
import { verifySessionCookie } from '@/lib/session'
import { checkOrigin } from '@/lib/csrf'
import { supabase } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params

  const { error } = await supabase.from('candidates').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
