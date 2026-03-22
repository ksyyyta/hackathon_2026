'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, Filter, Download } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Empty } from '@/components/ui/empty'
import { useAttempts } from '@/lib/contexts'
import type { Attempt } from '@/lib/types'

// Mock data for demo
const mockAttempts: Attempt[] = [
  {
    id: '1',
    testId: '1',
    testTitle: 'Тест профориентации',
    clientName: 'Иван Петров',
    clientEmail: 'ivan@example.com',
    clientAge: 25,
    status: 'completed',
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    answers: [],
  },
  {
    id: '2',
    testId: '1',
    testTitle: 'Тест профориентации',
    clientName: 'Мария Сидорова',
    clientEmail: 'maria@example.com',
    clientAge: 22,
    status: 'completed',
    startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    answers: [],
  },
  {
    id: '3',
    testId: '1',
    testTitle: 'Тест профориентации',
    clientName: 'Алексей Козлов',
    clientEmail: 'alex@example.com',
    status: 'in_progress',
    startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    answers: [],
  },
]

export default function TestAttemptsPage() {
  const params = useParams()
  const testId = params.id as string
  const { attempts, isLoading, fetchAttempts } = useAttempts()
  const [displayAttempts, setDisplayAttempts] = useState<Attempt[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchAttempts(testId).catch(() => {
      setDisplayAttempts(mockAttempts)
    })
  }, [testId, fetchAttempts])

  useEffect(() => {
    if (attempts.length > 0) {
      setDisplayAttempts(attempts)
    }
  }, [attempts])

  const filteredAttempts = displayAttempts.filter((attempt) => {
    const matchesSearch = attempt.clientName.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || attempt.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleExport = () => {
    // Export to CSV
    const headers = ['Имя', 'Email', 'Возраст', 'Статус', 'Дата начала', 'Дата завершения']
    const rows = filteredAttempts.map((a) => [
      a.clientName,
      a.clientEmail || '',
      a.clientAge?.toString() || '',
      a.status === 'completed' ? 'Завершён' : 'В процессе',
      format(new Date(a.startedAt), 'dd.MM.yyyy HH:mm'),
      a.completedAt ? format(new Date(a.completedAt), 'dd.MM.yyyy HH:mm') : '',
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'attempts.csv'
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/tests">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Прохождения теста</h1>
          <p className="text-muted-foreground">Список всех прохождений</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Результаты</CardTitle>
              <CardDescription>
                {filteredAttempts.length} из {displayAttempts.length} записей
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Экспорт CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="completed">Завершённые</SelectItem>
                <SelectItem value="in_progress">В процессе</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading && displayAttempts.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredAttempts.length === 0 ? (
            <Empty
              title="Нет прохождений"
              description="Ещё никто не прошёл этот тест"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Клиент</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Дата</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{attempt.clientName}</p>
                          {attempt.clientAge && (
                            <p className="text-sm text-muted-foreground">
                              {attempt.clientAge} лет
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {attempt.clientEmail || '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {format(new Date(attempt.startedAt), 'd MMM yyyy', { locale: ru })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={attempt.status === 'completed' ? 'default' : 'secondary'}
                        >
                          {attempt.status === 'completed' ? 'Завершён' : 'В процессе'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/attempts/${attempt.id}`}>
                            Детали
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
