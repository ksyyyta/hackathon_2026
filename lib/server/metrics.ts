import type { Answer, Metric, TestMetric } from '@/lib/types'

function normalizeCalcType(v: unknown): 'sum' | 'avg' {
  return v === 'avg' ? 'avg' : 'sum'
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100))
}

export function evaluateMetrics(metrics: TestMetric[] | undefined, answers: Answer[]): { metrics: Metric[] } {
  const byQuestion = new Map<string, Answer['value']>()
  for (const a of answers || []) {
    byQuestion.set(a.questionId, a.value)
  }

  const out: Metric[] = []
  for (const metric of metrics || []) {
    const calcType = normalizeCalcType(metric.calc_type)
    const values: number[] = []

    for (const mq of metric.questions || []) {
      const selected = byQuestion.get(mq.id)
      const options = mq.options || []
      const scoreById = new Map(options.map((o) => [String(o.id), Number(o.score) || 0]))

      if (Array.isArray(selected)) {
        for (const selectedId of selected) {
          values.push(scoreById.get(String(selectedId)) ?? 0)
        }
      } else if (selected !== undefined && selected !== null) {
        values.push(scoreById.get(String(selected)) ?? 0)
      }
    }

    const raw =
      values.length === 0
        ? 0
        : calcType === 'avg'
          ? values.reduce((sum, v) => sum + v, 0) / values.length
          : values.reduce((sum, v) => sum + v, 0)

    out.push({
      name: metric.name || 'Метрика',
      value: clampScore(raw),
      raw: raw,
    })
  }

  return { metrics: out }
}
