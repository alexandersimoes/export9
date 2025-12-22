'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useUser } from '@/contexts/UserContext'
import UserOnboarding from '@/components/UserOnboarding'
import UserProfile from '@/components/UserProfile'
import PrivateRoomModal from '@/components/PrivateRoomModal'
import { initFrameAndPoll } from "@newswire/frames";

function HomeContent() {
  const searchParams = useSearchParams()
  const { user, isLoading, refreshUser } = useUser()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showPrivateRoomModal, setShowPrivateRoomModal] = useState(false)
  const [activePlayers, setActivePlayers] = useState<number | null>(null)
  const [resumeGame, setResumeGame] = useState<{ gameId: string; playerId: string } | null>(null)
  const router = useRouter()
  const resumeExpiryMs = 36000

  // Check for room query parameter and redirect
  useEffect(() => {
    const roomCode = searchParams.get('room')
    if (roomCode) {
      router.push(`/room/${roomCode}`)
      return
    }
  }, [searchParams, router])

  // Show onboarding if no user
  useEffect(() => {
    if (typeof document !== "undefined") {
      initFrameAndPoll(); // Iframe poll height
    }
    if (!isLoading && !user) {
      setShowOnboarding(true)
    }
  }, [user, isLoading])

  const syncResumeGame = () => {
    if (!user) {
      setResumeGame(null)
      return
    }

    const storedGame = localStorage.getItem('export9_active_game')
    if (!storedGame) {
      setResumeGame(null)
      return
    }

    try {
      const parsed = JSON.parse(storedGame)
      const updatedAt = Number(parsed?.updated_at || 0)
      const isFresh = updatedAt > 0 && (Date.now() - updatedAt) <= resumeExpiryMs
      if (parsed?.user_id === `${user.id}` && parsed?.game_id && parsed?.player_id && isFresh) {
        setResumeGame({ gameId: parsed.game_id, playerId: parsed.player_id })
      } else {
        if (!isFresh) {
          localStorage.removeItem('export9_active_game')
          refreshUser()
        }
        setResumeGame(null)
      }
    } catch (error) {
      setResumeGame(null)
    }
  }

  useEffect(() => {
    syncResumeGame()
  }, [user])

  useEffect(() => {
    const intervalId = setInterval(syncResumeGame, 1000)
    return () => clearInterval(intervalId)
  }, [user])

  useEffect(() => {
    let isMounted = true
    const apiUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://export9.oec.world'

    const loadActivePlayers = async () => {
      try {
        const response = await fetch(`${apiUrl}/health`, { cache: 'no-store' })
        if (!response.ok) {
          return
        }
        const data = await response.json()
        const activeGames = Number(data?.active_games || 0)
        const players = activeGames * 2
        if (isMounted) {
          setActivePlayers(players)
        }
      } catch (error) {
        // Ignore transient failures, keep last known value.
      }
    }

    loadActivePlayers()
    const intervalId = setInterval(loadActivePlayers, 10000)

    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [])

  const handleJoinGame = () => {
    if (user) {
      router.push('/game')
    }
  }

  const handleJoinPrivateRoom = (roomCode: string) => {
    setShowPrivateRoomModal(false)
    router.push(`/room/${roomCode}`)
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  if (isLoading) {
    return (
      <div className="poker-table flex items-center justify-center p-2">
        <div className="card w-full max-w-[800px] mx-2 md:mx-4">
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
        <div className="poker-table flex items-center justify-center p-2">
        <div className="card w-full max-w-[800px] mx-2 md:mx-4 relative">
          {activePlayers !== null && activePlayers > 2 && (
            <div className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-white/80 px-2 py-1 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-700"></span>
              </span>
              <span className="text-xs font-semibold text-poker-dark-text">{activePlayers} playing</span>
            </div>
          )}
          {resumeGame && (
            <div className="absolute top-3 left-3">
              <button
                onClick={() => router.push('/game')}
                className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-poker-dark-text shadow-sm hover:bg-white"
              >
                Resume game
              </button>
            </div>
          )}
          <div className="text-center mb-8">
            {/* Logo */}
            <div className="flex justify-center mb-3">
              <img 
                src="/logo.png" 
                alt="Export Holdem" 
                className="h-20 w-auto"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }}
              />
            </div>
            
            <p className="text-md" style={{ color: 'var(--poker-dark-text)', opacity: 0.8 }}>
              Test your knowledge of global trade in this real-time multiplayer game
            </p>
          </div>
          
          {user && (
            <div className="mb-6">
              <UserProfile />
            </div>
          )}
          
          <div className="space-y-4">
            {resumeGame ? (
              <button
                onClick={() => router.push('/game')}
                className="w-full btn-primary animate-pulse"
                style={{ animationDuration: '0.6s' }}
              >
                🔁 Resume Game
              </button>
            ) : (
              <button
                onClick={handleJoinGame}
                disabled={!user}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {user ? '🎯 Find Match' : 'Loading...'}
              </button>
            )}

            {user && (
              <button
                onClick={() => setShowPrivateRoomModal(true)}
                className="w-full bg-poker-accent text-poker-dark-text font-semibold py-3 px-3 rounded-lg hover:opacity-90 transition-opacity"
              >
                🔒 Create Private Room
              </button>
            )}
            
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
                  style={{ lineHeight: '1.2' }}
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
      
      <PrivateRoomModal
        isOpen={showPrivateRoomModal}
        onClose={() => setShowPrivateRoomModal(false)}
        onJoinRoom={handleJoinPrivateRoom}
      />
    </>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center poker-table">
        <div className="card max-w-md w-full mx-2 md:mx-4">
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
