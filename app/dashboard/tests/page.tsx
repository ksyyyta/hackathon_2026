'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Link2, BarChart3, Edit, Copy, Trash2, MoreHorizontal } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Empty } from '@/components/ui/empty'
import { TestLinkButton } from '@/components/TestLinkButton'
import { useTests } from '@/lib/contexts'
import { api } from '@/lib/api'
import type { Test, TestLink } from '@/lib/types'

export default function TestsPage() {
  const { tests, isLoading, fetchTests, deleteTest, cloneTest } = useTests()
  const [displayTests, setDisplayTests] = useState<Test[]>([])
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; link: TestLink | null }>({
    open: false,
    link: null,
  })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; testId: string | null }>({
    open: false,
    testId: null,
  })

  useEffect(() => {
    fetchTests().catch((error) => {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить тесты')
      setDisplayTests([])
    })
  }, [fetchTests])

  useEffect(() => {
    if (tests.length > 0) {
      setDisplayTests(tests)
    }
  }, [tests])

  const handleGetLink = async (testId: string) => {
    try {
      const link = await api.createTestLink(testId)
      setLinkDialog({ open: true, link })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось получить ссылку')
    }
  }

  const handleCopyLink = () => {
    if (linkDialog.link) {
      navigator.clipboard.writeText(linkDialog.link.url)
      toast.success('Ссылка скопирована')
    }
  }

  const handleClone = async (testId: string) => {
    try {
      const cloned = await cloneTest(testId)
      toast.success('Тест клонирован')
      setDisplayTests((prev) => [...prev, cloned])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось клонировать тест')
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.testId) return
    try {
      await deleteTest(deleteDialog.testId)
      setDisplayTests((prev) => prev.filter((t) => t.id !== deleteDialog.testId))
      toast.success('Тест удалён')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить тест')
    }
    setDeleteDialog({ open: false, testId: null })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Мои тесты</h1>
          <p className="text-muted-foreground">Управление вашими тестами</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/tests/new">
            <Plus className="mr-2 h-4 w-4" />
            Создать тест
          </Link>
        </Button>
      </div>

      {isLoading && displayTests.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : displayTests.length === 0 ? (
        <Empty
          title="Нет тестов"
          description="Создайте первый тест для начала работы"
        >
          <Button asChild className="mt-4">
            <Link href="/dashboard/tests/new">
              <Plus className="mr-2 h-4 w-4" />
              Создать тест
            </Link>
          </Button>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayTests.map((test) => (
            <TestCard
              key={test.id}
              test={test}
              onGetLink={() => handleGetLink(test.id)}
              onClone={() => handleClone(test.id)}
              onDelete={() => setDeleteDialog({ open: true, testId: test.id })}
            />
          ))}
        </div>
      )}

      {/* Link Dialog */}
      <Dialog open={linkDialog.open} onOpenChange={(open) => setLinkDialog({ open, link: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ссылка на тест</DialogTitle>
            <DialogDescription>
              Отправьте эту ссылку клиенту для прохождения теста
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input value={linkDialog.link?.url || ''} readOnly className="flex-1" />
            <Button onClick={handleCopyLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, testId: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить тест?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Все данные теста и прохождений будут удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TestCard({
  test,
  onGetLink,
  onClone,
  onDelete,
}: {
  test: Test
  onGetLink: () => void
  onClone: () => void
  onDelete: () => void
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base line-clamp-2">{test.title}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onGetLink}>
                <Link2 className="mr-2 h-4 w-4" />
                Получить ссылку
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/tests/${test.id}/attempts`}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Результаты
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/tests/${test.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Редактировать
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onClone}>
                <Copy className="mr-2 h-4 w-4" />
                Клонировать
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription className="line-clamp-2">{test.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm">
          <Badge variant="secondary">{test.attemptsCount} прохождений</Badge>
          <span className="text-muted-foreground">
            {format(new Date(test.updatedAt), 'd MMM yyyy', { locale: ru })}
          </span>
        </div>
        <div className="mt-3">
          <TestLinkButton testId={test.id} />
        </div>
      </CardContent>
    </Card>
  )
}
