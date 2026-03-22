import { findAttempt, seedIfEmpty } from '@/lib/server/db'
import { jsonError, jsonOk } from '@/lib/server/http'

type Params = { params: Promise<{ attemptId: string }> }

export async function GET(_request: Request, ctx: Params) {
  seedIfEmpty()
  const { attemptId } = await ctx.params
  const a = findAttempt(attemptId)
  if (!a) return jsonError('Не найдено', 404)
  if (a.status !== 'completed') {
    return jsonError('Тест не завершён', 400)
  }
  return jsonOk({
    metrics: a.metrics || [],
    interpretation: a.interpretation,
    canDownloadReport: true,
  })
}
