import { findUserById, seedIfEmpty, deleteUser } from '@/lib/server/db'
import { jsonError, requireAdmin } from '@/lib/server/http'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(request: Request, ctx: Params) {
  seedIfEmpty()
  const r = await requireAdmin(request)
  if (!r.ok) return r.response
  const { id } = await ctx.params
  if (id === r.user.id) {
    return jsonError('Нельзя удалить самого себя', 400)
  }
  const u = findUserById(id)
  if (!u || u.role !== 'psychologist') {
    return jsonError('Не найдено', 404)
  }
  deleteUser(id)
  return new Response(null, { status: 204 })
}
