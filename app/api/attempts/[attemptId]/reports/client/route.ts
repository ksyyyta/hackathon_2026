import { findAttempt, findTest, seedIfEmpty } from '@/lib/server/db'
import { jsonError, requireUser } from '@/lib/server/http'
import { buildClientReport } from '@/lib/server/reports'

type Params = { params: Promise<{ attemptId: string }> }

export async function GET(request: Request, ctx: Params) {
  seedIfEmpty()
  const r = await requireUser(request)
  if (!r.ok) return r.response
  const { attemptId } = await ctx.params
  const a = findAttempt(attemptId)
  if (!a) return jsonError('Не найдено', 404)
  const t = findTest(a.testId)
  if (!t) return jsonError('Не найдено', 404)
  if (r.user.role !== 'admin' && a.ownerId !== r.user.id) {
    return jsonError('Forbidden', 403)
  }
  const text = buildClientReport(
    {
      clientName: a.clientName,
      clientEmail: a.clientEmail,
      clientAge: a.clientAge,
      metrics: a.metrics,
      testTitle: t.title,
    },
    t.clientReportTemplate,
    a.interpretation
  )
  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="report-client-${attemptId}.txt"`,
    },
  })
}
