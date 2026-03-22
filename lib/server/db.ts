import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto'
import {
  buildDemoMotivationTest,
  buildDemoProfOrientationTest,
  buildDemoTeamStyleTest,
  DEMO_LINK_TOKENS,
} from '@/lib/demo-public-tests'
import type { Database, DbAttempt, DbLink, DbTest, DbUser } from './types'

const DATA_DIR = join(process.cwd(), 'data')
const DB_PATH = join(DATA_DIR, 'app-db.json')

let memory: Database | null = null

function defaultDb(): Database {
  return { users: [], tests: [], links: [], attempts: [] }
}

function load(): Database {
  if (memory) return memory
  if (!existsSync(DB_PATH)) {
    memory = defaultDb()
    return memory
  }
  try {
    const raw = readFileSync(DB_PATH, 'utf-8')
    memory = JSON.parse(raw) as Database
    if (!memory.users) memory.users = []
    if (!memory.tests) memory.tests = []
    if (!memory.links) memory.links = []
    if (!memory.attempts) memory.attempts = []
    return memory
  } catch {
    memory = defaultDb()
    return memory
  }
}

function persist() {
  if (!memory) return
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(DB_PATH, JSON.stringify(memory, null, 2), 'utf-8')
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const check = scryptSync(password, salt, 64)
  const orig = Buffer.from(hash, 'hex')
  if (check.length !== orig.length) return false
  return timingSafeEqual(check, orig)
}

export function getDb(): Database {
  return load()
}

export function saveDb() {
  persist()
}

export function findUserByEmail(email: string): DbUser | undefined {
  return load().users.find((u) => u.email.toLowerCase() === email.toLowerCase())
}

export function findUserById(id: string): DbUser | undefined {
  return load().users.find((u) => u.id === id)
}

export function insertUser(user: DbUser) {
  load().users.push(user)
  persist()
}

export function updateUser(id: string, patch: Partial<DbUser>) {
  const u = load().users.find((x) => x.id === id)
  if (!u) return
  Object.assign(u, patch)
  persist()
}

export function deleteUser(id: string) {
  const db = load()
  const removedTestIds = new Set(db.tests.filter((t) => t.ownerId === id).map((t) => t.id))
  db.users = db.users.filter((u) => u.id !== id)
  db.tests = db.tests.filter((t) => t.ownerId !== id)
  db.links = db.links.filter((l) => l.ownerId !== id && !removedTestIds.has(l.testId))
  db.attempts = db.attempts.filter((a) => !removedTestIds.has(a.testId))
  persist()
}

export function listTestsByOwner(ownerId: string): DbTest[] {
  return load().tests.filter((t) => t.ownerId === ownerId)
}

export function findTest(id: string): DbTest | undefined {
  return load().tests.find((t) => t.id === id)
}

export function insertTest(test: DbTest) {
  load().tests.push(test)
  persist()
}

export function updateTest(id: string, patch: Partial<DbTest>) {
  const t = load().tests.find((x) => x.id === id)
  if (!t) return
  Object.assign(t, patch)
  persist()
}

export function deleteTest(id: string) {
  const db = load()
  db.tests = db.tests.filter((t) => t.id !== id)
  db.links = db.links.filter((l) => l.testId !== id)
  db.attempts = db.attempts.filter((a) => a.testId !== id)
  persist()
}

export function findLinkByToken(token: string): DbLink | undefined {
  return load().links.find((l) => l.token === token)
}

export function insertLink(link: DbLink) {
  load().links.push(link)
  persist()
}

export function findAttempt(id: string): DbAttempt | undefined {
  return load().attempts.find((a) => a.id === id)
}

export function listAttemptsByTest(testId: string): DbAttempt[] {
  return load().attempts.filter((a) => a.testId === testId)
}

export function insertAttempt(a: DbAttempt) {
  load().attempts.push(a)
  persist()
}

export function updateAttempt(id: string, patch: Partial<DbAttempt>) {
  const x = load().attempts.find((a) => a.id === id)
  if (!x) return
  Object.assign(x, patch)
  persist()
}

export function countTestsByOwner(ownerId: string): number {
  return load().tests.filter((t) => t.ownerId === ownerId).length
}

/** Примеры публичных тестов: /test/demo, /test/demo-proforientation, /test/demo-team */
export function ensureDemoPublicTests() {
  const db = load()
  const psycho = db.users.find((u) => u.email === 'psycho@psycho.com')
  if (!psycho) return

  const hasProfDemo =
    findLinkByToken(DEMO_LINK_TOKENS.profPrimary) || findLinkByToken(DEMO_LINK_TOKENS.profAlt)
  if (!hasProfDemo) {
    const t1 = buildDemoProfOrientationTest(psycho.id)
    insertTest(t1)
    insertLink({
      token: DEMO_LINK_TOKENS.profPrimary,
      testId: t1.id,
      ownerId: psycho.id,
    })
    insertLink({
      token: DEMO_LINK_TOKENS.profAlt,
      testId: t1.id,
      ownerId: psycho.id,
    })
  } else {
    const missingProfLink =
      !findLinkByToken(DEMO_LINK_TOKENS.profPrimary) || !findLinkByToken(DEMO_LINK_TOKENS.profAlt)
    if (missingProfLink) {
      const existing =
        findLinkByToken(DEMO_LINK_TOKENS.profPrimary) ||
        findLinkByToken(DEMO_LINK_TOKENS.profAlt)
      if (existing) {
        if (!findLinkByToken(DEMO_LINK_TOKENS.profPrimary)) {
          insertLink({
            token: DEMO_LINK_TOKENS.profPrimary,
            testId: existing.testId,
            ownerId: psycho.id,
          })
        }
        if (!findLinkByToken(DEMO_LINK_TOKENS.profAlt)) {
          insertLink({
            token: DEMO_LINK_TOKENS.profAlt,
            testId: existing.testId,
            ownerId: psycho.id,
          })
        }
      }
    }
  }

  if (!findLinkByToken(DEMO_LINK_TOKENS.team)) {
    const t2 = buildDemoTeamStyleTest(psycho.id)
    insertTest(t2)
    insertLink({
      token: DEMO_LINK_TOKENS.team,
      testId: t2.id,
      ownerId: psycho.id,
    })
  }

  if (!findLinkByToken(DEMO_LINK_TOKENS.motivation)) {
    const t3 = buildDemoMotivationTest(psycho.id)
    insertTest(t3)
    insertLink({
      token: DEMO_LINK_TOKENS.motivation,
      testId: t3.id,
      ownerId: psycho.id,
    })
  }
}

export function seedIfEmpty() {
  const db = load()
  if (db.users.length === 0) {
    const admin: DbUser = {
      id: randomUUID(),
      email: 'admin@admin.com',
      passwordHash: hashPassword('admin123'),
      name: 'Администратор',
      avatar: null,
      role: 'admin',
      blocked: false,
      createdAt: new Date().toISOString(),
    }
    const psycho: DbUser = {
      id: randomUUID(),
      email: 'psycho@psycho.com',
      passwordHash: hashPassword('psycho123'),
      name: 'Психолог Демо',
      avatar: null,
      role: 'psychologist',
      blocked: false,
      createdAt: new Date().toISOString(),
    }
    db.users.push(admin, psycho)
    persist()
  }
  ensureDemoPublicTests()
}
