import type {
  User,
  Test,
  TestLink,
  Attempt,
  PublicTest,
  TestResult,
  TestMetric,
  Psychologist,
  DashboardStats,
  Answer,
  PaginatedResponse,
} from './types'

const _raw = typeof process.env.NEXT_PUBLIC_API_URL === 'string' ? process.env.NEXT_PUBLIC_API_URL.trim() : ''

/** База для fetch: относительный `/api` или полный URL с суффиксом `/api` (как у FastAPI). */
function normalizeApiBase(raw: string): string {
  const t = raw.trim()
  if (!t || t === '/') return '/api'
  if (t.startsWith('http://') || t.startsWith('https://')) {
    const u = t.replace(/\/+$/, '')
    if (!/\/api(\/|$)/.test(u)) {
      return `${u}/api`
    }
    return u
  }
  const rel = t.startsWith('/') ? t : `/${t}`
  return rel.replace(/\/+$/, '') || '/api'
}

const API_BASE_URL = normalizeApiBase(_raw)

function isPublicAuthPath(endpoint: string): boolean {
  return (
    endpoint.startsWith('/auth/login') ||
    endpoint.startsWith('/auth/register') ||
    endpoint.startsWith('/auth/logout') ||
    endpoint.startsWith('/auth/refresh')
  )
}

function parseAuthResponse(data: unknown): { user: User; token: string } {
  if (!data || typeof data !== 'object') {
    throw new Error('Пустой ответ сервера при входе')
  }
  const d = data as Record<string, unknown>
  const tokenRaw = d.token ?? d.access_token
  const token = typeof tokenRaw === 'string' && tokenRaw.length > 0 ? tokenRaw : null
  const user = d.user as User | undefined
  if (!token || !user || typeof user !== 'object' || user.id == null) {
    throw new Error(
      'Неверный ответ API: нет токена или данных пользователя. Проверьте NEXT_PUBLIC_API_URL (для FastAPI нужен полный путь …/api).'
    )
  }
  return { user, token }
}

function errorMessageFromBody(body: Record<string, unknown>): string {
  const d = body.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d) && d.length > 0) {
    return d
      .map((item: unknown) =>
        typeof item === 'object' && item !== null && 'msg' in item
          ? String((item as { msg: string }).msg)
          : JSON.stringify(item)
      )
      .join(', ')
  }
  if (typeof body.message === 'string') return body.message
  return 'Request failed'
}

function extractTextErrorMessage(text: string): string | null {
  const clean = text.trim()
  if (!clean) return null
  // For HTML error pages return generic message.
  if (clean.startsWith('<!doctype') || clean.startsWith('<html')) {
    return null
  }
  return clean.length > 300 ? `${clean.slice(0, 300)}...` : clean
}

class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token')
    }
    return this.token
  }

  private buildHeaders(accessToken: string | null, init?: HeadersInit): Record<string, string> {
    const out: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (accessToken) {
      out.Authorization = `Bearer ${accessToken}`
    }
    if (init) {
      new Headers(init).forEach((value, key) => {
        out[key] = value
      })
    }
    return out
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const sendAuth = !isPublicAuthPath(endpoint)
    const token = sendAuth ? this.getToken() : null
    let headers = this.buildHeaders(token, options.headers)

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    })

    if (response.status === 401 && !isPublicAuthPath(endpoint)) {
      const refreshed = await this.refreshToken()
      if (refreshed) {
        const newToken = this.getToken()
        headers = this.buildHeaders(newToken, options.headers)
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        })
        if (!retryResponse.ok) {
          const retryText = await retryResponse.text().catch(() => '')
          let message = 'Request failed'
          if (retryText) {
            try {
              const err = JSON.parse(retryText) as Record<string, unknown>
              message = errorMessageFromBody(err)
            } catch {
              message = extractTextErrorMessage(retryText) ?? `Request failed (${retryResponse.status})`
            }
          } else {
            message = `Request failed (${retryResponse.status})`
          }
          throw new Error(message)
        }
        const retryText = await retryResponse.text()
        return (retryText ? JSON.parse(retryText) : {}) as T
      } else {
        this.setToken(null)
        if (typeof window !== 'undefined') {
          const p = window.location.pathname
          if (!p.startsWith('/auth')) {
            window.location.href = '/auth'
          }
        }
        throw new Error('Session expired')
      }
    }

    if (!response.ok) {
      const responseText = await response.text().catch(() => '')
      if (responseText) {
        try {
          const error = JSON.parse(responseText) as Record<string, unknown>
          throw new Error(errorMessageFromBody(error))
        } catch {
          throw new Error(extractTextErrorMessage(responseText) ?? `Request failed (${response.status})`)
        }
      }
      throw new Error(`Request failed (${response.status})`)
    }

    const text = await response.text()
    try {
      return (text ? JSON.parse(text) : {}) as T
    } catch {
      throw new Error('Некорректный ответ сервера')
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (response.ok) {
        const data = (await response.json()) as { token?: string }
        if (data.token) this.setToken(data.token)
        return !!data.token
      }
      return false
    } catch {
      return false
    }
  }

  /** Если access-токена нет, но есть HttpOnly refresh — получить новый access (после F5 и т.п.). */
  async tryRestoreSessionFromCookie(): Promise<boolean> {
    return this.refreshToken()
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    this.setToken(null)
    const raw = await this.request<unknown>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    const { user, token } = parseAuthResponse(raw)
    this.setToken(token)
    return { user, token }
  }

  async register(data: { name: string; email: string; password: string }): Promise<{ user: User; token: string }> {
    this.setToken(null)
    const raw = await this.request<unknown>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    const { user, token } = parseAuthResponse(raw)
    this.setToken(token)
    return { user, token }
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' })
    this.setToken(null)
  }

  // Profile endpoints
  async getProfile(): Promise<User> {
    return this.request<User>('/profile')
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return this.request<User>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // Test endpoints
  async getTests(): Promise<Test[]> {
    return this.request<Test[]>('/tests')
  }

  async getTest(id: string): Promise<Test> {
    return this.request<Test>(`/tests/${id}`)
  }

  async createTest(data: Partial<Test>): Promise<Test> {
    return this.request<Test>('/tests', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTest(id: string, data: Partial<Test>): Promise<Test> {
    return this.request<Test>(`/tests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteTest(id: string): Promise<void> {
    await this.request(`/tests/${id}`, { method: 'DELETE' })
  }

  async cloneTest(id: string): Promise<Test> {
    return this.request<Test>(`/tests/${id}/clone`, { method: 'POST' })
  }

  async exportTestConfig(id: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/tests/${id}/export-config`)
  }

  async importTestConfig(id: string, payload: Record<string, unknown>): Promise<Test> {
    return this.request<Test>(`/tests/${id}/import-config`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  }

  async createTestLink(id: string): Promise<TestLink> {
    return this.request<TestLink>(`/tests/${id}/link`, { method: 'POST' })
  }

  async getTestMetrics(testId: string): Promise<TestMetric[]> {
    return this.request<TestMetric[]>(`/tests/${testId}/metrics`)
  }

  async saveTestMetrics(testId: string, metrics: TestMetric[]): Promise<TestMetric[]> {
    return this.request<TestMetric[]>(`/tests/${testId}/metrics`, {
      method: 'POST',
      body: JSON.stringify({ metrics }),
    })
  }

  async updateTestMetric(testId: string, metricId: string, payload: Partial<TestMetric>): Promise<TestMetric> {
    return this.request<TestMetric>(`/tests/${testId}/metrics/${metricId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  }

  async deleteTestMetric(testId: string, metricId: string): Promise<void> {
    await this.request(`/tests/${testId}/metrics/${metricId}`, { method: 'DELETE' })
  }

  // Attempt endpoints
  async getTestAttempts(testId: string): Promise<Attempt[]> {
    return this.request<Attempt[]>(`/tests/${testId}/attempts`)
  }

  async getAttempt(attemptId: string): Promise<Attempt> {
    return this.request<Attempt>(`/attempts/${attemptId}`)
  }

  async downloadClientReport(attemptId: string): Promise<Blob> {
    const token = this.getToken()
    const response = await fetch(`${API_BASE_URL}/attempts/${attemptId}/reports/client`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    })
    return response.blob()
  }

  async downloadProfessionalReport(attemptId: string): Promise<Blob> {
    const token = this.getToken()
    const response = await fetch(`${API_BASE_URL}/attempts/${attemptId}/reports/professional`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    })
    return response.blob()
  }

  async fetchClientReportHtml(attemptId: string): Promise<string> {
    const token = this.getToken()
    const response = await fetch(`${API_BASE_URL}/attempts/${attemptId}/reports/client/html`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    })
    if (!response.ok) throw new Error('Failed to load HTML report')
    return response.text()
  }

  async fetchProfessionalReportHtml(attemptId: string): Promise<string> {
    const token = this.getToken()
    const response = await fetch(`${API_BASE_URL}/attempts/${attemptId}/reports/professional/html`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    })
    if (!response.ok) throw new Error('Failed to load HTML report')
    return response.text()
  }

  // Public test endpoints
  async getPublicTest(token: string): Promise<PublicTest> {
    return this.request<PublicTest>(`/public/test/${token}`)
  }

  async getPublicTestBySlug(slug: string): Promise<PublicTest> {
    return this.request<PublicTest>(`/public/tests/${slug}`)
  }

  async startTest(
    token: string,
    personalData: { name: string; email?: string; age?: number }
  ): Promise<{ attemptId: string }> {
    return this.request<{ attemptId: string }>(`/public/test/${token}/start`, {
      method: 'POST',
      body: JSON.stringify(personalData),
    })
  }

  async startTestBySlug(
    slug: string,
    personalData: { name: string; email?: string; age?: number }
  ): Promise<{ attemptId: string }> {
    return this.request<{ attemptId: string }>(`/public/tests/${slug}/start`, {
      method: 'POST',
      body: JSON.stringify(personalData),
    })
  }

  async submitAnswers(attemptId: string, answers: Answer[]): Promise<void> {
    await this.request(`/public/test/attempt/${attemptId}/answers`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    })
  }

  async submitAnswersBySlug(slug: string, attemptId: string, answers: Answer[]): Promise<void> {
    await this.request(`/public/tests/${slug}/answers`, {
      method: 'POST',
      body: JSON.stringify({ attemptId, answers }),
    })
  }

  async getProgress(attemptId: string): Promise<{ progress: number; answers: Answer[] }> {
    return this.request<{ progress: number; answers: Answer[] }>(
      `/public/test/attempt/${attemptId}/progress`
    )
  }

  async completeTest(attemptId: string): Promise<void> {
    await this.request(`/public/test/attempt/${attemptId}/complete`, {
      method: 'POST',
    })
  }

  async completeTestBySlug(slug: string, attemptId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/public/tests/${slug}/complete`, {
      method: 'POST',
      body: JSON.stringify({ attemptId }),
    })
  }

  async getTestResult(attemptId: string): Promise<TestResult> {
    return this.request<TestResult>(`/public/test/attempt/${attemptId}/result`)
  }

  async getPsychologistAttempts(testId?: string): Promise<Attempt[]> {
    const q = testId ? `?test_id=${encodeURIComponent(testId)}` : ''
    return this.request<Attempt[]>(`/psychologist/attempts${q}`)
  }

  async getPsychologistAttempt(attemptId: string): Promise<Attempt> {
    return this.request<Attempt>(`/psychologist/attempts/${attemptId}`)
  }

  async generateAttemptReport(attemptId: string): Promise<{ ok: boolean; reportGeneratedAt: string }> {
    return this.request<{ ok: boolean; reportGeneratedAt: string }>(
      `/psychologist/attempts/${attemptId}/generate-report`,
      { method: 'POST' }
    )
  }

  async sendAttemptReport(attemptId: string): Promise<{ ok: boolean; reportSentAt: string }> {
    return this.request<{ ok: boolean; reportSentAt: string }>(
      `/psychologist/attempts/${attemptId}/send-report`,
      { method: 'POST' }
    )
  }

  async downloadPsychologistReportDocx(attemptId: string): Promise<Blob> {
    const token = this.getToken()
    const response = await fetch(`${API_BASE_URL}/psychologist/attempts/${attemptId}/report/docx`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(extractTextErrorMessage(text) ?? `Request failed (${response.status})`)
    }
    return response.blob()
  }

  async fetchPsychologistReportHtml(attemptId: string): Promise<string> {
    const token = this.getToken()
    const response = await fetch(`${API_BASE_URL}/psychologist/attempts/${attemptId}/report/html`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(extractTextErrorMessage(text) ?? `Request failed (${response.status})`)
    }
    return response.text()
  }

  async fetchPsychologistClientReportHtml(attemptId: string): Promise<string> {
    const token = this.getToken()
    const response = await fetch(`${API_BASE_URL}/psychologist/attempts/${attemptId}/client-report/html`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(extractTextErrorMessage(text) ?? `Request failed (${response.status})`)
    }
    return response.text()
  }

  async downloadPublicClientReport(attemptId: string, format: 'docx' | 'html'): Promise<void> {
    const url =
      format === 'docx'
        ? `${API_BASE_URL}/public/test/attempt/${attemptId}/report/client`
        : `${API_BASE_URL}/public/test/attempt/${attemptId}/report/client/html`
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) throw new Error('Не удалось загрузить отчёт')
    if (format === 'html') {
      const html = await res.text()
      const w = window.open('', '_blank')
      if (w) {
        w.document.write(html)
        w.document.close()
      }
    } else {
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `report-client-${attemptId}.docx`
      a.click()
      URL.revokeObjectURL(a.href)
    }
  }

  // Admin endpoints
  async getPsychologists(): Promise<PaginatedResponse<Psychologist>> {
    return this.request<PaginatedResponse<Psychologist>>('/admin/psychologists')
  }

  async createPsychologist(data: {
    email: string
    name: string
    password: string
    accessDays?: number | null
  }): Promise<Psychologist> {
    return this.request<Psychologist>('/admin/psychologists', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async blockPsychologist(id: string, blocked: boolean, reason?: string): Promise<void> {
    await this.request(`/admin/psychologists/${id}/block`, {
      method: 'PATCH',
      body: JSON.stringify({ blocked, reason }),
    })
  }

  async updatePsychologist(
    id: string,
    data: { name?: string; email?: string; accessDays?: number | null }
  ): Promise<Psychologist> {
    return this.request<Psychologist>(`/admin/psychologists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async updatePsychologistAccess(id: string, accessDays?: number | null): Promise<Psychologist> {
    return this.request<Psychologist>(`/admin/psychologists/${id}/access`, {
      method: 'PATCH',
      body: JSON.stringify({ accessDays }),
    })
  }

  async deletePsychologist(id: string): Promise<void> {
    await this.request(`/admin/psychologists/${id}`, { method: 'DELETE' })
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard/stats')
  }
}

export const api = new ApiClient()
