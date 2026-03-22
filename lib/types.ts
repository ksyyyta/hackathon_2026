// User types
export interface User {
  id: string
  email: string
  name: string
  avatar?: string | null
  role: 'psychologist' | 'admin'
  createdAt: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

// Test types
export type QuestionType = 'single' | 'multiple' | 'scale' | 'open' | 'number'

export interface QuestionOption {
  id: string
  text: string
  weight: number
}

/** Показывать вопрос только если на родительский (single/multiple) выбран один из вариантов */
export interface QuestionShowIf {
  questionId: string
  optionIds: string[]
}

export interface Question {
  id: string
  type: QuestionType
  text: string
  required: boolean
  options: QuestionOption[]
  /** Заголовок раздела (блок) — показывается перед вопросом при смене */
  sectionTitle?: string
  showIf?: QuestionShowIf
  scaleMin?: number
  scaleMax?: number
  scaleMinLabel?: string
  scaleMaxLabel?: string
  numberMin?: number
  numberMax?: number
}

/** Диапазон интерпретации для шкалы/числа */
export interface ScaleInterpretationRange {
  min: number
  max: number
  text?: string
  label?: string
}

/** Интерпретации по вопросу (шкала или число): значение попадает в один из диапазонов */
export interface ScaleInterpretation {
  questionId: string
  ranges: ScaleInterpretationRange[]
}

/** Формула для вычисления метрики (переменные: questionId_optionId для выбора, questionId_score для шкалы/числа) */
export interface Formula {
  id: string
  name: string
  expression: string
  description?: string
}

export interface Test {
  id: string
  publicSlug?: string
  showResultsImmediately?: boolean
  title: string
  description: string
  instruction: string
  questions: Question[]
  metrics?: TestMetric[]
  clientReportTemplate?: string
  professionalReportTemplate?: string
  clientReportHtmlTemplate?: string
  professionalReportHtmlTemplate?: string
  scaleInterpretations?: ScaleInterpretation[]
  /** Если true, клиент вводит имя/email перед стартом */
  requiresPersonalData?: boolean
  /** Показывать клиенту кнопку скачивания отчёта после завершения */
  showClientReport?: boolean
  createdAt: string
  updatedAt: string
  attemptsCount: number
}

export interface TestMetricRule {
  question_id: string
  type: 'choice' | 'scale'
  scores?: Record<string, number>
  multiplier?: number
}

export interface TestMetric {
  id: string
  name: string
  description: string
  rules: TestMetricRule[]
}

export interface TestLink {
  token: string
  url: string
  expiresAt?: string
}

// Attempt types
export type AttemptStatus = 'in_progress' | 'completed'

export interface Attempt {
  id: string
  testId: string
  testTitle: string
  clientName: string
  clientEmail?: string
  clientAge?: number
  status: AttemptStatus
  startedAt: string
  completedAt?: string
  answers: Answer[]
  metrics?: Metric[]
  results?: {
    metrics: Metric[]
    simpleMetrics?: Array<Metric & { details?: Array<{ questionId: string; score: number; answer?: unknown }> }>
    interpretation?: string
  }
  reportGeneratedAt?: string | null
  reportSentAt?: string | null
  /** Снимок вопросов на момент прохождения (для отображения в кабинете) */
  questions?: Question[]
}

export interface Answer {
  questionId: string
  value: string | string[] | number
}

export interface Metric {
  id?: string
  name: string
  value: number
  /** Сырой балл до нормирования в 0–100 (если сохранён бэкендом) */
  raw?: number
  description?: string
}

// Public test types
export interface PublicTest {
  id: string
  title: string
  description: string
  instruction: string
  questions: Question[]
  requiresPersonalData: boolean
}

export interface TestResult {
  metrics: Metric[]
  interpretation?: string
  canDownloadReport: boolean
}

// Admin types
export interface Psychologist {
  id: string
  email: string
  name: string
  isBlocked: boolean
  accessExpiresAt?: string | null
  blockedAt?: string | null
  blockedReason?: string | null
  createdAt: string
  testsCount: number
}

// API Response types
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// Dashboard stats
export interface DashboardStats {
  totalTests: number
  totalAttempts: number
  completedAttempts: number
  recentAttempts: Attempt[]
  /** Только для роли admin */
  totalPsychologists?: number
}
