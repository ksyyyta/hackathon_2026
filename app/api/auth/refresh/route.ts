import { NextResponse } from 'next/server'

import { findUserById, seedIfEmpty } from '@/lib/server/db'
import {
  clearRefreshCookieOnResponse,
  getRefreshFromCookie,
  signAccessToken,
  verifyRefreshToken,
} from '@/lib/server/auth'
import { jsonError, jsonOk } from '@/lib/server/http'

function unauthorizedWithClearedCookie() {
  const res = NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  clearRefreshCookieOnResponse(res)
  return res
}

export async function POST() {
  seedIfEmpty()
  const refresh = await getRefreshFromCookie()
  if (!refresh) return unauthorizedWithClearedCookie()
  try {
    const { sub } = await verifyRefreshToken(refresh)
    const user = findUserById(sub)
    if (!user || user.blocked) {
      return unauthorizedWithClearedCookie()
    }
    const token = await signAccessToken(user)
    return jsonOk({ token })
  } catch {
    return unauthorizedWithClearedCookie()
  }
}
