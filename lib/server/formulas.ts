import { Parser } from 'expr-eval'
import type { Answer, Formula, Metric, Question } from '@/lib/types'

function sanitizeId(s: string): string {
  return String(s || '').replace(/-/g, '_').replace(/\./g, '_')
}

function buildVariables(questions: Question[], answers: Answer[]): Record<string, number> {
  const byQ = new Map<string, Answer['value']>()
  for (const a of answers || []) {
    byQ.set(a.questionId, a.value)
  }

  const vars: Record<string, number> = {}

  for (const q of questions || []) {
    const qid = sanitizeId(q.id)
    const val = byQ.get(q.id)
    const qtype = q.type || 'open'
    const options = q.options || []

    if (qtype === 'single') {
      const sid = typeof val === 'string' ? val : ''
      for (const o of options) {
        const oid = sanitizeId(o.id)
        vars[`${qid}_${oid}`] = sid === o.id ? 1 : 0
      }
      const sel = options.find((o) => o.id === sid)
      const w = sel ? Number(sel.weight) || 0 : 0
      vars[`${qid}_score`] = w
      vars[`${qid}_weight`] = w
    } else if (qtype === 'multiple') {
      const arr = Array.isArray(val) ? val : []
      for (const o of options) {
        const oid = sanitizeId(o.id)
        vars[`${qid}_${oid}`] = arr.includes(o.id) ? 1 : 0
      }
      vars[`${qid}_score`] = arr.length
      vars[`${qid}_weight`] = options
        .filter((o) => arr.includes(o.id))
        .reduce((sum, o) => sum + (Number(o.weight) || 0), 0)
    } else if (qtype === 'scale') {
      const n =
        typeof val === 'number'
          ? val
          : typeof val === 'string'
            ? parseFloat(val) || 0
            : 0
      vars[`${qid}_score`] = n
      vars[`${qid}_weight`] = n
    } else if (qtype === 'number') {
      const n =
        typeof val === 'number'
          ? val
          : typeof val === 'string'
            ? parseFloat(String(val).replace(',', '.')) || 0
            : 0
      vars[`${qid}_score`] = n
      vars[`${qid}_weight`] = n
    } else {
      const s = typeof val === 'string' ? val : ''
      vars[`${qid}_score`] = s.length
      vars[`${qid}_weight`] = 0
    }
  }

  return vars
}

function clampPct(n: number): number {
  if (!Number.isFinite(n) || n !== n) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function evaluateFormulas(
  questions: Question[],
  formulas: Formula[],
  answers: Answer[]
): { metrics: Metric[]; interpretation?: string } {
  const vars = buildVariables(questions, answers)
  const parser = new Parser()
  const metrics: Metric[] = []
  let interpretation: string | undefined

  for (const f of formulas || []) {
    const expr = (f.expression || '').trim()
    const name = f.name || 'Метрика'
    const desc = f.description

    if (!expr) continue

    try {
      const node = parser.parse(expr)
      const raw = node.evaluate(vars)
      const value = clampPct(Number(raw))
      metrics.push({
        name,
        value,
        raw: Number(raw),
        description: desc,
      })
      if (desc && !interpretation) {
        interpretation = desc
      }
    } catch {
      metrics.push({
        name,
        value: 0,
        raw: 0,
        description: desc || 'Ошибка в формуле',
      })
    }
  }

  return { metrics, interpretation }
}
