'use client'

import { useRouter } from 'next/navigation'

interface ErrorDisplayProps {
  error: string
  onRetry?: () => void
}

export default function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900 p-4">
      <div className="card max-w-md w-full mx-4">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Connection Error</h1>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
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

          <div className="mt-6 text-sm text-gray-500">
            <p>Make sure the game server is running on port 8000</p>
          </div>
        </div>
      </div>
    </div>
  )
}