'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { ThemeProvider } from '@/components/theme-provider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Sidebar />
        <div className="lg:pl-64">
          <Header />
          <main className="p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}
