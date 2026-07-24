import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

const SESSION_SECRET = process.env.SESSION_SECRET ?? ''
const SESSION_MAX_AGE = 60 * 60 * 8 // 8 hours

export type SessionRole = 'admin' | 'results'

interface SessionPayload {
  role: SessionRole
  exp: number
}

function sign(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', SESSION_SECRET).update(data).digest('base64url')
  return `${data}.${sig}`
}

function verify(token: string, role: SessionRole): boolean {
  if (!SESSION_SECRET) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [data, sig] = parts
  const expected = createHmac('sha256', SESSION_SECRET).update(data).digest('base64url')
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false
  } catch {
    return false
  }
  try {
    const payload: SessionPayload = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf-8')
    )
    if (payload.role !== role) return false
    if (Date.now() / 1000 > payload.exp) return false
    return true
  } catch {
    return false
  }
}

export function createSessionToken(role: SessionRole): string {
  return sign({ role, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE })
}

export function cookieName(role: SessionRole): string {
  return `session_${role}`
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  }
}

export async function verifySessionCookie(role: SessionRole): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(cookieName(role))?.value
  if (!token) return false
  return verify(token, role)
}
