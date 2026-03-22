import { randomUUID } from 'crypto'
import { findLinkByToken, findTest, insertAttempt, seedIfEmpty } from '@/lib/server/db'
import { jsonError, jsonOk, parseJson } from '@/lib/server/http'

type Params = { params: Promise<{ token: string }> }

export async function POST(request: Request, ctx: Params) {
  seedIfEmpty()
  const { token } = await ctx.params
  const link = findLinkByToken(token)
  if (!link) return jsonError('Тест не найден', 404)
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return jsonError('Ссылка недействительна', 410)
  }
  const t = findTest(link.testId)
  if (!t) return jsonError('Тест не найден', 404)
  try {
    const body = await parseJson<{ name?: string; email?: string; age?: number }>(request)
    const requires = t.requiresPersonalData
    const name = (body.name || '').trim() || 'Гость'
    if (requires && name.length < 2) {
      return jsonError('Введите имя', 400)
    }
    const now = new Date().toISOString()
    const attemptId = randomUUID()
    insertAttempt({
      id: attemptId,
      testId: t.id,
      ownerId: t.ownerId,
      linkToken: token,
      clientName: name,
      clientEmail: body.email,
      clientAge: body.age,
      status: 'in_progress',
      startedAt: now,
      answers: [],
      questionSnapshot: [...t.questions],
    })
    return jsonOk({ attemptId })
  } catch {
    return jsonError('Некорректный запрос', 400)
  }
}
