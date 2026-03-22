import { findAttempt, findTest, seedIfEmpty } from '@/lib/server/db'
import { jsonError, jsonOk } from '@/lib/server/http'

type Params = { params: Promise<{ attemptId: string }> }

export async function GET(_request: Request, ctx: Params) {
  seedIfEmpty()
  const { attemptId } = await ctx.params
  const a = findAttempt(attemptId)
  if (!a) return jsonError('Не найдено', 404)
  const t = findTest(a.testId)
  if (!t) return jsonError('Не найдено', 404)
  const total = Math.max(1, t.questions.length)
  const answered = new Set(a.answers.map((x) => x.questionId)).size
  const progress = Math.round((answered / total) * 100)
  return jsonOk({ progress, answers: a.answers })
}
