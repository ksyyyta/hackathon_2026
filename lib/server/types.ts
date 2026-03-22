import type { Answer, Formula, Metric, Question, TestMetric } from '@/lib/types'

export interface DbUser {
  id: string
  email: string
  passwordHash: string
  name: string
  avatar?: string | null
  role: 'psychologist' | 'admin'
  blocked: boolean
  createdAt: string
}

export interface DbTest {
  id: string
  ownerId: string
  title: string
  description: string
  instruction: string
  questions: Question[]
  metrics?: TestMetric[]
  formulas?: Formula[]
  clientReportTemplate?: string
  professionalReportTemplate?: string
  requiresPersonalData: boolean
  showClientReport?: boolean
  createdAt: string
  updatedAt: string
}

export interface DbLink {
  token: string
  testId: string
  ownerId: string
  expiresAt?: string
}

export interface DbAttempt {
  id: string
  testId: string
  ownerId: string
  linkToken: string
  clientName: string
  clientEmail?: string
  clientAge?: number
  status: 'in_progress' | 'completed'
  startedAt: string
  completedAt?: string
  answers: Answer[]
  metrics?: Metric[]
  interpretation?: string
  questionSnapshot?: Question[]
}

export interface Database {
  users: DbUser[]
  tests: DbTest[]
  links: DbLink[]
  attempts: DbAttempt[]
}
