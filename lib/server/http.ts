import { NextResponse } from 'next/server'
import { findUserById, seedIfEmpty } from './db'
import { authHeader, verifyAccessToken } from './auth'
import type { DbUser } from './types'

export function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status })
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data as T, { status })
}

export async function parseJson<T>(request: Request): Promise<T> {
  return request.json() as Promise<T>
}

export async function requireUser(request: Request): Promise<
  | { ok: true; user: DbUser }
  | { ok: false; response: NextResponse }
> {
  seedIfEmpty()
  const token = authHeader(request)
  if (!token) {
    return { ok: false, response: jsonError('Unauthorized', 401) }
  }
  try {
    const { sub } = await verifyAccessToken(token)
    const user = findUserById(sub)
    if (!user || user.blocked) {
      return { ok: false, response: jsonError('Unauthorized', 401) }
    }
    return { ok: true, user }
  } catch {
    return { ok: false, response: jsonError('Unauthorized', 401) }
  }
}

export async function requirePsychologist(request: Request): Promise<
  | { ok: true; user: DbUser }
  | { ok: false; response: NextResponse }
> {
  const r = await requireUser(request)
  if (!r.ok) return r
  if (r.user.role !== 'psychologist' && r.user.role !== 'admin') {
    return { ok: false, response: jsonError('Forbidden', 403) }
  }
  return r
}

export async function requireAdmin(request: Request): Promise<
  | { ok: true; user: DbUser }
  | { ok: false; response: NextResponse }
> {
  const r = await requireUser(request)
  if (!r.ok) return r
  if (r.user.role !== 'admin') {
    return { ok: false, response: jsonError('Forbidden', 403) }
  }
  return r
}
