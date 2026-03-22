import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'

import {
  findUserByEmail,
  hashPassword,
  insertUser,
  seedIfEmpty,
} from '@/lib/server/db'
import { jsonError, parseJson } from '@/lib/server/http'
import {
  attachRefreshCookieToResponse,
  signAccessToken,
  signRefreshToken,
} from '@/lib/server/auth'
import type { DbUser } from '@/lib/server/types'

export async function POST(request: Request) {
  seedIfEmpty()
  try {
    const body = await parseJson<{ name?: string; email?: string; password?: string }>(request)
    if (!body.email || !body.password) {
      return jsonError('Email и пароль обязательны', 400)
    }
    const email = body.email.trim().toLowerCase()
    if (findUserByEmail(email)) {
      return jsonError('Пользователь с таким email уже зарегистрирован', 409)
    }
    if (body.password.length < 6) {
      return jsonError('Пароль должен быть минимум 6 символов', 400)
    }
    const name = (body.name || '').trim()
    if (!name) {
      return jsonError('Укажите фамилию, имя и отчество', 400)
    }
    if (name.split(/\s+/).filter(Boolean).length < 3) {
      return jsonError('Укажите фамилию, имя и отчество полностью', 400)
    }

    const user: DbUser = {
      id: randomUUID(),
      email,
      passwordHash: hashPassword(body.password),
      name,
      avatar: null,
      role: 'psychologist',
      blocked: false,
      createdAt: new Date().toISOString(),
    }
    insertUser(user)

    const token = await signAccessToken(user)
    const refresh = await signRefreshToken(user.id)

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar ?? null,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    })
    attachRefreshCookieToResponse(res, refresh)
    return res
  } catch {
    return jsonError('Некорректный запрос', 400)
  }
}
