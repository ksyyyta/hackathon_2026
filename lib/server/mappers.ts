import type { Attempt, Psychologist, Test } from '@/lib/types'
import type { DbAttempt, DbTest, DbUser } from './types'
import { listAttemptsByTest } from './db'

export function toApiTest(t: DbTest, attemptsCount?: number): Test {
  const count = attemptsCount ?? listAttemptsByTest(t.id).length
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    instruction: t.instruction,
    questions: t.questions,
    metrics: t.metrics ?? [],
    clientReportTemplate: t.clientReportTemplate,
    professionalReportTemplate: t.professionalReportTemplate,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    attemptsCount: count,
    requiresPersonalData: t.requiresPersonalData,
  }
}

export function toApiAttempt(
  a: DbAttempt,
  testTitle: string,
  opts?: { includeAnswers?: boolean; metrics?: boolean }
): Attempt {
  const includeAnswers = opts?.includeAnswers !== false
  return {
    id: a.id,
    testId: a.testId,
    testTitle,
    clientName: a.clientName,
    clientEmail: a.clientEmail,
    clientAge: a.clientAge,
    status: a.status,
    startedAt: a.startedAt,
    completedAt: a.completedAt,
    answers: includeAnswers ? a.answers : [],
    metrics: opts?.metrics === false ? undefined : a.metrics,
    ...(a.questionSnapshot?.length ? { questions: a.questionSnapshot } : {}),
  }
}

export function toPsychologistRow(u: DbUser, testsCount: number): Psychologist {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    isBlocked: u.blocked,
    createdAt: u.createdAt,
    testsCount,
  }
}
