import { deleteTest, findTest, seedIfEmpty, updateTest } from '@/lib/server/db'
import { jsonError, jsonOk, parseJson, requireUser } from '@/lib/server/http'
import { toApiTest } from '@/lib/server/mappers'
import type { Test } from '@/lib/types'

function allow(ownerId: string, userId: string, role: string) {
  return role === 'admin' || ownerId === userId
}

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, ctx: Params) {
  seedIfEmpty()
  const r = await requireUser(request)
  if (!r.ok) return r.response
  const { id } = await ctx.params
  const t = findTest(id)
  if (!t || !allow(t.ownerId, r.user.id, r.user.role)) {
    return jsonError('Не найдено', 404)
  }
  return jsonOk(toApiTest(t))
}

export async function PUT(request: Request, ctx: Params) {
  seedIfEmpty()
  const r = await requireUser(request)
  if (!r.ok) return r.response
  const { id } = await ctx.params
  const t = findTest(id)
  if (!t || !allow(t.ownerId, r.user.id, r.user.role)) {
    return jsonError('Не найдено', 404)
  }
  try {
    const body = await parseJson<Partial<Test>>(request)
    const now = new Date().toISOString()
    updateTest(id, {
      title: body.title ?? t.title,
      description: body.description ?? t.description,
      instruction: body.instruction ?? t.instruction,
      questions: body.questions ?? t.questions,
      formulas: body.formulas ?? t.formulas,
      clientReportTemplate: body.clientReportTemplate ?? t.clientReportTemplate,
      professionalReportTemplate: body.professionalReportTemplate ?? t.professionalReportTemplate,
      requiresPersonalData: body.requiresPersonalData ?? t.requiresPersonalData,
      updatedAt: now,
    })
    return jsonOk(toApiTest(findTest(id)!))
  } catch {
    return jsonError('Некорректный запрос', 400)
  }
}

export async function DELETE(request: Request, ctx: Params) {
  seedIfEmpty()
  const r = await requireUser(request)
  if (!r.ok) return r.response
  const { id } = await ctx.params
  const t = findTest(id)
  if (!t || !allow(t.ownerId, r.user.id, r.user.role)) {
    return jsonError('Не найдено', 404)
  }
  deleteTest(id)
  return new Response(null, { status: 204 })
}
