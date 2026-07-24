import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import { supabase } from '@/lib/supabase'
import { checkOrigin } from '@/lib/csrf'

const VOTER_COOKIE = 'voter_token'

function voterCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  }
}

// Map PostgreSQL RAISE EXCEPTION messages to user-facing Japanese strings
const DB_ERROR_MESSAGES: Record<string, string> = {
  VOTING_NOT_OPEN:      '投票は受付中ではありません',
  VOTING_CLOSED:        '投票の受付が終了しました',
  INVALID_DISTRIBUTION: '配分データが不正です',
  INVALID_CANDIDATE:    '無効な候補が含まれています',
  DUPLICATE_CANDIDATE:  '候補IDが重複しています',
  INVALID_POINTS:       'ポイントは整数で入力してください',
  POINTS_OUT_OF_RANGE:  'ポイントは0〜100の範囲で入力してください',
  INVALID_TOTAL_POINTS: '合計が100ポイントになるように配分してください',
}

export async function POST(request: NextRequest) {
  // CSRF: same-origin check
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Lightweight double-vote check via cookie (verified against DB)
  const cookieStore = await cookies()
  const existingToken = cookieStore.get(VOTER_COOKIE)?.value
  if (existingToken) {
    const { data: voter } = await supabase
      .from('voters')
      .select('id')
      .eq('voter_token', existingToken)
      .maybeSingle()
    if (voter) {
      return NextResponse.json({ error: 'すでに投票済みです' }, { status: 400 })
    }
  }

  let body: { distribution?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 })
  }

  const { distribution } = body

  // Basic structure check before hitting the DB
  if (!Array.isArray(distribution) || distribution.length === 0) {
    return NextResponse.json({ error: '配分データが不正です' }, { status: 400 })
  }

  const voterToken = randomUUID()

  const { error } = await supabase.rpc('submit_vote', {
    p_voter_token: voterToken,
    p_distribution: distribution,
  })

  if (error) {
    // Map known DB error codes to user-friendly messages
    const knownMessage = DB_ERROR_MESSAGES[error.message]
    if (knownMessage) {
      const isStateConflict =
        error.message === 'VOTING_NOT_OPEN' || error.message === 'VOTING_CLOSED'
      return NextResponse.json(
        { error: knownMessage },
        { status: isStateConflict ? 409 : 400 }
      )
    }
    // Unknown / unexpected DB error — don't expose internal details
    console.error('[vote] unexpected DB error:', error)
    return NextResponse.json({ error: '投票に失敗しました' }, { status: 500 })
  }

  // Success: mark this browser as voted via httpOnly cookie
  const response = NextResponse.json({ ok: true })
  response.cookies.set(VOTER_COOKIE, voterToken, voterCookieOptions())
  return response
}
