'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { AuthProvider, TestsProvider, AttemptsProvider, AdminProvider } from '@/lib/contexts'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      enableColorScheme
      disableTransitionOnChange
      storageKey="psytests-theme"
    >
      <AuthProvider>
        <TestsProvider>
          <AttemptsProvider>
            <AdminProvider>{children}</AdminProvider>
          </AttemptsProvider>
        </TestsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
