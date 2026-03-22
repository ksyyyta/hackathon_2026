import { findUserById, seedIfEmpty, updateUser } from '@/lib/server/db'
import { jsonError, jsonOk, parseJson, requireAdmin } from '@/lib/server/http'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, ctx: Params) {
  seedIfEmpty()
  const r = await requireAdmin(request)
  if (!r.ok) return r.response
  const { id } = await ctx.params
  if (id === r.user.id) {
    return jsonError('Нельзя изменить свой аккаунт', 400)
  }
  const u = findUserById(id)
  if (!u || u.role !== 'psychologist') {
    return jsonError('Не найдено', 404)
  }
  try {
    const body = await parseJson<{ blocked?: boolean }>(request)
    if (typeof body.blocked !== 'boolean') {
      return jsonError('Некорректное тело запроса', 400)
    }
    updateUser(id, { blocked: body.blocked })
    return jsonOk({})
  } catch {
    return jsonError('Некорректный запрос', 400)
  }
}
