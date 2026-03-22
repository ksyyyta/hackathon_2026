'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ClientCompletePage() {
  const { slug } = useParams<{ slug: string }>()

  return (
    <div className="mx-auto max-w-xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>Спасибо за прохождение!</CardTitle>
          <CardDescription>
            Результаты будут отправлены вам после обработки психологом.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Мы не показываем отчет сразу на этой странице. Специалист проверит результаты и отправит их вам.
          </p>
          <Button asChild variant="outline">
            <Link href={`/client/${slug}`}>Пройти снова</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
