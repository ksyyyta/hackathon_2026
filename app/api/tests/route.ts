import { randomUUID } from 'crypto'
import { getDb, insertTest, listTestsByOwner, seedIfEmpty } from '@/lib/server/db'
import { jsonError, jsonOk, parseJson, requireUser } from '@/lib/server/http'
import { toApiTest } from '@/lib/server/mappers'
import type { DbTest } from '@/lib/server/types'
import type { Test } from '@/lib/types'

export async function GET(request: Request) {
  seedIfEmpty()
  const r = await requireUser(request)
  if (!r.ok) return r.response
  const db = getDb()
  const list =
    r.user.role === 'admin'
      ? db.tests
      : listTestsByOwner(r.user.id)
  return jsonOk(list.map((t) => toApiTest(t)))
}

export async function POST(request: Request) {
  seedIfEmpty()
  const r = await requireUser(request)
  if (!r.ok) return r.response
  if (r.user.role !== 'psychologist' && r.user.role !== 'admin') {
    return jsonError('Forbidden', 403)
  }
  try {
    const body = await parseJson<Partial<Test>>(request)
    const now = new Date().toISOString()
    const t: DbTest = {
      id: randomUUID(),
      ownerId: r.user.id,
      title: body.title?.trim() || 'Новый тест',
      description: body.description ?? '',
      instruction: body.instruction ?? '',
      questions: body.questions ?? [],
      formulas: body.formulas ?? [],
      clientReportTemplate: body.clientReportTemplate,
      professionalReportTemplate: body.professionalReportTemplate,
      requiresPersonalData: body.requiresPersonalData ?? true,
      createdAt: now,
      updatedAt: now,
    }
    insertTest(t)
    return jsonOk(toApiTest(t))
  } catch {
    return jsonError('Некорректный запрос', 400)
  }
}
