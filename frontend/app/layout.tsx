import type { Metadata } from 'next'
import './globals.css'

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
      <body className="bg-gray-50 min-h-screen">
        <main>{children}</main>
      </body>
    </html>
  )
}