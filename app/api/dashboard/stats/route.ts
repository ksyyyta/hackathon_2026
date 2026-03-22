import { findTest, getDb, seedIfEmpty } from '@/lib/server/db'
import { jsonOk, requireUser } from '@/lib/server/http'
import { toApiAttempt } from '@/lib/server/mappers'

export async function GET(request: Request) {
  seedIfEmpty()
  const r = await requireUser(request)
  if (!r.ok) return r.response
  const db = getDb()
  const testIds = new Set(
    r.user.role === 'admin'
      ? db.tests.map((t) => t.id)
      : db.tests.filter((t) => t.ownerId === r.user.id).map((t) => t.id)
  )
  const attempts = db.attempts.filter((a) => testIds.has(a.testId))
  const completed = attempts.filter((a) => a.status === 'completed')
  const recent = [...attempts]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 10)
    .map((a) => {
      const t = findTest(a.testId)
      return toApiAttempt(a, t?.title || 'Тест', { includeAnswers: false, metrics: false })
    })
  const totalTests =
    r.user.role === 'admin'
      ? db.tests.length
      : db.tests.filter((t) => t.ownerId === r.user.id).length

  return jsonOk({
    totalTests,
    totalAttempts: attempts.length,
    completedAttempts: completed.length,
    recentAttempts: recent,
  })
}
