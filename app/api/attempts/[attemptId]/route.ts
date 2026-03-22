import { findAttempt, findTest, seedIfEmpty } from '@/lib/server/db'
import { jsonError, jsonOk, requireUser } from '@/lib/server/http'
import { toApiAttempt } from '@/lib/server/mappers'

type Params = { params: Promise<{ attemptId: string }> }

export async function GET(request: Request, ctx: Params) {
  seedIfEmpty()
  const r = await requireUser(request)
  if (!r.ok) return r.response
  const { attemptId } = await ctx.params
  const a = findAttempt(attemptId)
  if (!a) return jsonError('Не найдено', 404)
  const t = findTest(a.testId)
  if (!t) return jsonError('Не найдено', 404)
  if (r.user.role !== 'admin' && a.ownerId !== r.user.id) {
    return jsonError('Forbidden', 403)
  }
  return jsonOk(toApiAttempt(a, t.title, { includeAnswers: true, metrics: true }))
}
