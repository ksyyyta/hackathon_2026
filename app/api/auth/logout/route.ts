import { NextResponse } from 'next/server'

import { clearRefreshCookieOnResponse } from '@/lib/server/auth'

export async function POST() {
  const res = NextResponse.json({})
  clearRefreshCookieOnResponse(res)
  return res
}
