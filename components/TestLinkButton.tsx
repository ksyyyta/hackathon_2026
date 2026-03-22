'use client'

import { useState } from 'react'
import { Link2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

export function TestLinkButton({ testId }: { testId: string }) {
  const [isLoading, setIsLoading] = useState(false)

  const onCopy = async () => {
    setIsLoading(true)
    try {
      const link = await api.createTestLink(testId)
      await navigator.clipboard.writeText(link.url)
      toast.success('Ссылка для клиента скопирована')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось получить ссылку')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={onCopy} disabled={isLoading}>
      <Link2 className="mr-2 h-4 w-4" />
      Скопировать ссылку для клиента
    </Button>
  )
}
