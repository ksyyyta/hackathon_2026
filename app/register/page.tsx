import { redirect } from 'next/navigation'

/** Сохраняем URL для закладок; интерфейс — на /auth */
export default function RegisterPage() {
  redirect('/auth?tab=register')
}
