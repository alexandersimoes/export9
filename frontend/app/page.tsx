'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getFlagEmoji } from '@/lib/utils'
import { Suspense } from 'react'
import { useUser } from '@/contexts/UserContext'
import UserOnboarding from '@/components/UserOnboarding'
import UserProfile from '@/components/UserProfile'

function HomeContent() {
  const searchParams = useSearchParams()
  const { user, isLoading, refreshUser } = useUser()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const router = useRouter()

  // Show onboarding if no user
  useEffect(() => {
    if (!isLoading && !user) {
      setShowOnboarding(true)
    }
  }, [user, isLoading])

  const handleJoinGame = () => {
    if (user) {
      router.push('/game')
    }
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  if (isLoading) {
    return (
      <div className="poker-table flex items-center justify-center p-4">
        <div className="card w-full max-w-[800px] mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poker-strong-bg mx-auto mb-4"></div>
            <p className="text-poker-dark-text">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {showOnboarding && (
        <UserOnboarding onComplete={handleOnboardingComplete} />
      )}
      
      {!showOnboarding && (
        <div className="poker-table flex items-center justify-center p-4">
        <div className="card w-full max-w-[800px] mx-4">
          <div className="text-center mb-8">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img 
                src="/logo.png" 
                alt="Export Holdem" 
                className="h-20 w-auto"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }}
              />
            </div>
            
            <p className="text-lg" style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>
              Test your knowledge of global trade exports in this real-time multiplayer game
            </p>
          </div>
          
          {user && (
            <div className="mb-6">
              <UserProfile />
            </div>
          )}
          
          <div className="space-y-4">
            <button
              onClick={handleJoinGame}
              disabled={!user}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {user ? 'Find Match' : 'Loading...'}
            </button>
            
            {user && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.push('/leaderboard')}
                  className="bg-white border-2 border-poker-strong-bg text-poker-dark-text font-semibold py-3 px-3 rounded-lg hover:bg-poker-light-bg transition-colors"
                >
                  Leaderboard
                </button>
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="bg-white border-2 border-poker-strong-bg text-poker-dark-text font-semibold py-3 px-3 rounded-lg hover:bg-poker-light-bg transition-colors"
                >
                  Switch Account
                </button>
              </div>
            )}
          </div>
          
          <div className="mt-6 text-sm text-center" style={{ color: 'var(--poker-dark-text)', opacity: 0.7 }}>
            <div className="flex justify-center gap-6">
              <span>🎯 2 players</span>
              <span>🎲 9 rounds</span>
              <span>⚡ ELO-based</span>
            </div>
          </div>
        </div>
        </div>
      )}
    </>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
        <div className="card max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-game-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}