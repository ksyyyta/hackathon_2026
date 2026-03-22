import type { Answer } from '@/lib/types'
import { findAttempt, seedIfEmpty, updateAttempt } from '@/lib/server/db'
import { jsonError, jsonOk, parseJson } from '@/lib/server/http'

type Params = { params: Promise<{ attemptId: string }> }

export async function POST(request: Request, ctx: Params) {
  seedIfEmpty()
  const { attemptId } = await ctx.params
  const a = findAttempt(attemptId)
  if (!a || a.status !== 'in_progress') {
    return jsonError('Прохождение недоступно', 400)
  }
  try {
    const body = await parseJson<{ answers?: Answer[] }>(request)
    const incoming = body.answers || []
    const map = new Map(a.answers.map((x) => [x.questionId, x]))
    for (const x of incoming) {
      map.set(x.questionId, x)
    }
    updateAttempt(attemptId, { answers: [...map.values()] })
    return jsonOk({})
  } catch {
    return jsonError('Некорректный запрос', 400)
  }
}
