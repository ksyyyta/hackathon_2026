import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'
import type { DbUser } from './types'

const ACCESS_TTL = '15m'
const REFRESH_TTL = '7d'

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET || 'dev-secret-change-in-production'
  return new TextEncoder().encode(s)
}

function getRefreshSecret(): Uint8Array {
  const s = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev-refresh-secret'
  return new TextEncoder().encode(s)
}

export async function signAccessToken(user: Pick<DbUser, 'id' | 'role'>): Promise<string> {
  return new SignJWT({ sub: user.id, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(getSecret())
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, typ: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TTL)
    .sign(getRefreshSecret())
}

export async function verifyAccessToken(token: string): Promise<{ sub: string; role: string }> {
  const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] })
  const sub = String(payload.sub || '')
  const role = String(payload.role || '')
  if (!sub || !role) throw new Error('Invalid token')
  return { sub, role }
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, getRefreshSecret(), { algorithms: ['HS256'] })
  if (payload.typ !== 'refresh') throw new Error('Invalid refresh')
  const sub = String(payload.sub || '')
  if (!sub) throw new Error('Invalid refresh')
  return { sub }
}

const REFRESH_COOKIE = 'refreshToken'

const REFRESH_MAX_AGE = 60 * 60 * 24 * 7

function refreshCookieOpts(maxAge: number) {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  }
}

/** В Route Handler обязательно вешать cookie на тот же NextResponse, что и JSON — иначе Set-Cookie не уходит в браузер. */
export function attachRefreshCookieToResponse(res: NextResponse, token: string) {
  res.cookies.set(REFRESH_COOKIE, token, refreshCookieOpts(REFRESH_MAX_AGE))
}

export function clearRefreshCookieOnResponse(res: NextResponse) {
  res.cookies.set(REFRESH_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
}

export async function getRefreshFromCookie(): Promise<string | undefined> {
  const jar = await cookies()
  return jar.get(REFRESH_COOKIE)?.value
}

export function authHeader(request: Request): string | null {
  const h = request.headers.get('authorization')
  if (!h?.startsWith('Bearer ')) return null
  return h.slice(7)
}
