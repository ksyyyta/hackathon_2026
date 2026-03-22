'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Users, CheckCircle, Clock, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/contexts'
import { api } from '@/lib/api'
import type { DashboardStats, Attempt } from '@/lib/types'

// Mock data for demo
const mockStats: DashboardStats = {
  totalTests: 5,
  totalAttempts: 47,
  completedAttempts: 42,
  recentAttempts: [
    {
      id: '1',
      testId: '1',
      testTitle: 'Тест профориентации',
      clientName: 'Иван Петров',
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      answers: [],
    },
    {
      id: '2',
      testId: '1',
      testTitle: 'Тест на тип личности',
      clientName: 'Мария Сидорова',
      status: 'completed',
      startedAt: new Date(Date.now() - 86400000).toISOString(),
      completedAt: new Date(Date.now() - 86400000).toISOString(),
      answers: [],
    },
    {
      id: '3',
      testId: '2',
      testTitle: 'Тест профориентации',
      clientName: 'Алексей Козлов',
      status: 'in_progress',
      startedAt: new Date(Date.now() - 172800000).toISOString(),
      answers: [],
    },
  ],
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getDashboardStats()
        setStats(data)
      } catch {
        // Use mock data if API fails
        setStats(mockStats)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [])

  const statCards = [
    {
      title: 'Всего тестов',
      value: stats?.totalTests ?? 0,
      icon: FileText,
      color: 'text-primary',
      bg: 'bg-primary/20',
    },
    {
      title: 'Всего прохождений',
      value: stats?.totalAttempts ?? 0,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/20',
    },
    {
      title: 'Завершено',
      value: stats?.completedAttempts ?? 0,
      icon: CheckCircle,
      color: 'text-primary',
      bg: 'bg-primary/20',
    },
    {
      title: 'В процессе',
      value: (stats?.totalAttempts ?? 0) - (stats?.completedAttempts ?? 0),
      icon: Clock,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">
            Добро пожаловать, {user?.name}!
          </h1>
          <p className="text-muted-foreground">
            Вот обзор вашей активности на платформе
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/tests/new">
            <Plus className="mr-2 h-4 w-4" />
            Создать тест
          </Link>
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-full p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent attempts */}
      <Card>
        <CardHeader>
          <CardTitle>Последние прохождения</CardTitle>
          <CardDescription>Недавняя активность по вашим тестам</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : stats?.recentAttempts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Пока нет прохождений
            </div>
          ) : (
            <div className="space-y-4">
              {stats?.recentAttempts.map((attempt) => (
                <AttemptRow key={attempt.id} attempt={attempt} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AttemptRow({ attempt }: { attempt: Attempt }) {
  return (
    <Link
      href={`/dashboard/attempts/${attempt.id}`}
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <span className="text-sm font-medium text-primary">
          {attempt.clientName.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attempt.clientName}</p>
        <p className="text-xs text-muted-foreground truncate">{attempt.testTitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground hidden sm:block">
          {format(new Date(attempt.startedAt), 'd MMM', { locale: ru })}
        </span>
        <Badge variant={attempt.status === 'completed' ? 'default' : 'secondary'}>
          {attempt.status === 'completed' ? 'Завершён' : 'В процессе'}
        </Badge>
      </div>
    </Link>
  )
}
