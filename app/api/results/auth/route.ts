import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, recordFailedAttempt, clearFailedAttempts } from '@/lib/rate-limit'
import { createSessionToken, cookieName, cookieOptions } from '@/lib/session'

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'

  const { allowed, retryAfterMs } = checkRateLimit(ip)
  if (!allowed) {
    return NextResponse.json(
      { error: '試行回数が多すぎます。しばらく待ってからお試しください。' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((retryAfterMs ?? 0) / 1000)) },
      }
    )
  }

  let body: { password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 })
  }

  if (!process.env.RESULTS_PASSWORD) {
    console.error('RESULTS_PASSWORD is not set')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  if (body.password !== process.env.RESULTS_PASSWORD) {
    recordFailedAttempt(ip)
    return NextResponse.json({ error: 'パスワードが正しくありません' }, { status: 401 })
  }

  clearFailedAttempts(ip)
  const token = createSessionToken('results')

  const response = NextResponse.json({ ok: true })
  response.cookies.set(cookieName('results'), token, cookieOptions())
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(cookieName('results'), '', { maxAge: 0, httpOnly: true, path: '/' })
  return response
}
