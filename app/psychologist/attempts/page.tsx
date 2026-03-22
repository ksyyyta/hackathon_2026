'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import type { Attempt } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

function reportStatus(a: Attempt) {
  return a.reportSentAt ? 'отправлен' : a.reportGeneratedAt ? 'сгенерирован' : 'не отправлен'
}

export default function PsychologistAttemptsPage() {
  const [items, setItems] = useState<Attempt[]>([])

  useEffect(() => {
    api.getPsychologistAttempts()
      .then(setItems)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Не удалось загрузить прохождения'))
  }, [])

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Прохождения клиентов</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Клиент</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Статус отчета</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.clientName}</TableCell>
                  <TableCell>{a.clientEmail || '-'}</TableCell>
                  <TableCell>{new Date(a.startedAt).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="secondary">{reportStatus(a)}</Badge></TableCell>
                  <TableCell>
                    <Link href={`/psychologist/attempts/${a.id}`} className="underline">
                      Открыть
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
