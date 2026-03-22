'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle, BarChart3, FileText, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/contexts'
import { Spinner } from '@/components/ui/spinner'
import { ThemeToggle } from '@/components/theme-toggle'

const features = [
  {
    icon: FileText,
    title: 'Конструктор тестов',
    description: 'Создавайте профессиональные тесты с различными типами вопросов',
  },
  {
    icon: Users,
    title: 'Управление клиентами',
    description: 'Отслеживайте прохождения и управляйте результатами',
  },
  {
    icon: BarChart3,
    title: 'Автоматические отчёты',
    description: 'Генерация профессиональных отчётов по результатам тестирования',
  },
  {
    icon: CheckCircle,
    title: 'Простое прохождение',
    description: 'Клиенты проходят тесты по уникальной ссылке без регистрации',
  },
]

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (user?.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    }
  }, [isLoading, isAuthenticated, user, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.jpeg"
              alt="Titan IT"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="font-semibold text-lg">
              <span className="text-foreground">TITAN</span>
              <span className="text-primary">IT</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ThemeToggle />
            <Button asChild>
              <Link href="/auth">
                Вход и регистрация
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.jpeg"
              alt="Titan IT"
              width={120}
              height={120}
              className="rounded-2xl"
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6 text-balance">
            Платформа для{' '}
            <span className="text-primary">профориентологов</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">
            Создавайте профессиональные психологические тесты, проводите тестирование
            клиентов и получайте детальные отчёты
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/auth">
                Войти или зарегистрироваться
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/test/demo">Профориентация (пример)</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/test/demo-team">Стиль работы (пример)</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Возможности платформы</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="bg-card border-border">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg text-card-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">Готовы начать?</h2>
          <p className="text-muted-foreground mb-8">
            Зарегистрируйтесь или войдите, чтобы создать свой первый тест
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/auth">
                Вход и регистрация
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>Titan IT - Платформа для профориентологов</p>
        </div>
      </footer>
    </div>
  )
}
