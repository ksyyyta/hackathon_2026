import { ThemeToggle } from '@/components/theme-toggle'

export default function PublicTestLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed top-3 right-3 z-50">
        <ThemeToggle />
      </div>
      {children}
    </>
  )
}
