'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  MoreHorizontal,
  Ban,
  Unlock,
  Trash2,
  Loader2,
  Pencil,
} from 'lucide-react'
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
  DialogTrigger,
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
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Empty } from '@/components/ui/empty'
import { useAdmin } from '@/lib/contexts'
import type { Psychologist } from '@/lib/types'
import { fioFieldsSchema, formatFullName, parseFullName } from '@/lib/fio'

const createSchema = fioFieldsSchema.extend({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
  accessDays: z.coerce.number().int().min(0).optional(),
})

type CreateForm = z.infer<typeof createSchema>

const editSchema = fioFieldsSchema.extend({
  email: z.string().email('Введите корректный email'),
  accessDays: z.coerce.number().int().min(0).optional(),
})

type EditForm = z.infer<typeof editSchema>

export default function PsychologistsPage() {
  const {
    psychologists,
    isLoading,
    fetchPsychologists,
    createPsychologist,
    updatePsychologist,
    blockPsychologist,
    deletePsychologist,
  } = useAdmin()

  const [displayPsychologists, setDisplayPsychologists] = useState<Psychologist[]>([])
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Psychologist | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  })
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  })

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  })

  useEffect(() => {
    fetchPsychologists().catch(() => {
      toast.error('Не удалось загрузить список психологов')
      setDisplayPsychologists([])
    })
  }, [fetchPsychologists])

  useEffect(() => {
    setDisplayPsychologists(psychologists)
  }, [psychologists])

  const filteredPsychologists = displayPsychologists.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async (data: CreateForm) => {
    setIsCreating(true)
    try {
      await createPsychologist({
        name: formatFullName(data),
        email: data.email,
        password: data.password,
        accessDays: data.accessDays ?? null,
      })
      toast.success('Психолог добавлен')
      setCreateOpen(false)
      reset()
    } catch {
      toast.error('Не удалось создать аккаунт')
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditOpen = (p: Psychologist) => {
    setEditTarget(p)
    editForm.reset({ ...parseFullName(p.name), email: p.email, accessDays: undefined })
  }

  const handleEditSubmit = async (data: EditForm) => {
    if (!editTarget) return
    setIsEditing(true)
    try {
      await updatePsychologist(editTarget.id, {
        name: formatFullName(data),
        email: data.email,
        accessDays: data.accessDays ?? null,
      })
      toast.success('Данные обновлены')
      setEditTarget(null)
    } catch {
      toast.error('Не удалось сохранить изменения')
    } finally {
      setIsEditing(false)
    }
  }

  const handleBlock = async (id: string, blocked: boolean) => {
    try {
      const reason = blocked ? window.prompt('Причина блокировки (необязательно):') || undefined : undefined
      await blockPsychologist(id, blocked, reason)
      setDisplayPsychologists((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isBlocked: blocked } : p))
      )
      toast.success(blocked ? 'Психолог заблокирован' : 'Психолог разблокирован')
    } catch {
      toast.error('Не удалось изменить статус')
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.id) return
    try {
      await deletePsychologist(deleteDialog.id)
      setDisplayPsychologists((prev) => prev.filter((p) => p.id !== deleteDialog.id))
      toast.success('Психолог удалён')
    } catch {
      toast.error('Не удалось удалить')
    }
    setDeleteDialog({ open: false, id: null })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Психологи</h1>
          <p className="text-muted-foreground">Управление аккаунтами психологов</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Добавить психолога
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый психолог</DialogTitle>
              <DialogDescription>
                Создайте аккаунт для нового психолога
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="lastName">Фамилия</FieldLabel>
                  <Input
                    id="lastName"
                    placeholder="Иванов"
                    {...register('lastName')}
                    disabled={isCreating}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName.message}</p>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="firstName">Имя</FieldLabel>
                  <Input
                    id="firstName"
                    placeholder="Иван"
                    {...register('firstName')}
                    disabled={isCreating}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName.message}</p>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="middleName">Отчество</FieldLabel>
                  <Input
                    id="middleName"
                    placeholder="Иванович"
                    {...register('middleName')}
                    disabled={isCreating}
                  />
                  {errors.middleName && (
                    <p className="text-sm text-destructive">{errors.middleName.message}</p>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@mail.com"
                    {...register('email')}
                    disabled={isCreating}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="accessDays">Срок доступа (дней, 0 = без срока)</FieldLabel>
                  <Input
                    id="accessDays"
                    type="number"
                    placeholder="30"
                    {...register('accessDays')}
                    disabled={isCreating}
                  />
                  {errors.accessDays && (
                    <p className="text-sm text-destructive">{errors.accessDays.message}</p>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Пароль</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Минимум 6 символов"
                    {...register('password')}
                    disabled={isCreating}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </Field>
              </FieldGroup>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Отмена
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Создать
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список психологов</CardTitle>
          <CardDescription>
            {filteredPsychologists.length} из {displayPsychologists.length} записей
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени или email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          {isLoading && displayPsychologists.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredPsychologists.length === 0 ? (
            <Empty
              title="Нет психологов"
              description="Добавьте первого психолога"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Тестов</TableHead>
                    <TableHead className="hidden lg:table-cell">Доступ до</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPsychologists.map((psychologist) => (
                    <TableRow key={psychologist.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{psychologist.name}</p>
                          <p className="text-sm text-muted-foreground md:hidden">
                            {psychologist.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {psychologist.email}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {psychologist.testsCount}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {psychologist.accessExpiresAt
                          ? format(new Date(psychologist.accessExpiresAt), 'dd.MM.yyyy', { locale: ru })
                          : 'Без срока'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={psychologist.isBlocked ? 'destructive' : 'default'}
                        >
                          {psychologist.isBlocked ? 'Заблокирован' : 'Активен'}
                        </Badge>
                        {psychologist.blockedReason ? (
                          <p className="text-xs text-muted-foreground mt-1">{psychologist.blockedReason}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditOpen(psychologist)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {psychologist.isBlocked ? (
                              <DropdownMenuItem
                                onClick={() => handleBlock(psychologist.id, false)}
                              >
                                <Unlock className="mr-2 h-4 w-4" />
                                Разблокировать
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleBlock(psychologist.id, true)}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Заблокировать
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                setDeleteDialog({ open: true, id: psychologist.id })
                              }
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать психолога</DialogTitle>
            <DialogDescription>Фамилия, имя, отчество и email</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit(handleEditSubmit)}
            className="space-y-4"
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-lastName">Фамилия</FieldLabel>
                <Input
                  id="edit-lastName"
                  {...editForm.register('lastName')}
                  disabled={isEditing}
                />
                {editForm.formState.errors.lastName && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.lastName.message}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-firstName">Имя</FieldLabel>
                <Input
                  id="edit-firstName"
                  {...editForm.register('firstName')}
                  disabled={isEditing}
                />
                {editForm.formState.errors.firstName && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.firstName.message}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-middleName">Отчество</FieldLabel>
                <Input
                  id="edit-middleName"
                  {...editForm.register('middleName')}
                  disabled={isEditing}
                />
                {editForm.formState.errors.middleName && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.middleName.message}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-accessDays">Продлить доступ (дней, 0 = без срока)</FieldLabel>
                <Input
                  id="edit-accessDays"
                  type="number"
                  {...editForm.register('accessDays')}
                  disabled={isEditing}
                />
                {editForm.formState.errors.accessDays && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.accessDays.message}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-email">Email</FieldLabel>
                <Input
                  id="edit-email"
                  type="email"
                  {...editForm.register('email')}
                  disabled={isEditing}
                />
                {editForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.email.message}
                  </p>
                )}
              </Field>
            </FieldGroup>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                Отмена
              </Button>
              <Button type="submit" disabled={isEditing}>
                {isEditing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Сохранить
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить психолога?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Все данные психолога, включая тесты и
              результаты, будут удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
