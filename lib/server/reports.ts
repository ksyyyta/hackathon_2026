import type { Attempt, Metric } from '@/lib/types'

function fillTemplate(
  template: string | undefined,
  ctx: {
    clientName: string
    clientEmail?: string
    clientAge?: number
    testTitle: string
    metrics: Metric[]
    interpretation?: string
  }
): string {
  const lines: string[] = []
  if (!template?.trim()) {
    lines.push(`Отчёт: ${ctx.testTitle}`)
    lines.push(`Клиент: ${ctx.clientName}`)
    if (ctx.clientEmail) lines.push(`Email: ${ctx.clientEmail}`)
    if (ctx.clientAge != null) lines.push(`Возраст: ${ctx.clientAge}`)
    lines.push('')
    lines.push('Метрики:')
    for (const m of ctx.metrics) {
      lines.push(`- ${m.name}: ${m.value}%${m.description ? ` — ${m.description}` : ''}`)
    }
    if (ctx.interpretation) {
      lines.push('')
      lines.push('Интерпретация:')
      lines.push(ctx.interpretation)
    }
    return lines.join('\n')
  }

  let out = template
  out = out.replace(/\{\{clientName\}\}/g, ctx.clientName)
  out = out.replace(/\{\{clientEmail\}\}/g, ctx.clientEmail || '')
  out = out.replace(/\{\{clientAge\}\}/g, ctx.clientAge != null ? String(ctx.clientAge) : '')
  out = out.replace(/\{\{testTitle\}\}/g, ctx.testTitle)
  out = out.replace(/\{\{interpretation\}\}/g, ctx.interpretation || '')
  const metricsLines = ctx.metrics
    .map((m) => `• ${m.name}: ${m.value}%${m.description ? ` — ${m.description}` : ''}`)
    .join('\n')
  out = out.replace(/\{\{metrics\}\}/g, ctx.metrics.map((m) => `${m.name}: ${m.value}%`).join('\n'))
  out = out.replace(/\{\{metrics_lines\}\}/g, metricsLines)
  return out
}

export function buildClientReport(
  attempt: Pick<Attempt, 'clientName' | 'clientEmail' | 'clientAge' | 'metrics' | 'testTitle'>,
  template: string | undefined,
  interpretation?: string
): string {
  return fillTemplate(template, {
    clientName: attempt.clientName,
    clientEmail: attempt.clientEmail,
    clientAge: attempt.clientAge,
    testTitle: attempt.testTitle,
    metrics: attempt.metrics || [],
    interpretation,
  })
}

export function buildProfessionalReport(
  attempt: Pick<Attempt, 'clientName' | 'clientEmail' | 'clientAge' | 'metrics' | 'testTitle' | 'answers'>,
  template: string | undefined,
  interpretation?: string
): string {
  const base = fillTemplate(template, {
    clientName: attempt.clientName,
    clientEmail: attempt.clientEmail,
    clientAge: attempt.clientAge,
    testTitle: attempt.testTitle,
    metrics: attempt.metrics || [],
    interpretation,
  })
  const ans = (attempt.answers || [])
    .map((a, i) => `${i + 1}. ${a.questionId}: ${JSON.stringify(a.value)}`)
    .join('\n')
  return `${base}\n\n--- Ответы (сырые данные) ---\n${ans}`
}
