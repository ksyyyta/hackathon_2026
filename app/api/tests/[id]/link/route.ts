import { randomBytes } from 'crypto'
import { findTest, insertLink, seedIfEmpty } from '@/lib/server/db'
import { jsonError, jsonOk, requireUser } from '@/lib/server/http'
import { getPublicOrigin } from '@/lib/server/url'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, ctx: Params) {
  seedIfEmpty()
  const r = await requireUser(request)
  if (!r.ok) return r.response
  const { id } = await ctx.params
  const t = findTest(id)
  if (!t || (r.user.role !== 'admin' && t.ownerId !== r.user.id)) {
    return jsonError('Не найдено', 404)
  }
  const token = randomBytes(24).toString('hex')
  insertLink({
    token,
    testId: t.id,
    ownerId: t.ownerId,
  })
  const origin = getPublicOrigin(request)
  return jsonOk({
    token,
    url: `${origin}/test/${token}`,
  })
}
