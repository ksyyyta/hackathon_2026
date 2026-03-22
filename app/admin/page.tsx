'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, FileText, CheckCircle, ArrowRight } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export default function AdminPage() {
  const [stats, setStats] = useState<{
    totalPsychologists: number
    totalTests: number
    totalAttempts: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const s = await api.getDashboardStats()
        if (cancelled) return
        setStats({
          totalPsychologists: s.totalPsychologists ?? 0,
          totalTests: s.totalTests,
          totalAttempts: s.totalAttempts,
        })
      } catch {
        if (!cancelled) {
          toast.error('Не удалось загрузить статистику')
          setStats({ totalPsychologists: 0, totalTests: 0, totalAttempts: 0 })
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const statCards = [
    {
      title: 'Психологов',
      value: stats?.totalPsychologists ?? 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      href: '/admin/psychologists',
    },
    {
      title: 'Тестов создано',
      value: stats?.totalTests ?? 0,
      icon: FileText,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      title: 'Прохождений',
      value: stats?.totalAttempts ?? 0,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Панель администратора</h1>
        <p className="text-muted-foreground">Управление платформой</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрые действия</CardTitle>
          <CardDescription>Управление пользователями платформы</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <Button asChild variant="outline" className="justify-start h-auto py-4">
              <Link href="/admin/psychologists">
                <Users className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">Управление психологами</p>
                  <p className="text-sm text-muted-foreground">
                    Добавить, заблокировать или удалить
                  </p>
                </div>
                <ArrowRight className="ml-auto h-5 w-5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
