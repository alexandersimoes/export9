import type { Metadata } from 'next'
import './globals.css'
import { UserProvider } from '@/contexts/UserContext'

export const metadata: Metadata = {
  title: 'Export Game - Real-time Multiplayer',
  description: 'A real-time multiplayer game about global exports',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="poker-table">
        <UserProvider>
          <main>{children}</main>
        </UserProvider>
      </body>
    </html>
  )
}