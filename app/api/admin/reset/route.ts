import { NextRequest, NextResponse } from 'next/server'
import { verifySessionCookie } from '@/lib/session'
import { checkOrigin } from '@/lib/csrf'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  if (!(await verifySessionCookie('admin'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.rpc('reset_votes')

  if (error) {
    return NextResponse.json({ error: 'リセットに失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
