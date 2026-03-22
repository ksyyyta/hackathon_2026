'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import type { User, Test, Question, Attempt, Psychologist } from './types'

// Auth Context
interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<User>
  register: (data: { name: string; email: string; password: string }) => Promise<User>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    setIsLoading(true)
    try {
      if (!api.getToken()) {
        await api.tryRestoreSessionFromCookie()
      }
      const token = api.getToken()
      if (!token) {
        setUser(null)
        return
      }
      try {
        const userData = await api.getProfile()
        setUser(userData)
      } catch {
        api.setToken(null)
        setUser(null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (email: string, password: string) => {
    const { user: userData } = await api.login(email, password)
    setUser(userData)
    return userData
  }

  const register = async (data: { name: string; email: string; password: string }) => {
    const { user: userData } = await api.register(data)
    setUser(userData)
    return userData
  }

  const logout = async () => {
    try {
      await api.logout()
    } finally {
      setUser(null)
    }
  }

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        checkAuth,
      },
    },
    children
  )
}

// Tests Context
interface TestsContextType {
  tests: Test[]
  isLoading: boolean
  fetchTests: () => Promise<void>
  createTest: (data: Partial<Test>) => Promise<Test>
  updateTest: (id: string, data: Partial<Test>) => Promise<void>
  deleteTest: (id: string) => Promise<void>
  cloneTest: (id: string) => Promise<Test>
}

const TestsContext = createContext<TestsContextType | null>(null)

export function useTests() {
  const context = useContext(TestsContext)
  if (!context) {
    throw new Error('useTests must be used within TestsProvider')
  }
  return context
}

export function TestsProvider({ children }: { children: ReactNode }) {
  const [tests, setTests] = useState<Test[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTests = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.getTests()
      setTests(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createTest = async (data: Partial<Test>) => {
    const newTest = await api.createTest(data)
    setTests((prev) => [...prev, newTest])
    return newTest
  }

  const updateTest = async (id: string, data: Partial<Test>) => {
    const updated = await api.updateTest(id, data)
    setTests((prev) => prev.map((t) => (t.id === id ? updated : t)))
  }

  const deleteTest = async (id: string) => {
    await api.deleteTest(id)
    setTests((prev) => prev.filter((t) => t.id !== id))
  }

  const cloneTest = async (id: string) => {
    const cloned = await api.cloneTest(id)
    setTests((prev) => [...prev, cloned])
    return cloned
  }

  return React.createElement(
    TestsContext.Provider,
    {
      value: {
        tests,
        isLoading,
        fetchTests,
        createTest,
        updateTest,
        deleteTest,
        cloneTest,
      },
    },
    children
  )
}

// Test Editor Context (for constructor)
interface TestEditorContextType {
  test: Partial<Test> | null
  setTest: (test: Partial<Test> | null) => void
  addQuestion: (question: Question) => void
  updateQuestion: (id: string, data: Partial<Question>) => void
  removeQuestion: (id: string) => void
  reorderQuestions: (questions: Question[]) => void
  save: () => Promise<void>
  isSaving: boolean
}

const TestEditorContext = createContext<TestEditorContextType | null>(null)

export function useTestEditor() {
  const context = useContext(TestEditorContext)
  if (!context) {
    throw new Error('useTestEditor must be used within TestEditorProvider')
  }
  return context
}

export function TestEditorProvider({
  children,
  initialTest,
}: {
  children: ReactNode
  initialTest?: Test
}) {
  const [test, setTest] = useState<Partial<Test> | null>(initialTest || null)
  const [isSaving, setIsSaving] = useState(false)

  const addQuestion = (question: Question) => {
    setTest((prev) => ({
      ...prev,
      questions: [...(prev?.questions || []), question],
    }))
  }

  const updateQuestion = (id: string, data: Partial<Question>) => {
    setTest((prev) => ({
      ...prev,
      questions: prev?.questions?.map((q) => (q.id === id ? { ...q, ...data } : q)) || [],
    }))
  }

  const removeQuestion = (id: string) => {
    setTest((prev) => ({
      ...prev,
      questions: prev?.questions?.filter((q) => q.id !== id) || [],
    }))
  }

  const reorderQuestions = (questions: Question[]) => {
    setTest((prev) => ({ ...prev, questions }))
  }

  const save = async () => {
    if (!test) return
    setIsSaving(true)
    try {
      if (test.id) {
        await api.updateTest(test.id, test)
      } else {
        const created = await api.createTest(test)
        setTest(created)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return React.createElement(
    TestEditorContext.Provider,
    {
      value: {
        test,
        setTest,
        addQuestion,
        updateQuestion,
        removeQuestion,
        reorderQuestions,
        save,
        isSaving,
      },
    },
    children
  )
}

// Attempts Context
interface AttemptsContextType {
  attempts: Attempt[]
  isLoading: boolean
  fetchAttempts: (testId: string) => Promise<void>
}

const AttemptsContext = createContext<AttemptsContextType | null>(null)

export function useAttempts() {
  const context = useContext(AttemptsContext)
  if (!context) {
    throw new Error('useAttempts must be used within AttemptsProvider')
  }
  return context
}

export function AttemptsProvider({ children }: { children: ReactNode }) {
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchAttempts = useCallback(async (testId: string) => {
    setIsLoading(true)
    try {
      const data = await api.getTestAttempts(testId)
      setAttempts(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return React.createElement(
    AttemptsContext.Provider,
    { value: { attempts, isLoading, fetchAttempts } },
    children
  )
}

// Admin Context
interface AdminContextType {
  psychologists: Psychologist[]
  isLoading: boolean
  fetchPsychologists: () => Promise<void>
  createPsychologist: (data: { email: string; name: string; password: string; accessDays?: number | null }) => Promise<void>
  updatePsychologist: (id: string, data: { name?: string; email?: string; accessDays?: number | null }) => Promise<void>
  blockPsychologist: (id: string, blocked: boolean, reason?: string) => Promise<void>
  deletePsychologist: (id: string) => Promise<void>
}

const AdminContext = createContext<AdminContextType | null>(null)

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider')
  }
  return context
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [psychologists, setPsychologists] = useState<Psychologist[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchPsychologists = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.getPsychologists()
      setPsychologists(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createPsychologist = async (data: { email: string; name: string; password: string; accessDays?: number | null }) => {
    const newPsychologist = await api.createPsychologist(data)
    setPsychologists((prev) => [...prev, newPsychologist])
  }

  const updatePsychologist = async (id: string, data: { name?: string; email?: string; accessDays?: number | null }) => {
    const updated = await api.updatePsychologist(id, data)
    setPsychologists((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              name: updated.name,
              email: updated.email,
              accessExpiresAt: updated.accessExpiresAt ?? null,
              blockedReason: updated.blockedReason ?? null,
            }
          : p
      )
    )
  }

  const blockPsychologist = async (id: string, blocked: boolean, reason?: string) => {
    await api.blockPsychologist(id, blocked, reason)
    setPsychologists((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isBlocked: blocked } : p))
    )
  }

  const deletePsychologist = async (id: string) => {
    await api.deletePsychologist(id)
    setPsychologists((prev) => prev.filter((p) => p.id !== id))
  }

  return React.createElement(
    AdminContext.Provider,
    {
      value: {
        psychologists,
        isLoading,
        fetchPsychologists,
        createPsychologist,
        updatePsychologist,
        blockPsychologist,
        deletePsychologist,
      },
    },
    children
  )
}
