import { findLinkByToken, findTest, seedIfEmpty } from '@/lib/server/db'
import { jsonError, jsonOk } from '@/lib/server/http'

type Params = { params: Promise<{ token: string }> }

export async function GET(_request: Request, ctx: Params) {
  seedIfEmpty()
  const { token } = await ctx.params
  const link = findLinkByToken(token)
  if (!link) return jsonError('Тест не найден', 404)
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return jsonError('Ссылка недействительна', 410)
  }
  const t = findTest(link.testId)
  if (!t) return jsonError('Тест не найден', 404)
  return jsonOk({
    id: t.id,
    title: t.title,
    description: t.description,
    instruction: t.instruction,
    questions: t.questions,
    requiresPersonalData: t.requiresPersonalData,
  })
}
