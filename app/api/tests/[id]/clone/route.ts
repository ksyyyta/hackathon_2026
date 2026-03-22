import { randomUUID } from 'crypto'
import { findTest, insertTest, seedIfEmpty } from '@/lib/server/db'
import { jsonError, jsonOk, requireUser } from '@/lib/server/http'
import { toApiTest } from '@/lib/server/mappers'
import type { DbTest } from '@/lib/server/types'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, ctx: Params) {
  seedIfEmpty()
  const r = await requireUser(request)
  if (!r.ok) return r.response
  const { id } = await ctx.params
  const src = findTest(id)
  if (!src || (r.user.role !== 'admin' && src.ownerId !== r.user.id)) {
    return jsonError('Не найдено', 404)
  }
  const now = new Date().toISOString()
  const copy: DbTest = {
    ...src,
    id: randomUUID(),
    title: `${src.title} (копия)`,
    createdAt: now,
    updatedAt: now,
  }
  insertTest(copy)
  return jsonOk(toApiTest(copy))
}
