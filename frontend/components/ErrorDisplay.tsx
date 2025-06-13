'use client'

import { useRouter } from 'next/navigation'

interface ErrorDisplayProps {
  error: string
  onRetry?: () => void
}

export default function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  const router = useRouter()

  return (
    <div className="poker-table flex items-center justify-center p-4">
      <div className="card w-full max-w-[800px] mx-4">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--poker-dark-text)' }}>Connection Error</h1>
          
          <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: '#fff7e6', border: '2px solid var(--poker-accent)' }}>
            <p style={{ color: 'var(--poker-dark-text)' }}>{error}</p>
          </div>

          <div className="space-y-3">
            {onRetry && (
              <button 
                onClick={onRetry}
                className="w-full btn-primary"
              >
                Try Again
              </button>
            )}
            
            <button 
              onClick={() => router.push('/')}
              className="w-full btn-secondary"
            >
              Back to Home
            </button>
          </div>

          <div className="mt-6 text-sm" style={{ color: 'var(--poker-dark-text)', opacity: 0.6 }}>
            <p>Make sure the game server is running on port 8000</p>
          </div>
        </div>
      </div>
    </div>
  )
}