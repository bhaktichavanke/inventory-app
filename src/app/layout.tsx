import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { Toaster } from '@/components/ui/toaster'
import QueryProvider from '@/components/providers/QueryProvider'

export const metadata: Metadata = {
  title: 'Inventory Manager',
  description: 'Professional inventory management system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans bg-gray-50 text-gray-900">
        <QueryProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  )
}
