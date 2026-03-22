import { findAttempt, findTest, seedIfEmpty, updateAttempt } from '@/lib/server/db'
import { evaluateFormulas } from '@/lib/server/formulas'
import { evaluateMetrics } from '@/lib/server/metrics'
import { jsonError, jsonOk } from '@/lib/server/http'

type Params = { params: Promise<{ attemptId: string }> }

export async function POST(_request: Request, ctx: Params) {
  seedIfEmpty()
  const { attemptId } = await ctx.params
  const a = findAttempt(attemptId)
  if (!a || a.status !== 'in_progress') {
    return jsonError('Прохождение недоступно', 400)
  }
  const t = findTest(a.testId)
  if (!t) return jsonError('Не найдено', 404)

  const questions = a.questionSnapshot?.length ? a.questionSnapshot : t.questions || []
  const formulas = (t as { formulas?: { id: string; name: string; expression: string; description?: string }[] }).formulas
  const hasFormulas = formulas && formulas.length > 0
  const hasMetrics = t.metrics && t.metrics.length > 0

  let metrics: { name: string; value: number; raw?: number; description?: string }[]
  let interpretation: string | undefined

  if (hasFormulas && (!hasMetrics || !t.metrics)) {
    const result = evaluateFormulas(questions, formulas, a.answers)
    metrics = result.metrics
    interpretation = result.interpretation
  } else {
    const result = evaluateMetrics(t.metrics, a.answers)
    metrics = result.metrics
  }

  const now = new Date().toISOString()
  updateAttempt(attemptId, {
    status: 'completed',
    completedAt: now,
    metrics,
    interpretation,
  })
  return jsonOk({})
}
