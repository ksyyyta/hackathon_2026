import { findUserByEmail, findUserById, seedIfEmpty, updateUser } from '@/lib/server/db'
import { jsonError, jsonOk, parseJson, requireUser } from '@/lib/server/http'

export async function GET(request: Request) {
  seedIfEmpty()
  const r = await requireUser(request)
  if (!r.ok) return r.response
  return jsonOk({
    id: r.user.id,
    email: r.user.email,
    name: r.user.name,
    avatar: r.user.avatar ?? null,
    role: r.user.role,
    createdAt: r.user.createdAt,
  })
}

export async function PATCH(request: Request) {
  seedIfEmpty()
  const r = await requireUser(request)
  if (!r.ok) return r.response
  try {
    const body = await parseJson<{ name?: string; email?: string; avatar?: string | null }>(request)
    if (body.email && body.email.toLowerCase() !== r.user.email.toLowerCase()) {
      const taken = findUserByEmail(body.email)
      if (taken && taken.id !== r.user.id) {
        return jsonError('Email уже занят', 409)
      }
    }
    updateUser(r.user.id, {
      ...(body.name != null ? { name: body.name } : {}),
      ...(body.email != null ? { email: body.email } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'avatar')
        ? { avatar: body.avatar ?? null }
        : {}),
    })
    const fresh = findUserById(r.user.id)!
    return jsonOk({
      id: fresh.id,
      email: fresh.email,
      name: fresh.name,
      avatar: fresh.avatar ?? null,
      role: fresh.role,
      createdAt: fresh.createdAt,
    })
  } catch {
    return jsonError('Некорректный запрос', 400)
  }
}
