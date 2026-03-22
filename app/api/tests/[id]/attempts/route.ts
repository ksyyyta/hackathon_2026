import { findTest, listAttemptsByTest, seedIfEmpty } from '@/lib/server/db'
import { jsonError, jsonOk, requireUser } from '@/lib/server/http'
import { toApiAttempt } from '@/lib/server/mappers'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, ctx: Params) {
  seedIfEmpty()
  const r = await requireUser(request)
  if (!r.ok) return r.response
  const { id } = await ctx.params
  const t = findTest(id)
  if (!t || (r.user.role !== 'admin' && t.ownerId !== r.user.id)) {
    return jsonError('Не найдено', 404)
  }
  const rows = listAttemptsByTest(id)
  const out = rows.map((a) =>
    toApiAttempt(a, t.title, { includeAnswers: false, metrics: true })
  )
  return jsonOk(out)
}
