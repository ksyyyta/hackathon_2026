import type { Question } from './types'

export function isQuestionVisible(q: Question, answers: Record<string, unknown>): boolean {
  const sf = q.showIf
  if (!sf?.questionId) return true
  if (!sf.optionIds?.length) return false
  const v = answers[sf.questionId]
  if (v === undefined || v === null) return false
  const ids = new Set(sf.optionIds)
  if (typeof v === 'string') return ids.has(v)
  if (Array.isArray(v)) return v.some((x) => ids.has(String(x)))
  return false
}

export function visibleQuestionsInOrder(questions: Question[], answers: Record<string, unknown>): Question[] {
  return questions.filter((q) => isQuestionVisible(q, answers))
}
