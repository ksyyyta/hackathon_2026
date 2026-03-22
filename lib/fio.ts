import { z } from 'zod'

const part = z
  .string()
  .trim()
  .min(2, 'Минимум 2 символа')

/** Фамилия, имя, отчество — три обязательные части ФИО */
export const fioFieldsSchema = z.object({
  lastName: part,
  firstName: part,
  middleName: part,
})

export type FioFields = z.infer<typeof fioFieldsSchema>

export function formatFullName(f: FioFields): string {
  return [f.lastName.trim(), f.firstName.trim(), f.middleName.trim()].join(' ')
}

export function parseFullName(full: string): FioFields {
  const p = full.trim().split(/\s+/).filter(Boolean)
  return {
    lastName: p[0] ?? '',
    firstName: p[1] ?? '',
    middleName: p.slice(2).join(' ') || '',
  }
}
